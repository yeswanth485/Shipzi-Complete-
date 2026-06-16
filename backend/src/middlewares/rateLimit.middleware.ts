// Rate limiting per IP and per user.

import rateLimit from 'express-rate-limit';
import { CONFIG } from '../config/env';

export const globalRateLimit = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const paymentRateLimit = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment requests, please try again later' },
});

// Webhook endpoint has NO rate limit — Razorpay must not be blocked
export const webhookRateLimit = rateLimit({
  windowMs: 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
