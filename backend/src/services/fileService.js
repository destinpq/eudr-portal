/**
 * File Service
 * 
 * Handles file operations with Azure Blob Storage
 */

const { v4: uuidv4 } = require("uuid");
const { containerClient } = require("../azureService");

/**
 * Uploads file to Azure Blob Storage
 * @param {Object} file - File object from multer
 * @param {Object} user - User object
 * @returns {Object} - Upload result
 */
async function uploadFile(file, user) {
  try {
    const blobName = uuidv4() + "-" + file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
      metadata: {
        uploadedBy: user.email || user.id,
        username: user.username,
        uploadDate: new Date().toISOString(),
        originalName: file.originalname,
      },
    });
    
    const blobUrl = blockBlobClient.url;
    
    return {
      success: true,
      fileId: blobName,
      fileName: file.originalname,
      url: blobUrl,
      uploadedBy: user.email || user.id,
      username: user.username,
    };
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Downloads file from Azure Blob Storage
 * @param {string} fileId - Blob name/ID
 * @returns {Object} - Download stream and metadata
 */
async function downloadFile(fileId) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileId);
    
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new Error("File not found");
    }
    
    const downloadResponse = await blockBlobClient.download();
    
    return {
      stream: downloadResponse.readableStreamBody,
      contentType: downloadResponse.contentType || "application/octet-stream",
      fileName: fileId.replace(/^[^-]+-/, "")
    };
  } catch (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Checks if file exists in storage
 * @param {string} fileId - Blob name/ID
 * @returns {boolean} - File exists
 */
async function fileExists(fileId) {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileId);
    return await blockBlobClient.exists();
  } catch (error) {
    return false;
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists
}; 