import { Router } from 'express';
import { login, getMappings, generateDownloadUrl, getAllUsers, addUser, updateUser, deleteUser, getCustomerInvoices, changePassword, resetPassword, forceChangePassword } from '../controllers/auth.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/force-change-password', forceChangePassword);

// Protected routes
router.get('/mappings', authenticateToken, requireAdmin, getMappings);
router.get('/download-invoice/:customerId/:invoiceNumber', authenticateToken, generateDownloadUrl);
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.post('/users', authenticateToken, requireAdmin, addUser);
router.put('/users/:customerId', authenticateToken, requireAdmin, updateUser);
router.delete('/users/:customerId', authenticateToken, requireAdmin, deleteUser);
router.get('/customer-invoices', authenticateToken, getCustomerInvoices);
router.post('/change-password', authenticateToken, changePassword);
router.post('/reset-password', authenticateToken, requireAdmin, resetPassword);

export { router as authRouter }; 