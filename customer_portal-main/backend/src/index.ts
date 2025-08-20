import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFile, uploadMultipleFiles } from './controllers/upload.controller';
import { login, getMappings, generateDownloadUrl, getAllUsers, addUser, updateUser, deleteUser, getCustomerInvoices } from './controllers/auth.controller';
import { authenticateToken, requireAdmin } from './middleware/auth.middleware';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';

// Only load .env in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Check for required environment variables
const requiredVars = [
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_STORAGE_ACCOUNT_NAME',
  'AZURE_STORAGE_ACCOUNT_KEY',
  'JWT_SECRET',
];
const missingVars = requiredVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  throw new Error('Missing required environment variables: ' + missingVars.join(', '));
}

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration
const allowedOrigins = [
  'https://customer-portal-gbeyf0gta9b7h5aj.centralindia-01.azurewebsites.net',
  'http://localhost:3000',
  'https://customer-portal-gbeyf0gta9b7h5aj.centralindia-01.azurewebsites.net/'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Routes
app.use('/api/auth', authRouter);

// Upload routes (These are not auth routes, so they remain separate)
app.post('/api/upload', 
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  uploadFile
);

app.post('/api/upload/multiple', 
  authenticateToken,
  requireAdmin,
  upload.array('files'),
  uploadMultipleFiles
);

// Mapping routes
app.get('/api/mappings',
  authenticateToken,
  requireAdmin,
  getMappings
);

// Download route (for admin to get SAS URL)
app.get('/api/download-invoice/:customerId/:invoiceNumber',
  authenticateToken,
  generateDownloadUrl
);

// Customer Invoice Routes
app.get('/api/customer/invoices', 
  authenticateToken,
  // No requireAdmin middleware here as this is for customers
  getCustomerInvoices
);

// Admin User Management Routes
app.get('/api/admin/users',
  authenticateToken,
  requireAdmin,
  getAllUsers
);

app.post('/api/admin/users',
  authenticateToken,
  requireAdmin,
  addUser
);

// Note: Using customerId in the URL assumes customerId is unique and findable. 
// As noted in AuthService, finding by customerId is inefficient in Table Storage.
// A more robust solution might use the RowKey (username) in the URL for updates/deletions.
app.put('/api/admin/users/:customerId',
  authenticateToken,
  requireAdmin,
  updateUser
);

app.delete('/api/admin/users/:customerId',
  authenticateToken,
  requireAdmin,
  deleteUser
);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log('=================================');
  console.log('Server is running on port', port);
  console.log('Environment check:');
  console.log('- Storage Connection:', process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅' : '❌');
  console.log('- JWT Secret:', process.env.JWT_SECRET ? '✅' : '❌');
  console.log('=================================');
}); 