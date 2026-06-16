// Verify JWT tokens from Supabase Auth.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/env';
import { createChildLogger } from '../config/logger';

const logger = createChildLogger('auth-middleware');

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { sub: string; email?: string; role?: string };

    req.user = {
      id: decoded.sub,
      email: decoded.email || '',
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.warn('JWT verification failed', { error: (error as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
