// Centralized logger using Winston.

import winston from 'winston';
import { CONFIG } from './env';

const sensitiveFields = ['password', 'secret', 'key', 'token', 'authorization'];

const redactFormat = winston.format((info) => {
  if (info.message && typeof info.message === 'object') {
    for (const key of Object.keys(info.message)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        info.message[key] = '[REDACTED]';
      }
    }
  }
  return info;
});

const devFormat = winston.format.combine(
  redactFormat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: CONFIG.NODE_ENV === 'production' ? 'info' : 'debug',
  format: CONFIG.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'shipzi-payments' },
  transports: [new winston.transports.Console()],
});

export function createChildLogger(context: string) {
  return logger.child({ context });
}
