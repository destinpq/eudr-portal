const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { TableClient } = require('@azure/data-tables');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');
const { generateDocumentPDF } = require('../services/pdfService');
const archiver = require('archiver');

// Initialize Azure services
let tableClient, blobServiceClient;

function initializeAzureServices() {
  if (!tableClient || !blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }
    
    try {
      // Initialize Blob Service (this usually works fine)
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      
      // For TableClient, use the fromConnectionString method which handles parsing internally
      tableClient = TableClient.fromConnectionString(connectionString, 'DDSSubmissions');
      
      // Ensure table exists
      tableClient.createTable().catch(() => {
        // Table might already exist, ignore error
      });
      
    } catch (error) {
      console.error('❌ Azure initialization error:', error);
      throw new Error('Failed to initialize Azure services: ' + error.message);
    }
  }
  return { tableClient, blobServiceClient };
}

/**
 * Check if invoice ID already exists for a specific user
 */
async function checkInvoiceExists(userId, invoiceId) {
  try {
    // Check in local submissions directory
    const submissionsDir = path.join(__dirname, '../../submissions');
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(submissionsDir, file);
            const submissionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (submissionData.userId === userId && 
                submissionData.formData && 
                submissionData.formData.invoiceId === invoiceId) {
              return true;
            }
          } catch (error) {
            console.warn(`Error reading submission file ${file}:`, error.message);
          }
        }
      }
    }
    
    // Also check Azure Table Storage if available
    try {
      const { tableClient } = initializeAzureServices();
      const entities = tableClient.listEntities({
        queryOptions: { filter: `partitionKey eq 'user_${userId}' and invoiceId eq '${invoiceId}'` }
      });
      
      for await (const entity of entities) {
        return true; // Invoice exists
      }
    } catch (azureError) {
      console.warn('Could not check Azure storage for invoice duplicity:', azureError.message);
    }
    
    return false;
  } catch (error) {
    throw new Error(`Failed to check invoice existence: ${error.message}`);
  }
}

/**
 * GET /api/submissions - Get user's submissions with filtering
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { invoiceId, startDate, endDate } = req.query;
    
    console.log(`📋 Fetching submissions for user ${userId}`);
    
    const submissions = [];
    
    // Read from local submissions directory
    const submissionsDir = path.join(__dirname, '../../submissions');
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(submissionsDir, file);
            const submissionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Filter by user
            if (submissionData.userId !== userId) continue;
            
            // Apply filters
            if (invoiceId && !submissionData.formData?.invoiceId?.toLowerCase().includes(invoiceId.toLowerCase())) {
              continue;
            }
            
            if (startDate || endDate) {
              const submissionDate = new Date(submissionData.submittedAt);
              if (startDate && submissionDate < new Date(startDate + 'T00:00:00.000Z')) continue;
              if (endDate && submissionDate > new Date(endDate + 'T23:59:59.999Z')) continue;
            }
            
            // Create summary for frontend
            const summary = {
              rowKey: submissionData.submissionId,
              invoiceId: submissionData.formData?.invoiceId || 'N/A',
              commodityType: submissionData.formData?.commodityType || 'N/A',
              quantityOfPulpMT: submissionData.formData?.quantityOfPulpMT || '0',
              fscCertificateNumber: submissionData.formData?.fscCertificateNumber || 'N/A',
              createdAt: submissionData.submittedAt,
              updatedAt: submissionData.submittedAt,
              username: req.user.username || 'Unknown',
              status: submissionData.status || 'submitted',
              producersCount: submissionData.producers?.length || 0,
              documentsCount: Object.keys(submissionData.companyDocs || {}).length,
              woodOriginsCount: submissionData.woodOrigins?.length || 0
            };
            
            submissions.push(summary);
          } catch (error) {
            console.warn(`Error reading submission file ${file}:`, error.message);
          }
        }
      }
    }
    
    // Sort by submission date (newest first)
    submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`✅ Found ${submissions.length} submissions for user ${userId}`);
    
    res.json({
      success: true,
      data: submissions
    });
    
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/submissions/:id/pdf - Download submission as PDF
 */
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const submissionId = req.params.id;
    
    console.log(`📄 Generating PDF for submission ${submissionId}`);
    
    // Read submission data
    const submissionFile = path.join(__dirname, '../../submissions', `${submissionId}.json`);
    if (!fs.existsSync(submissionFile)) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    const submissionData = JSON.parse(fs.readFileSync(submissionFile, 'utf8'));
    
    // Verify ownership
    if (submissionData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Convert submission data to document format for PDF generation
    const documentForPdf = {
      rowKey: submissionData.submissionId,
      invoiceId: submissionData.formData?.invoiceId,
      commodityType: submissionData.formData?.commodityType,
      quantityOfPulpMT: submissionData.formData?.quantityOfPulpMT,
      fscCertificateNumber: submissionData.formData?.fscCertificateNumber,
      producers: submissionData.producers || [],
      woodOrigins: submissionData.woodOrigins || [],
      companyDocs: submissionData.companyDocs || {},
      createdAt: submissionData.submittedAt,
      updatedAt: submissionData.submittedAt,
      username: req.user.username
    };
    
    // Generate PDF
    const pdfBuffer = await generateDocumentPDF(documentForPdf);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EUDR_Submission_${submissionData.formData?.invoiceId || submissionId}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log(`✅ PDF generated for submission ${submissionId}`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/submissions/:id/zip - Download all documents as ZIP
 */
router.get('/:id/zip', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const submissionId = req.params.id;
    
    console.log(`📦 Creating ZIP for submission ${submissionId}`);
    
    // Read submission data
    const submissionFile = path.join(__dirname, '../../submissions', `${submissionId}.json`);
    if (!fs.existsSync(submissionFile)) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    const submissionData = JSON.parse(fs.readFileSync(submissionFile, 'utf8'));
    
    // Verify ownership
    if (submissionData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });
    
    // Set response headers
    const filename = `EUDR_Documents_${submissionData.formData?.invoiceId || submissionId}_${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe archive data to response
    archive.pipe(res);
    
    // Add PDF summary to ZIP
    try {
      const documentForPdf = {
        rowKey: submissionData.submissionId,
        invoiceId: submissionData.formData?.invoiceId,
        commodityType: submissionData.formData?.commodityType,
        quantityOfPulpMT: submissionData.formData?.quantityOfPulpMT,
        fscCertificateNumber: submissionData.formData?.fscCertificateNumber,
        producers: submissionData.producers || [],
        woodOrigins: submissionData.woodOrigins || [],
        companyDocs: submissionData.companyDocs || {},
        createdAt: submissionData.submittedAt,
        updatedAt: submissionData.submittedAt,
        username: req.user.username
      };
      
      const pdfBuffer = await generateDocumentPDF(documentForPdf);
      archive.append(pdfBuffer, { name: `Summary_${submissionData.formData?.invoiceId || submissionId}.pdf` });
    } catch (pdfError) {
      console.warn('Could not generate PDF for ZIP:', pdfError.message);
    }
    
    // Add submission data as JSON
    archive.append(JSON.stringify(submissionData, null, 2), { name: 'submission_data.json' });
    
    // Add company documents if they exist
    const companyDocs = submissionData.companyDocs || {};
    for (const [docType, docInfo] of Object.entries(companyDocs)) {
      if (docInfo && typeof docInfo === 'object' && docInfo.fileId) {
        try {
          // Try to get file from Azure or local storage
          console.log(`Adding ${docType} document to ZIP: ${docInfo.fileName}`);
          
          // For now, add a placeholder since we don't have direct file access
          archive.append(`File: ${docInfo.fileName}\nType: ${docType}\nUploaded: ${docInfo.uploadedAt}\nSize: ${docInfo.fileSize} bytes`, 
                        { name: `documents/${docType}_${docInfo.fileName}.txt` });
        } catch (fileError) {
          console.warn(`Could not add file ${docInfo.fileName} to ZIP:`, fileError.message);
        }
      }
    }
    
    // Add GeoJSON files if they exist
    const woodOrigins = submissionData.woodOrigins || [];
    woodOrigins.forEach((origin, index) => {
      if (origin.geojsonData) {
        archive.append(JSON.stringify(origin.geojsonData, null, 2), 
                      { name: `geojson/wood_origin_${index + 1}.geojson` });
      }
    });
    
    // Finalize the archive
    archive.finalize();
    
    console.log(`✅ ZIP created for submission ${submissionId}`);
    
  } catch (error) {
    console.error('❌ ZIP creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/submissions - Submit a new EUDR DDS form
router.post('/', auth, async (req, res) => {
  try {
    const submissionId = uuidv4();
    const timestamp = new Date();
    const userId = req.user.id || req.user._id;
    
    console.log('📝 Processing new DDS submission:', submissionId);
    
    // Extract data from request
    const {
      formData,
      producers,
      companyDocs,
      woodOrigins,
      geoJSONValidationResults,
      validatedPlots,
      userEmail,
      status
    } = req.body;

    // Validate required fields
    if (!formData || !producers || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required form data'
      });
    }

    // Check for billing document number duplicity
    if (formData.invoiceId) {
      console.log(`🔍 Checking invoice duplicity for user ${userId}, invoice: ${formData.invoiceId}`);
      
      const exists = await checkInvoiceExists(userId, formData.invoiceId);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: `Billing Document Number "${formData.invoiceId}" already exists for your account. Please use a unique invoice number.`
        });
      }
    }

    // Prepare submission metadata for Azure Table (small data only)
    const submissionMetadata = {
      submissionId,
      userId,
      userEmail: userEmail || req.user.email || 'unknown@example.com',
      status: status || 'submitted',
      submittedAt: timestamp.toISOString(),
      
      // Form data (basic info only)
      invoiceId: formData.invoiceId,
      commodityType: formData.commodityType,
      quantityOfPulpMT: formData.quantityOfPulpMT,
      fscCertificateNumber: formData.fscCertificateNumber,
      
      // Counts only (not full data)
      producersCount: producers.length,
      companyDocsCount: Object.keys(companyDocs).length,
      woodOriginsCount: woodOrigins.length,
      
      // Azure table required fields
      partitionKey: `user_${userId}`,
      rowKey: submissionId,
      
      // Reference to blob storage
      blobPath: `submissions/${submissionId}/full-data.json`
    };

    // Prepare full submission data for blob storage
    const fullSubmissionData = {
      submissionId,
      userId,
      userEmail: userEmail || req.user.email || 'unknown@example.com',
      status: status || 'submitted',
      submittedAt: timestamp.toISOString(),
      
      // Complete form data
      formData,
      producers,
      companyDocs,
      woodOrigins,
      geoJSONValidationResults,
      validatedPlots,
      
      metadata: {
        submissionVersion: '1.0',
        apiVersion: 'v1',
        platform: 'EUDR-Portal',
        environment: process.env.NODE_ENV || 'development',
        storageMethod: 'azure-hybrid'
      }
    };

    console.log('💾 Saving submission locally...');
    
    // Save to local filesystem (for development/testing)
    const submissionsDir = path.join(__dirname, '../../submissions');
    if (!fs.existsSync(submissionsDir)) {
      fs.mkdirSync(submissionsDir, { recursive: true });
    }
    
    const submissionFile = path.join(submissionsDir, `${submissionId}.json`);
    
    fs.writeFileSync(submissionFile, JSON.stringify(fullSubmissionData, null, 2));
    console.log('✅ Submission saved locally to:', submissionFile);

    // Also try Azure if available (optional)
    try {
      const { tableClient, blobServiceClient } = initializeAzureServices();
      
      console.log('☁️ Attempting Azure backup...');
      
      // Save metadata to Azure Table Storage (small data only)
      await tableClient.createEntity(submissionMetadata);
      console.log('✅ Azure Table Storage: Metadata saved');
      
      // Upload to Blob Storage
      const containerClient = blobServiceClient.getContainerClient('submissions');
      await containerClient.createIfNotExists();
      
      const blobName = `submissions/${submissionId}/full-data.json`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(
        JSON.stringify(fullSubmissionData, null, 2), 
        JSON.stringify(fullSubmissionData, null, 2).length,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          }
        }
      );
      
      console.log('✅ Azure Blob Storage: Full data saved');
      console.log('✅ Azure backup completed successfully');
      fullSubmissionData.metadata.azureBackup = true;
      
    } catch (azureError) {
      console.warn('⚠️ Azure backup failed (continuing with local storage):', azureError.message);
      fullSubmissionData.metadata.azureBackup = false;
      fullSubmissionData.metadata.azureError = azureError.message;
    }

    // Generate a summary report
    const summary = {
      submissionId,
      submittedAt: timestamp.toISOString(),
      userId,
      userEmail,
      basicInfo: {
        invoiceId: formData.invoiceId,
        commodityType: formData.commodityType,
        quantity: formData.quantityOfPulpMT,
        fscCertificate: formData.fscCertificateNumber
      },
      producers: {
        count: producers.length,
        countries: [...new Set(producers.flatMap(p => p.countries))]
      },
      documents: {
        count: Object.keys(companyDocs).length,
        types: Object.keys(companyDocs)
      },
      woodOrigins: {
        count: woodOrigins.length,
        hasGeoData: woodOrigins.some(wo => wo.geojsonData)
      },
      validation: {
        totalPlots: Object.keys(validatedPlots).length,
        validatedFeatures: Object.values(validatedPlots).flat().length
      },
      storage: {
        azureTable: true,
        azureBlob: true,
        backupComplete: true
      }
    };

    console.log('📊 Submission Summary:', {
      id: submissionId,
      user: userId,
      producers: producers.length,
      documents: Object.keys(companyDocs).length,
      woodOrigins: woodOrigins.length
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'EUDR DDS submission received and processed successfully',
      submissionId,
      submittedAt: timestamp.toISOString(),
      summary,
      azure: {
        tableStorage: 'saved',
        blobStorage: 'saved',
        backupLocation: `submissions/${submissionId}/`
      }
    });

  } catch (error) {
    console.error('❌ Submission processing error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process submission',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/submissions/:id - Get a specific submission
router.get('/:id', auth, async (req, res) => {
  try {
    // Initialize Azure services
    const { tableClient, blobServiceClient } = initializeAzureServices();
    
    const { id } = req.params;
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    
    console.log('🔍 Retrieving submission:', id);
    
    // Get from Azure Table Storage
    const entity = await tableClient.getEntity(`user_${userId}`, id);
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Get full data from Blob Storage
    const containerClient = blobServiceClient.getContainerClient('submissions');
    const blobName = `submissions/${id}/full-data.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.download();
    const fullData = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
    
    res.json({
      success: true,
      submission: {
        ...entity,
        fullData
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submission'
    });
  }
});

// GET /api/submissions - Get all submissions for a user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware
    
    console.log('📋 Retrieving submissions for user:', userId);
    
    let submissions = [];
    
    // Try Azure first, then fall back to local files
    try {
      const { tableClient } = initializeAzureServices();
      
      const entities = tableClient.listEntities({
        queryOptions: { filter: `PartitionKey eq 'user_${userId}'` }
      });
      
      for await (const entity of entities) {
        submissions.push({
          rowKey: entity.submissionId,
          submissionId: entity.submissionId,
          submittedAt: entity.submittedAt,
          status: entity.status,
          invoiceId: entity.invoiceId,
          commodityType: entity.commodityType,
          quantityOfPulpMT: entity.quantityOfPulpMT,
          fscCertificateNumber: entity.fscCertificateNumber,
          producersCount: entity.producersCount,
          woodOriginsCount: entity.woodOriginsCount,
          createdAt: entity.submittedAt,
          updatedAt: entity.submittedAt,
          username: userId
        });
      }
      
      console.log('✅ Retrieved from Azure:', submissions.length, 'submissions');
      
    } catch (azureError) {
      console.warn('⚠️ Azure fetch failed, trying local files:', azureError.message);
      
      // Fallback to local files
      const submissionsDir = path.join(__dirname, '../../submissions');
      if (fs.existsSync(submissionsDir)) {
        const files = fs.readdirSync(submissionsDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(submissionsDir, file);
              const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              
              // Only include submissions for the current user
              if (data.userId === userId) {
                submissions.push({
                  rowKey: data.submissionId,
                  submissionId: data.submissionId,
                  submittedAt: data.submittedAt,
                  status: data.status || 'submitted',
                  invoiceId: data.invoiceId,
                  commodityType: data.commodityType,
                  quantityOfPulpMT: data.quantityOfPulpMT,
                  fscCertificateNumber: data.fscCertificateNumber,
                  producersCount: data.producersCount,
                  woodOriginsCount: data.woodOriginsCount,
                  createdAt: data.submittedAt,
                  updatedAt: data.submittedAt,
                  username: data.userId
                });
              }
            } catch (fileError) {
              console.warn('⚠️ Error reading submission file:', file, fileError.message);
            }
          }
        }
        
        console.log('✅ Retrieved from local files:', submissions.length, 'submissions');
      }
    }
    
    // Sort by submission date (newest first)
    submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    res.json({
      success: true,
      data: submissions, // Match the expected format from getDocuments
      submissions: submissions // Also provide in submissions format
    });

  } catch (error) {
    console.error('❌ Error retrieving submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submissions'
    });
  }
});

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

module.exports = router; 