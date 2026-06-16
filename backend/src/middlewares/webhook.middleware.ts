// Special middleware for webhook endpoint — preserves raw body buffer.

import { Request, Response, NextFunction } from 'express';

export function webhookBodyParser(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      try {
        req.body = JSON.parse(req.rawBody.toString('utf8'));
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
}
