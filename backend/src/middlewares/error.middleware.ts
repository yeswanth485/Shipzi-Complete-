// Global error handler. Last middleware in Express chain.

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createChildLogger } from '../config/logger';
import { CONFIG } from '../config/env';

const logger = createChildLogger('error-handler');

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn('Validation error', { requestId, errors: formattedErrors });
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      message: 'Request validation failed',
      details: CONFIG.NODE_ENV === 'development' ? formattedErrors : undefined,
    });
    return;
  }

  // App errors (operational)
  if (err instanceof AppError) {
    logger.warn('App error', { requestId, statusCode: err.statusCode, message: err.message });
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
    });
    return;
  }

  // Razorpay API errors
  if (err.message?.includes('Razorpay')) {
    logger.error('Razorpay API error', { requestId, message: err.message });
    res.status(502).json({
      success: false,
      error: 'Payment gateway error',
      message: CONFIG.NODE_ENV === 'development' ? err.message : 'Payment gateway error',
    });
    return;
  }

  // Supabase errors
  if (err.message?.includes('Database error') || err.message?.includes('Supabase')) {
    logger.error('Database error', { requestId, message: err.message });
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: 'An internal database error occurred',
    });
    return;
  }

  // Unknown errors — never leak internal details in production
  logger.error('Unhandled error', { requestId, message: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: CONFIG.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: CONFIG.NODE_ENV === 'development'
      ? `Route ${req.method} ${req.path} not found`
      : 'Route not found',
  });
}
