import { Request, Response, NextFunction } from 'express';

interface ErrorWithName extends Error {
  name: string;
}

export const errorHandler = (
  err: ErrorWithName,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ message: 'CORS error: Origin not allowed' });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}; 