/**
 * Admin Routes for User Management
 * 
 * Clean, modular admin routes using service layer
 */

const express = require("express");
const { adminAuth } = require("../middleware/auth");
const passwordPolicy = require("../utils/passwordPolicy");
const { logger } = require("../utils/logger");
const { generateDocumentPDF } = require("../services/pdfService");
const { documentsTableClient } = require("../azureService");
const { downloadFile } = require("../services/fileService");

// Import services
const { 
  createDefaultAdmin, 
  getAllUsers, 
  createUser, 
  updateUser, 
  unlockUser 
} = require("../services/adminService");

const { 
  authenticateAdmin, 
  changePassword 
} = require("../services/authService");

const { parseDocumentEntity } = require("../services/documentService");

const router = express.Router();

// Initialize admin account on module load
createDefaultAdmin();

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authenticateAdmin(username, password);
    res.json(result);
  } catch (error) {
    logger.error("Admin login failed", {
      error: error.message,
      username: req.body.username
    });
    
    res.status(401).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/admin/change-password
 * Change password endpoint (for expired/temporary passwords)
 */
router.post("/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const result = await changePassword(username, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    logger.error("Password change failed", {
      error: error.message,
      username: req.body.username
    });
    
    if (error.details) {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await getAllUsers();
    
    logger.info("Admin retrieved users", {
      adminId: req.user.id,
      userCount: users.length
    });
    
    res.json({ 
      success: true, 
      users 
    });
  } catch (error) {
    logger.error("Get users failed", {
      error: error.message,
      adminId: req.user?.id
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user (admin only)
 */
router.post("/users", adminAuth, async (req, res) => {
  try {
    const result = await createUser(req.body, req.user.username);
    
    logger.info("User created by admin", {
      adminId: req.user.id,
      createdUsername: req.body.username
    });
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      ...result
    });
  } catch (error) {
    logger.error("Create user failed", {
      error: error.message,
      adminId: req.user?.id,
      username: req.body.username
    });
    
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PUT /api/admin/users/:username
 * Update user (admin only)
 */
router.put("/users/:username", adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const result = await updateUser(username, req.body);
    
    logger.info("User updated by admin", {
      adminId: req.user.id,
      updatedUsername: username
    });
    
    res.json(result);
  } catch (error) {
    logger.error("Update user failed", {
      error: error.message,
      adminId: req.user?.id,
      username: req.params.username
    });
    
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        success: false, 
        error: "User not found" 
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
 * POST /api/admin/users/:username/unlock
 * Unlock user account (admin only)
 */
router.post("/users/:username/unlock", adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { email } = req.body;
    
    await unlockUser(username, email);
    
    logger.info("User unlocked by admin", {
      adminId: req.user.id,
      unlockedUsername: username
    });
    
    res.json({
      success: true,
      message: "User account unlocked successfully"
    });
  } catch (error) {
    logger.error("Unlock user failed", {
      error: error.message,
      adminId: req.user?.id,
      username: req.params.username
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/admin/password-policy
 * Get password policy information
 */
router.get("/password-policy", (req, res) => {
  res.json({
    success: true,
    policy: {
      minLength: passwordPolicy.minLength,
      adminMinLength: passwordPolicy.adminMinLength,
      mobileMinLength: passwordPolicy.mobileMinLength,
      maxFailedAttempts: passwordPolicy.maxFailedAttempts,
      passwordExpiryDays: passwordPolicy.passwordExpiryDays,
      minTimeBetweenChanges: passwordPolicy.minTimeBetweenChanges,
      passwordHistoryCount: passwordPolicy.passwordHistoryCount,
      tempPasswordValidityHours: passwordPolicy.tempPasswordValidityHours,
      requirements: [
        "Must contain lowercase letters",
        "Must contain uppercase letters or numbers",
        "Must contain at least one number (recommended)",
        "Must contain at least one special character (@#$%^&*+=|\\(){}:;\",<.?/)",
        "Cannot contain common words like 'password' or 'admin'",
        "Cannot contain sequential patterns like '123456' or 'qwerty'"
      ]
    }
  });
});

/**
 * GET /api/admin/documents
 * Get all documents from all users (admin only)
 */
router.get("/documents", adminAuth, async (req, res) => {
  try {
    const { invoiceId, startDate, endDate, userId } = req.query;
    
    let filterQuery = "";
    const filters = [];
    
    // Add user filter
    if (userId) {
      filters.push(`PartitionKey eq '${userId}'`);
    }
    
    // Add invoice ID filter
    if (invoiceId) {
      filters.push(`contains(invoiceId, '${invoiceId}')`);
    }
    
    // Add date range filter
    if (startDate) {
      filters.push(`createdAt ge '${new Date(startDate + 'T00:00:00.000Z').toISOString()}'`);
    }
    
    if (endDate) {
      filters.push(`createdAt le '${new Date(endDate + 'T23:59:59.999Z').toISOString()}'`);
    }
    
    if (filters.length > 0) {
      filterQuery = filters.join(' and ');
    }
    
    const entities = documentsTableClient.listEntities({
      queryOptions: filterQuery ? { filter: filterQuery } : undefined,
    });
    
    const documents = [];
    for await (const entity of entities) {
      documents.push(parseDocumentEntity(entity));
    }
    
    logger.info("Admin retrieved documents", {
      adminId: req.user.id,
      documentCount: documents.length,
      filters: { invoiceId, startDate, endDate, userId }
    });
    
    res.json({ 
      success: true, 
      data: documents 
    });
  } catch (error) {
    logger.error("Admin get documents failed", {
      error: error.message,
      adminId: req.user?.id,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/admin/documents/:userId/:docId
 * Get specific document by user ID and document ID (admin only)
 */
router.get("/documents/:userId/:docId", adminAuth, async (req, res) => {
  try {
    const { userId, docId } = req.params;
    
    const entity = await documentsTableClient.getEntity(userId, docId);
    const document = parseDocumentEntity(entity);
    
    logger.info("Admin retrieved specific document", {
      adminId: req.user.id,
      targetUserId: userId,
      docId
    });
    
    res.json({ 
      success: true, 
      data: document 
    });
  } catch (error) {
    logger.error("Admin get document failed", {
      error: error.message,
      adminId: req.user?.id,
      targetUserId: req.params.userId,
      docId: req.params.docId,
      stack: error.stack
    });
    
    if (error.statusCode === 404) {
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
 * GET /api/admin/documents/:userId/:docId/pdf
 * Download document as PDF summary (admin only)
 */
router.get("/documents/:userId/:docId/pdf", adminAuth, async (req, res) => {
  try {
    const { userId, docId } = req.params;
    
    // Get the document
    const entity = await documentsTableClient.getEntity(userId, docId);
    const document = parseDocumentEntity(entity);
    
    // Generate PDF
    const pdfBuffer = await generateDocumentPDF(document);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="EUDR_Document_${document.invoiceId || docId}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    logger.info("Admin downloaded PDF for document", {
      adminId: req.user.id,
      targetUserId: userId,
      docId,
      invoiceId: document.invoiceId,
      pdfSize: pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    logger.error("Admin PDF generation failed", {
      error: error.message,
      adminId: req.user?.id,
      targetUserId: req.params.userId,
      docId: req.params.docId,
      stack: error.stack
    });
    
    if (error.statusCode === 404) {
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
 * GET /api/admin/files/:fileId
 * Download any file (admin only)
 */
router.get("/files/:fileId", adminAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    const fileData = await downloadFile(fileId);
    
    // Set response headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileData.fileName}"`
    );
    res.setHeader("Content-Type", fileData.contentType);
    
    logger.info("Admin downloaded file", {
      adminId: req.user.id,
      fileId,
      fileName: fileData.fileName
    });
    
    // Pipe the file stream to response
    fileData.stream.pipe(res);
  } catch (error) {
    logger.error("Admin file download failed", {
      error: error.message,
      adminId: req.user?.id,
      fileId: req.params.fileId,
      stack: error.stack
    });
    
    if (error.message.includes("File not found")) {
      res.status(404).json({ 
        success: false, 
        error: "File not found" 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

module.exports = router; 