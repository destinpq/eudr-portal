/**
 * File Validation Utilities
 * 
 * Centralized file validation logic for uploads
 */

const ALLOWED_MIME_TYPES = [
  "application/json",
  "application/geo+json", 
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg", 
  "image/png",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates uploaded file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
function validateFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: "No file uploaded"
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: "Unsupported file type",
      allowedTypes: ALLOWED_MIME_TYPES
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "File size exceeds 10MB limit"
    };
  }

  return {
    isValid: true
  };
}

module.exports = {
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
}; 