/**
 * Document Service
 * 
 * Handles document operations with Azure Table Storage
 */

const { v4: uuidv4 } = require("uuid");
const { documentsTableClient } = require("../azureService");

/**
 * Checks if an invoice ID already exists for a user
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID to check
 * @returns {boolean} - True if invoice exists, false otherwise
 */
async function checkInvoiceExists(userId, invoiceId) {
  try {
    const entities = documentsTableClient.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}' and invoiceId eq '${invoiceId}'` },
    });
    
    for await (const entity of entities) {
      return true; // Invoice exists
    }
    return false; // Invoice doesn't exist
  } catch (error) {
    throw new Error(`Failed to check invoice existence: ${error.message}`);
  }
}

/**
 * Creates a new document
 * @param {Object} documentData - Document data
 * @param {Object} user - User object
 * @returns {Object} - Created document
 */
async function createDocument(documentData, user) {
  try {
    const docId = documentData.id || uuidv4();
    const userId = user.id || user._id;
    
    // Check if invoice ID already exists for this user
    if (documentData.invoiceId) {
      const exists = await checkInvoiceExists(userId, documentData.invoiceId);
      if (exists) {
        throw new Error(`Invoice ID ${documentData.invoiceId} already exists for this customer. Please use a unique invoice number.`);
      }
    }
    
    // Build document entity with user tracking
    const docEntity = {
      partitionKey: userId,
      rowKey: docId,
      userId,
      username: user.username,
      email: user.email,
      invoiceId: documentData.invoiceId,
      commodityType: documentData.commodityType,
      pulpCommodityType: documentData.pulpCommodityType,
      otherPulpType: documentData.otherPulpType,
      quantityOfPulpMT: documentData.quantityOfPulpMT,
      fscCertificateNumber: documentData.fscCertificateNumber,
      wood: JSON.stringify(documentData.wood || []),
      producers: JSON.stringify(
        (documentData.producers || []).map((p) => ({
          name: p.name,
          email: p.email,
          countries: Array.isArray(p.countries) ? p.countries : [],
        }))
      ),
      woodOrigins: JSON.stringify(
        (documentData.woodOrigins || []).map((wo) => ({
          harvestDateStart: wo.harvestDateStart
            ? new Date(wo.harvestDateStart).toISOString().split("T")[0]
            : null,
          harvestDateEnd: wo.harvestDateEnd
            ? new Date(wo.harvestDateEnd).toISOString().split("T")[0]
            : null,
          geojsonFileId: wo.geojsonFileId,
        }))
      ),
      files: JSON.stringify(documentData.files || {}),
      createdAt: documentData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create document
    await documentsTableClient.createEntity(docEntity);
    
    return parseDocumentEntity(docEntity);
  } catch (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }
}

/**
 * Gets all documents for a user with optional filtering
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.invoiceId - Filter by invoice ID
 * @param {string} filters.startDate - Filter by start date
 * @param {string} filters.endDate - Filter by end date
 * @returns {Array} - Array of documents
 */
async function getUserDocuments(userId, filters = {}) {
  try {
    let filterQuery = `PartitionKey eq '${userId}'`;
    
    // Add invoice ID filter
    if (filters.invoiceId) {
      filterQuery += ` and contains(invoiceId, '${filters.invoiceId}')`;
    }
    
    // Add date range filter
    if (filters.startDate) {
      filterQuery += ` and createdAt ge '${filters.startDate}'`;
    }
    
    if (filters.endDate) {
      filterQuery += ` and createdAt le '${filters.endDate}'`;
    }
    
    const entities = documentsTableClient.listEntities({
      queryOptions: { filter: filterQuery },
    });
    
    const docs = [];
    for await (const entity of entities) {
      docs.push(parseDocumentEntity(entity));
    }
    
    return docs;
  } catch (error) {
    throw new Error(`Failed to get user documents: ${error.message}`);
  }
}

/**
 * Gets a single document by ID
 * @param {string} userId - User ID
 * @param {string} docId - Document ID
 * @returns {Object} - Document
 */
async function getDocumentById(userId, docId) {
  try {
    const entity = await documentsTableClient.getEntity(userId, docId);
    return parseDocumentEntity(entity);
  } catch (error) {
    throw new Error(`Failed to get document: ${error.message}`);
  }
}

/**
 * Parses document entity from table storage
 * @param {Object} entity - Raw entity from table
 * @returns {Object} - Parsed document
 */
function parseDocumentEntity(entity) {
  return {
    ...entity,
    suppliers: JSON.parse(entity.suppliers || "[]"),
    producers: JSON.parse(entity.producers || "[]"),
    woodOrigins: JSON.parse(entity.woodOrigins || "[]").map((wo) => ({
      ...wo,
      harvestDateStart: wo.harvestDateStart || null,
      harvestDateEnd: wo.harvestDateEnd || null,
    })),
    files: JSON.parse(entity.files || "{}"),
    wood: JSON.parse(entity.wood || "[]"),
    fscCertificateNumber: entity.fscCertificateNumber || null,
    commodityType: entity.commodityType || null,
    pulpCommodityType: entity.pulpCommodityType || null,
    otherPulpType: entity.otherPulpType || null,
  };
}

module.exports = {
  createDocument,
  getUserDocuments,
  getDocumentById,
  parseDocumentEntity,
  checkInvoiceExists
}; 