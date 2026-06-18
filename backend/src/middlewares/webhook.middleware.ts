// Special middleware for webhook endpoint — preserves raw body buffer.

import { Request, Response, NextFunction } from 'express';

const MAX_WEBHOOK_BODY_SIZE = 1024 * 1024; // 1MB limit

export interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

export function webhookBodyParser(req: WebhookRequest, _res: Response, next: NextFunction): void {
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_WEBHOOK_BODY_SIZE) {
        req.destroy();
        _res.status(413).json({ error: 'Webhook body too large' });
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (totalSize > MAX_WEBHOOK_BODY_SIZE) return;
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
