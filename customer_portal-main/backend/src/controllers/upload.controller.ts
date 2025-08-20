import { Request, Response } from 'express';
import { BlobService } from '../services/blob.service';
import { MappingService } from '../services/mapping.service';
import { AuthRequest } from '../middleware/auth.middleware';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({ storage: multer.memoryStorage() });
const blobService = new BlobService();
const mappingService = new MappingService();

export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { customerId, invoiceNumber } = req.body;
    if (!customerId || !invoiceNumber) {
      return res.status(400).json({ message: 'Customer ID and Invoice Number are required' });
    }

    // Upload file to blob storage
    const blobUrl = await blobService.uploadFile(req.file.buffer, `${invoiceNumber}.zip`);

    // Create mapping in table storage
    const uploadDate = new Date().toLocaleDateString();
    await mappingService.createMapping({
      customerId,
      invoiceNumber,
      blobUrl,
      uploadDate
    });

    res.status(200).json({
      message: 'File uploaded successfully',
      blobUrl,
      uploadDate
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

export const uploadMultipleFiles = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadResults = await Promise.all(
      req.files.map(async (file: Express.Multer.File) => {
        const { customerId, invoiceNumber } = req.body;
        if (!customerId || !invoiceNumber) {
          throw new Error('Customer ID and Invoice Number are required for each file');
        }

        // Upload file to blob storage
        const blobUrl = await blobService.uploadFile(file.buffer, `${invoiceNumber}.zip`);

        // Create mapping in table storage
        const uploadDate = new Date().toLocaleDateString();
        await mappingService.createMapping({
          customerId,
          invoiceNumber,
          blobUrl,
          uploadDate
        });

        return {
          fileName: file.originalname,
          invoiceNumber,
          customerId,
          blobUrl,
          uploadDate
        };
      })
    );

    res.status(200).json({
      message: 'Files uploaded successfully',
      results: uploadResults
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
}; 