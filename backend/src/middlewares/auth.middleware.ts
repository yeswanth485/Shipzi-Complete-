// Verify JWT tokens from Supabase Auth.

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
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
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Supabase token verification failed', { error: error?.message });
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role,
    };

    next();
  } catch (error) {
    logger.warn('Auth verification failed', { error: (error as Error).message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
