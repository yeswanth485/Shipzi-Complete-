// Verify Firebase ID tokens.

import { Request, Response, NextFunction } from 'express';
import { firebaseAdmin } from '../config/firebase';
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

export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken as any).role || 'member',
    };
    next();
  } catch (error) {
    logger.warn('Firebase token verification failed', { error: (error as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
