const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const tableUsers = process.env.AZURE_TABLE_USERS;
const tableDocuments = process.env.AZURE_TABLE_DOCUMENTS;
const tableCompanyDocs = process.env.AZURE_TABLE_COMPANY_DOCS || "CompanyDocuments";
const blobContainer = process.env.AZURE_BLOB_CONTAINER;

const usersTableClient = TableClient.fromConnectionString(
  connectionString,
  tableUsers
);
const documentsTableClient = TableClient.fromConnectionString(
  connectionString,
  tableDocuments
);
const companyDocsTableClient = TableClient.fromConnectionString(
  connectionString,
  tableCompanyDocs
);
const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(blobContainer);

module.exports = {
  usersTableClient,
  documentsTableClient,
  companyDocsTableClient,
  containerClient,
};
