// Initialize Razorpay SDK client.

import Razorpay from 'razorpay';
import { CONFIG } from './env';
import { logger } from './logger';

if (!CONFIG.RAZORPAY_KEY_ID || !CONFIG.RAZORPAY_KEY_SECRET) {
  logger.warn('Razorpay credentials not configured');
}

export const razorpay = new Razorpay({
  key_id: CONFIG.RAZORPAY_KEY_ID,
  key_secret: CONFIG.RAZORPAY_KEY_SECRET,
});

export const RAZORPAY_KEY_ID = CONFIG.RAZORPAY_KEY_ID;
