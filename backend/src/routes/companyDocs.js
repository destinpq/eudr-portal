const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { auth } = require("../middleware/auth");
const { companyDocsTableClient, containerClient } = require("../azureService");

const router = express.Router();

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Company document types
const COMPANY_DOC_TYPES = {
  // Mandatory documents
  fscCertificateNumber: { mandatory: true, label: "FSC Certificate Number" },
  fscCertificate: { mandatory: true, label: "FSC Certificate File" },
  businessLicense: { mandatory: true, label: "Business License" },
  
  // Optional documents
  isoCertification: { mandatory: false, label: "ISO Certification" },
  laborHR: { mandatory: false, label: "Labor & HR Documents" },
  sustainability: { mandatory: false, label: "Sustainability Documents" }
};

// Get company documents for user
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get company documents for this user
    let companyDocs = {};
    try {
      const entity = await companyDocsTableClient.getEntity(userId, "company_docs");
      companyDocs = {
        fscCertificateNumber: entity.fscCertificateNumber || null,
        fscCertificate: entity.fscCertificate ? JSON.parse(entity.fscCertificate) : null,
        businessLicense: entity.businessLicense ? JSON.parse(entity.businessLicense) : null,
        isoCertification: entity.isoCertification ? JSON.parse(entity.isoCertification) : null,
        laborHR: entity.laborHR ? JSON.parse(entity.laborHR) : null,
        sustainability: entity.sustainability ? JSON.parse(entity.sustainability) : null,
        updatedAt: entity.updatedAt
      };
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
    
    res.json({
      success: true,
      data: companyDocs,
      documentTypes: COMPANY_DOC_TYPES
    });
  } catch (error) {
    console.error("[COMPANY_DOCS] Get error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch company documents" });
  }
});


// Upload/Update company document
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, certificateNumber } = req.body;
    

    
    if (!documentType || !COMPANY_DOC_TYPES[documentType]) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid document type" 
      });
    }
    
    // Handle FSC certificate number (text field)
    if (documentType === 'fscCertificateNumber') {
      if (!certificateNumber) {
        return res.status(400).json({ 
          success: false, 
          error: "FSC Certificate Number is required" 
        });
      }
      
      // Update or create company docs record
      const updateData = {
        partitionKey: userId,
        rowKey: "company_docs",
        fscCertificateNumber: certificateNumber,
        updatedAt: new Date().toISOString()
      };
      
      await companyDocsTableClient.upsertEntity(updateData, "Merge");
      
      return res.json({
        success: true,
        message: "FSC Certificate Number updated successfully"
      });
    }
    
    // Handle file uploads
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "File is required" 
      });
    }
    
    // File validation
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png"
    ];
    
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type. Please upload PDF, DOC, DOCX, JPG, or PNG files."
      });
    }
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: "File size exceeds 10MB limit"
      });
    }
    
    // Upload to blob storage
    const blobName = `company-docs/${userId}/${documentType}-${uuidv4()}-${req.file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
      metadata: {
        uploadedBy: userId,
        documentType: documentType,
        uploadDate: new Date().toISOString(),
        originalName: req.file.originalname,
      },
    });
    
    const fileInfo = {
      fileId: blobName,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: blockBlobClient.url
    };
    
    // Update company docs record
    const updateData = {
      partitionKey: userId,
      rowKey: "company_docs",
      [documentType]: JSON.stringify(fileInfo),
      updatedAt: new Date().toISOString()
    };
    
    await companyDocsTableClient.upsertEntity(updateData, "Merge");
    
    console.log(`[COMPANY_DOCS] User ${userId} uploaded ${documentType}: ${req.file.originalname}`);
    
    res.json({
      success: true,
      message: `${COMPANY_DOC_TYPES[documentType].label} uploaded successfully`,
      fileInfo
    });
    
  } catch (error) {
    console.error("[COMPANY_DOCS] Upload error:", error);
    res.status(500).json({ success: false, error: "Failed to upload document" });
  }
});

// Delete company document
router.delete("/:documentType", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType } = req.params;
    
    if (!COMPANY_DOC_TYPES[documentType]) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid document type" 
      });
    }
    
    // Get current document info to delete from blob storage
    try {
      const entity = await companyDocsTableClient.getEntity(userId, "company_docs");
      
      if (entity[documentType]) {
        const fileInfo = JSON.parse(entity[documentType]);
        
        // Delete from blob storage
        try {
          const blockBlobClient = containerClient.getBlockBlobClient(fileInfo.fileId);
          await blockBlobClient.delete();
        } catch (blobError) {
          console.warn(`[COMPANY_DOCS] Failed to delete blob ${fileInfo.fileId}:`, blobError);
        }
      }
      
      // Update entity to remove the document
      const updateData = {
        partitionKey: userId,
        rowKey: "company_docs",
        [documentType]: null,
        updatedAt: new Date().toISOString()
      };
      
      await companyDocsTableClient.updateEntity(updateData, "Merge");
      
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
    
    res.json({
      success: true,
      message: `${COMPANY_DOC_TYPES[documentType].label} deleted successfully`
    });
    
  } catch (error) {
    console.error("[COMPANY_DOCS] Delete error:", error);
    res.status(500).json({ success: false, error: "Failed to delete document" });
  }
});

module.exports = router; 