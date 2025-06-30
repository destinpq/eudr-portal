/**
 * Document Routes
 * 
 * Handles document-related API endpoints
 */

const express = require("express");
const { auth } = require("../middleware/auth");
const { createDocument, getUserDocuments, getDocumentById } = require("../services/documentService");
const { generateDocumentPDF } = require("../services/pdfService");
const { logger } = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/documents/submit
 * Submit a new document
 */
router.post("/submit", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const username = req.user.username;
    const email = req.user.email;
    
    logger.info(`User ${userId} submitting document`, {
      userId,
      username,
      email,
      docId: req.body.id,
      invoiceId: req.body.invoiceId
    });

    const document = await createDocument(req.body, req.user);
    
    logger.info(`Document ${document.rowKey} submitted successfully`, {
      userId,
      docId: document.rowKey,
      invoiceId: document.invoiceId
    });
    
    res.status(201).json({ 
      success: true, 
      data: document 
    });
  } catch (error) {
    logger.error("Error submitting document", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
      invoiceId: req.body?.invoiceId,
      stack: error.stack
    });
    
    // Handle invoice uniqueness error with specific status code
    if (error.message.includes("already exists for this customer")) {
      res.status(409).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

/**
 * GET /api/documents
 * Get all documents for authenticated user with optional filtering
 * Query parameters:
 * - invoiceId: Filter by invoice ID (partial match)
 * - startDate: Filter by start date (YYYY-MM-DD)
 * - endDate: Filter by end date (YYYY-MM-DD)
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { invoiceId, startDate, endDate } = req.query;
    
    const filters = {};
    if (invoiceId) filters.invoiceId = invoiceId;
    if (startDate) filters.startDate = new Date(startDate + 'T00:00:00.000Z').toISOString();
    if (endDate) filters.endDate = new Date(endDate + 'T23:59:59.999Z').toISOString();
    
    const documents = await getUserDocuments(userId, filters);
    
    logger.info(`User ${userId} fetched ${documents.length} documents`, {
      userId,
      count: documents.length,
      filters
    });
    
    res.json({ 
      success: true, 
      data: documents 
    });
  } catch (error) {
    logger.error("Error fetching documents", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/documents/:id/pdf
 * Download document as PDF summary
 */
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const docId = req.params.id;
    
    // Get the document
    const document = await getDocumentById(userId, docId);
    
    // Generate PDF
    const pdfBuffer = await generateDocumentPDF(document);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EUDR_Document_${document.invoiceId || docId}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    logger.info(`User ${userId} downloaded PDF for document ${docId}`, {
      userId,
      docId,
      invoiceId: document.invoiceId,
      pdfSize: pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    logger.error("Error generating PDF", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
      docId: req.params.id,
      stack: error.stack
    });
    
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        success: false, 
        error: "Document not found" 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

/**
 * GET /api/documents/:id
 * Get single document by ID
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const docId = req.params.id;
    
    const document = await getDocumentById(userId, docId);
    
    logger.info(`User ${userId} fetched document ${docId}`, {
      userId,
      docId
    });
    
    res.json({ 
      success: true, 
      data: document 
    });
  } catch (error) {
    logger.error("Error fetching document", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
      docId: req.params.id,
      stack: error.stack
    });
    
    res.status(404).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 