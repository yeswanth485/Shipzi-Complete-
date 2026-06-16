// All direct Razorpay API calls. No database access here.

import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
import { CONFIG } from '../config/env';
import { createChildLogger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';

const logger = createChildLogger('razorpay-service');

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn('Retrying Razorpay API call', { attempt: attempt + 1, delay, error: lastError.message });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const razorpayService = {
  async createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string; status: string }> {
    logger.info('Creating Razorpay order', { amount: params.amount, currency: params.currency });

    if (params.amount < 100 || params.amount > 10000000) {
      throw new AppError('Amount must be between 100 and 10000000 paise', 400);
    }

    const order = await retryWithBackoff(() =>
      razorpay.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      })
    );

    logger.info('Razorpay order created', { orderId: order.id });
    return {
      id: order.id,
      amount: order.amount as number,
      currency: order.currency as string,
      status: order.status as string,
    };
  },

  verifyPaymentSignature(params: {
    order_id: string;
    payment_id: string;
    signature: string;
  }): boolean {
    logger.debug('Verifying payment signature');

    const body = `${params.order_id}|${params.payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const signatureBuf = Buffer.from(params.signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      logger.info('Payment signature verification failed: length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);

    logger.info('Payment signature verification', { isValid });
    return isValid;
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    logger.debug('Verifying webhook signature');

    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      logger.info('Webhook signature verification failed: length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);

    logger.info('Webhook signature verification', { isValid });
    return isValid;
  },

  async fetchPayment(razorpay_payment_id: string): Promise<Record<string, unknown>> {
    logger.debug('Fetching Razorpay payment', { paymentId: razorpay_payment_id });
    const payment = await retryWithBackoff(() =>
      (razorpay.payments.fetch as any)(razorpay_payment_id)
    );
    return payment as Record<string, unknown>;
  },

  async capturePayment(razorpay_payment_id: string, amount: number): Promise<Record<string, unknown>> {
    logger.info('Capturing Razorpay payment', { paymentId: razorpay_payment_id, amount });
    const result = await retryWithBackoff(() =>
      (razorpay.payments.capture as any)(razorpay_payment_id, amount)
    );
    logger.info('Payment captured', { paymentId: razorpay_payment_id });
    return result as Record<string, unknown>;
  },

  async refundPayment(
    razorpay_payment_id: string,
    params: { amount: number; notes?: Record<string, string>; speed?: string }
  ): Promise<Record<string, unknown>> {
    logger.info('Initiating Razorpay refund', { paymentId: razorpay_payment_id, amount: params.amount });
    const refund = await retryWithBackoff(() =>
      (razorpay.payments.refund as any)(razorpay_payment_id, {
        amount: params.amount,
        notes: params.notes,
        speed: params.speed,
      })
    );
    logger.info('Refund initiated', { refundId: (refund as any).id });
    return refund as Record<string, unknown>;
  },
};
