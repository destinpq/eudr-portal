import jwt from 'jsonwebtoken';

// JWT_SECRET should be set in environment variables (Azure App Service or .env for local dev)
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'customer';
  customerId?: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: TokenPayload): string => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    algorithm: 'HS256'
  });
};

export const verifyToken = (token: string): TokenPayload => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
    if (!decoded.userId || !decoded.role) {
      throw new Error('Invalid token payload');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

export const generateAdminToken = (): string => {
  return generateToken({
    userId: 'admin',
    role: 'admin'
  });
};

export const generateCustomerToken = (customerId: string): string => {
  return generateToken({
    userId: customerId,
    role: 'customer',
    customerId
  });
}; 