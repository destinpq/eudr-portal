import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ message: 'No authorization header provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('No token provided in authorization header');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    console.log('Token verified successfully for user:', decoded.userId);
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error instanceof Error) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    console.log('No user found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    console.log('Non-admin user attempted admin access:', req.user.userId);
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  console.log('Admin access granted for user:', req.user.userId);
  next();
};

export const requireCustomer = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    console.log('No user found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'customer') {
    console.log('Non-customer user attempted customer access:', req.user.userId);
    return res.status(403).json({ message: 'Customer access required' });
  }
  
  console.log('Customer access granted for user:', req.user.userId);
  next();
}; 