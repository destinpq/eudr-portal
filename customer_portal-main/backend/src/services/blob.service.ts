import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob';
import * as AzureBlob from '@azure/storage-blob';
import dotenv from 'dotenv';
import path from 'path';

// Only load .env in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage connection string is not configured. Please set AZURE_STORAGE_CONNECTION_STRING.');
}

let blobServiceClient: BlobServiceClient;
try {
  blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
} catch (error) {
  console.error('Error creating BlobServiceClient:', error);
  throw new Error('Failed to initialize Azure Blob Storage client. Please check your connection string.');
}

// Extract account name and key for SAS generation
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error('Azure Storage connection string is not configured.');
}

const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
if (!matches) {
  throw new Error('Invalid connection string format for SAS generation');
}

const [, accountName, accountKey] = matches;
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

export class BlobService {
  private containerClient: ContainerClient;
  private accountName: string;

  constructor() {
    this.containerClient = blobServiceClient.getContainerClient('invoices');
    this.accountName = accountName;
  }

  async uploadFile(file: Buffer, fileName: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.upload(file, file.length);
    return blockBlobClient.url;
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    const downloadResponse = await blockBlobClient.download(0);
    const downloadedContent = await streamToBuffer(downloadResponse.readableStreamBody!);
    return downloadedContent;
  }

  async deleteFile(fileName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.delete();
  }

  async generateBlobSasUrl(blobName: string, expiryMinutes: number = 60): Promise<string> {
    const standardizedBlobName = blobName.endsWith('.zip') ? blobName : `${blobName}.zip`;

    const containerClient = this.containerClient;
    const blobClient = containerClient.getBlobClient(standardizedBlobName);

    const blobSASPermissions = BlobSASPermissions.parse('r');

    const expiresOn = new Date(new Date().valueOf() + expiryMinutes * 60 * 1000);

    const sasQueryParameters = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: standardizedBlobName,
        permissions: blobSASPermissions,
        expiresOn: expiresOn,
      },
      sharedKeyCredential
    );

    return `${blobClient.url}?${sasQueryParameters.toString()}`;
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

export const uploadToBlobStorage = async (
  file: Express.Multer.File,
  containerName: string
): Promise<string> => {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(file.buffer, file.size);

    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading to blob storage:', error);
    throw error;
  }
}; 