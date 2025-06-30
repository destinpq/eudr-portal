/**
 * File Routes
 * 
 * Handles file upload and download API endpoints
 */

const express = require("express");
const { auth } = require("../middleware/auth");
const upload = require("../config/multer");
const { validateFile } = require("../utils/fileValidation");
const { uploadFile, downloadFile } = require("../services/fileService");
const { logger } = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/files/upload
 * Upload a file to Azure Blob Storage
 */
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const user = req.user;
    
    // Validate file
    const validation = validateFile(req.file);
    if (!validation.isValid) {
      logger.warn("File validation failed", {
        userId: user.id || user._id,
        error: validation.error,
        fileName: req.file?.originalname
      });
      
      return res.status(400).json({
        success: false,
        error: validation.error,
        allowedTypes: validation.allowedTypes
      });
    }

    // Upload file
    const result = await uploadFile(req.file, user);
    
    logger.info("File uploaded successfully", {
      userId: user.id || user._id,
      fileId: result.fileId,
      fileName: result.fileName
    });
    
    res.status(201).json(result);
  } catch (error) {
    logger.error("Error uploading file", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
      fileName: req.file?.originalname,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/files/download/:fileId
 * Download a file from Azure Blob Storage
 */
router.get("/download/:fileId", auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user.id || req.user._id;
    
    const fileData = await downloadFile(fileId);
    
    // Set response headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileData.fileName}"`
    );
    res.setHeader("Content-Type", fileData.contentType);
    
    logger.info("File downloaded successfully", {
      userId,
      fileId,
      fileName: fileData.fileName
    });
    
    // Pipe the file stream to response
    fileData.stream.pipe(res);
  } catch (error) {
    logger.error("Error downloading file", {
      error: error.message,
      userId: req.user?.id || req.user?._id,
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