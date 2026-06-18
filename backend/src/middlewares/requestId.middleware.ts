// Attach unique request_id to every incoming request for tracing.

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawId = (req.headers['x-request-id'] as string) || '';
  // Only trust client-provided ID if it's a valid UUID format; otherwise generate our own
  const requestId = (rawId && UUID_REGEX.test(rawId) && rawId.length <= 36) ? rawId : uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
