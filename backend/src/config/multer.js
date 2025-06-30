/**
 * Multer Configuration
 * 
 * File upload configuration using memory storage
 */

const multer = require("multer");

// Configure multer for memory storage with size limits
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB limit for form fields
    fields: 100, // Maximum number of non-file fields
    files: 20 // Maximum number of files
  }
});

module.exports = upload; 