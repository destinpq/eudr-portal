import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { MappingService } from '../services/mapping.service';
import { BlobService } from '../services/blob.service';
import { generateToken, TokenPayload } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';
import { comparePassword, hashPassword, validatePasswordPolicy } from '../utils/password';
import { AuthEntity } from '../services/auth.service';

const authService = new AuthService();
const mappingService = new MappingService();
const blobService = new BlobService();

export const login = async (req: Request, res: Response) => {
  console.log('=== LOGIN REQUEST DEBUG - DEPLOYMENT TIMESTAMP: 2025-06-18 05:10 ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  
  const { customerId, password } = req.body;

  console.log('Extracted customerId:', customerId);
  console.log('Extracted password:', password ? '[HIDDEN]' : 'undefined');
  
  if (!customerId || !password) {
    console.log('Login failed: Missing customerId or password');
    console.log('customerId present:', !!customerId);
    console.log('password present:', !!password);
    return res.status(400).json({ message: 'Customer ID and password are required' });
  }

  try {
    console.log('Attempting to get user from database...');
    const user = await authService.getUserByCustomerId(customerId);
    console.log('User from DB:', user ? { customerId: user.customerId, role: user.role } : 'null');
    
    if (!user) {
      console.log('Login failed: Invalid credentials for customerId:', customerId);
      console.log('User exists:', !!user);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check account lockout
    if (user.accountLockedUntil) {
      const lockedUntil = new Date(user.accountLockedUntil);
      if (lockedUntil > new Date()) {
        const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(403).json({ message: `Account locked. Try again in ${minutes} minutes.`, lockout: true });
      }
    }
    // Check password
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // Lock account if max attempts reached
      if (user.failedLoginAttempts >= 3) {
        const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        user.accountLockedUntil = lockoutUntil.toISOString();
        user.failedLoginAttempts = 0;
      }
      await authService.updateUser(user.customerId, { failedLoginAttempts: user.failedLoginAttempts, accountLockedUntil: user.accountLockedUntil });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = '';
      await authService.updateUser(user.customerId, { failedLoginAttempts: 0, accountLockedUntil: '' });
    }
    // Check password expiry
    if (user.passwordExpiryDate && new Date(user.passwordExpiryDate) < new Date()) {
      return res.status(403).json({ message: 'Password expired. Please change your password.', passwordExpired: true });
    }
    // Check force password change
    if (user.forcePasswordChange) {
      return res.status(403).json({ message: 'Password change required. Please change your password.', forcePasswordChange: true });
    }
    
    const token = generateToken({
      userId: user.rowKey,
      role: user.role,
      customerId: user.customerId
    });
    console.log('Login successful for customerId:', customerId, '. Token generated:', token ? '[TOKEN]' : 'null');
    res.status(200).json({ token });
  } catch (error) {
    console.error('Login error for customerId:', customerId, ':', error);
    res.status(500).json({ message: 'An error occurred during login', error: error?.toString?.() });
  }
};

export const getMappings = async (req: AuthRequest, res: Response) => {
  console.log('Fetching all mappings for admin user:', req.user?.userId); // Debug log
  try {
    const mappingEntities = await mappingService.getAllMappings();

    // Process mappingEntities to group by customerId
    const customerMappings: { [customerId: string]: { customerId: string, invoices: { invoiceNumber: string, blobLink: string }[] } } = {};

    for (const entity of mappingEntities) {
      const customerId = entity.partitionKey;
      const invoiceNumber = entity.rowKey;
      const blobLink = entity.blobUrl;

      if (!customerMappings[customerId]) {
        customerMappings[customerId] = {
          customerId: customerId,
          invoices: []
        };
      }

      customerMappings[customerId].invoices.push({
        invoiceNumber: invoiceNumber,
        blobLink: blobLink
      });
    }

    // Convert the object back to an array
    const formattedMappings = Object.values(customerMappings);

    console.log('Successfully fetched and formatted mappings.'); // Debug log
    res.status(200).json(formattedMappings);

  } catch (error) {
    console.error('Error fetching mappings:', error); // Debug log
    res.status(500).json({ message: 'An error occurred while fetching mappings' });
  }
};

export const generateDownloadUrl = async (req: AuthRequest, res: Response) => {
  const { customerId, invoiceNumber } = req.params;
  console.log(`Generating download URL for customer ${customerId}, invoice ${invoiceNumber} for user:`, req.user?.userId);
  const authenticatedCustomerId = req.user?.customerId;
  const userRole = req.user?.role;

  // Allow admin users to download any invoice, regular users can only download their own
  if (userRole !== 'admin' && (!authenticatedCustomerId || authenticatedCustomerId !== customerId)) {
    console.log(`Unauthorized download attempt for customer ${customerId} by user with customerId ${authenticatedCustomerId}`);
    return res.status(403).json({ message: 'Access denied: You can only download your own invoices.' });
  }

  try {
    const mappings = await mappingService.getMappingsByCustomerId(customerId);
    const mappingExists = mappings.some(m => m.rowKey === invoiceNumber);

    if (!mappingExists) {
        console.log(`Mapping not found for customer ${customerId}, invoice ${invoiceNumber}`);
        return res.status(404).json({ message: 'Mapping not found' });
    }

    const blobName = `${invoiceNumber}.zip`;
    const sasUrl = await blobService.generateBlobSasUrl(blobName, 10);

    console.log('Successfully generated SAS URL.');
    res.status(200).json({ sasUrl });

  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ message: 'An error occurred while generating the download URL' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  console.log('Fetching all users for admin user:', req.user?.userId); // Debug log
  try {
    const users = await authService.getAllUsers(); // Assuming AuthService has getAllUsers method
    console.log('Successfully fetched all users.'); // Debug log
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error); // Debug log
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

export const addUser = async (req: Request, res: Response) => {
  const { customerId, password, role } = req.body;
  console.log('Attempting to add new user:', customerId); // Debug log

  if (!customerId || !password) {
    return res.status(400).json({ message: 'Customer ID and password are required' });
  }

  try {
    const newUser = await authService.createUser(customerId, password, role || 'customer');
    console.log('User added successfully:', newUser.rowKey); // Debug log
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error adding user:', error); // Debug log
    res.status(500).json({ message: 'An error occurred while adding the user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { customerId } = req.params; // Get customerId from URL
  const { password, role } = req.body; // Get updatable fields from body
  console.log('Attempting to update user with Customer ID:', customerId); // Debug log

  try {
    // Prepare updates object with only valid AuthEntity properties
    const updates: Partial<AuthEntity> = {};
    
    if (role) {
      updates.role = role;
    }
    
    if (password) {
      // Hash the password before updating
      const passwordHash = await hashPassword(password);
      updates.passwordHash = passwordHash;
      updates.passwordLastChanged = new Date().toISOString();
      updates.lastPasswordChange = new Date().toISOString();
      // Set new expiry (90 days)
      updates.passwordExpiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      // Update password history
      const user = await authService.getUserByCustomerId(customerId);
      if (user) {
        const history = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
        const newHistory = [...history, passwordHash].slice(-5);
        updates.passwordHistory = JSON.stringify(newHistory);
      }
    }

    const updatedUser = await authService.updateUser(customerId, updates);
    console.log('User updated successfully:', customerId); // Debug log
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error); // Debug log
    res.status(500).json({ message: 'An error occurred while updating the user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { customerId } = req.params; // Get customerId from URL
  console.log('Attempting to delete user with Customer ID:', customerId); // Debug log

  try {
    await authService.deleteUser(customerId); // Assuming AuthService has deleteUser method
    console.log('User deleted successfully:', customerId); // Debug log
    res.status(204).send(); // 204 No Content is typical for successful deletion
  } catch (error) {
    console.error('Error deleting user:', error); // Debug log
    res.status(500).json({ message: 'An error occurred while deleting the user' });
  }
};

export const getCustomerInvoices = async (req: AuthRequest, res: Response) => {
  console.log('Fetching invoices for customer user:', req.user?.customerId); // Debug log
  const customerId = req.user?.customerId; // Get customerId from the authenticated user's token

  if (!customerId) {
    console.log('getCustomerInvoices failed: Customer ID not found in token.'); // Debug log
    return res.status(400).json({ message: 'Customer ID not found in authentication token' });
  }

  try {
    // Use the existing service method to get mappings by customerId
    const mappingEntities = await mappingService.getMappingsByCustomerId(customerId);

    // We might want to format this data before sending it to the frontend
    // For now, let's send the raw entities. The frontend can format.

    console.log(`Successfully fetched ${mappingEntities.length} mappings for customer ${customerId}.`); // Debug log
    res.status(200).json(mappingEntities);

  } catch (error) {
    console.error(`Error fetching invoices for customer ${customerId}:`, error); // Debug log
    res.status(500).json({ message: 'An error occurred while fetching invoices' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.customerId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized." });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
    }

    try {
        const user = await authService.getUserByCustomerId(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await comparePassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password." });
        }

        const lastChanged = new Date(user.lastPasswordChange);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (lastChanged > sevenDaysAgo) {
            return res.status(400).json({ message: "You can only change your password once every 7 days." });
        }
        
        const policyErrors = validatePasswordPolicy(newPassword, user.role === 'admin');
        if (policyErrors.length > 0) {
            return res.status(400).json({ message: "Password does not meet policy requirements.", errors: policyErrors });
        }
        
        const history = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
        for (const oldHash of history) {
            if (await comparePassword(newPassword, oldHash)) {
                return res.status(400).json({ message: 'New password must not match any of the last 5 passwords.' });
            }
        }

        const newHash = await hashPassword(newPassword);
        const nowIso = new Date().toISOString();
        const newHistory = [...history, newHash].slice(-5);
        const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        await authService.updateUser(userId, {
            passwordHash: newHash,
            passwordExpiryDate: expiry,
            lastPasswordChange: nowIso,
            passwordHistory: JSON.stringify(newHistory),
            forcePasswordChange: false,
        });

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'An error occurred while changing the password.' });
    }
};

export const forceChangePassword = async (req: Request, res: Response) => {
    const { customerId, currentPassword, newPassword } = req.body;

    if (!customerId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Customer ID, current password, and new password are required." });
    }

    try {
        const user = await authService.getUserByCustomerId(customerId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await comparePassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password." });
        }
        
        const policyErrors = validatePasswordPolicy(newPassword, user.role === 'admin');
        if (policyErrors.length > 0) {
            return res.status(400).json({ message: "Password does not meet policy requirements.", errors: policyErrors });
        }
        
        const history = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
        for (const oldHash of history) {
            if (await comparePassword(newPassword, oldHash)) {
                return res.status(400).json({ message: 'New password must not match any of the last 5 passwords.' });
            }
        }

        const newHash = await hashPassword(newPassword);
        const nowIso = new Date().toISOString();
        const newHistory = [...history, newHash].slice(-5);
        const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        await authService.updateUser(customerId, {
            passwordHash: newHash,
            passwordExpiryDate: expiry,
            lastPasswordChange: nowIso,
            passwordHistory: JSON.stringify(newHistory),
            forcePasswordChange: false,
        });

        const token = generateToken({
            userId: user.rowKey,
            role: user.role,
            customerId: user.customerId
        });

        res.status(200).json({ message: 'Password changed successfully.', token: token });

    } catch (error) {
        console.error('Error in forceChangePassword:', error);
        res.status(500).json({ message: 'An error occurred while changing the password.' });
    }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({ message: "User ID and new password are required." });
        }

        const user = await authService.getUserByCustomerId(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        
        const policyErrors = validatePasswordPolicy(newPassword, user.role === 'admin');
        if (policyErrors.length > 0) {
            return res.status(400).json({ message: "Password does not meet policy requirements.", errors: policyErrors });
        }
        
        const history = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
        for (const oldHash of history) {
            if (await comparePassword(newPassword, oldHash)) {
                return res.status(400).json({ message: 'New password must not match any of the last 5 passwords.' });
            }
        }

        const newHash = await hashPassword(newPassword);
        const nowIso = new Date().toISOString();
        const newHistory = [...history, newHash].slice(-5);
        const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        await authService.updateUser(userId, {
            passwordHash: newHash,
            passwordExpiryDate: expiry,
            lastPasswordChange: nowIso,
            passwordHistory: JSON.stringify(newHistory),
            forcePasswordChange: true,
        });

        res.status(200).json({ message: `Password for user ${userId} has been reset successfully.` });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'An error occurred while resetting the password.' });
    }
};

// You might add registration or other auth related endpoints here later 