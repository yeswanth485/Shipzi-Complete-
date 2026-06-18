// Unit tests for razorpay.service.ts

import crypto from 'crypto';
import { razorpayService } from '../../services/razorpay.service';

const TEST_SECRET = 'rzp_test_FAKE_SECRET_FOR_TESTING_ONLY';

// Mock the config
jest.mock('../../config/env', () => ({
  CONFIG: {
    RAZORPAY_KEY_ID: 'rzp_test_FAKE_KEY_FOR_TESTING',
    RAZORPAY_KEY_SECRET: TEST_SECRET,
    RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
    NODE_ENV: 'test',
  },
}));

// Mock the razorpay module
jest.mock('../../config/razorpay', () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
    },
    payments: {
      fetch: jest.fn(),
      capture: jest.fn(),
      refund: jest.fn(),
    },
  },
  RAZORPAY_KEY_ID: 'rzp_test_key',
}));

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

import { razorpay } from '../../config/razorpay';

describe('razorpayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      (razorpay.orders.create as jest.Mock).mockResolvedValue({
        id: 'order_test_123',
        amount: 99900,
        currency: 'INR',
        status: 'created',
      });

      const result = await razorpayService.createOrder({
        amount: 99900,
        currency: 'INR',
        receipt: 'rcpt_test',
      });

      expect(result.id).toBe('order_test_123');
      expect(result.amount).toBe(99900);
      expect(razorpay.orders.create).toHaveBeenCalledWith({
        amount: 99900,
        currency: 'INR',
        receipt: 'rcpt_test',
        notes: undefined,
      });
    });

    it('should throw error for amount below minimum', async () => {
      await expect(
        razorpayService.createOrder({ amount: 50, currency: 'INR', receipt: 'rcpt_test' })
      ).rejects.toThrow('Amount must be between');
    });

    it('should throw error for amount above maximum', async () => {
      await expect(
        razorpayService.createOrder({ amount: 20000000, currency: 'INR', receipt: 'rcpt_test' })
      ).rejects.toThrow('Amount must be between');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should return true for valid signature', () => {
      const order_id = 'order_test_123';
      const payment_id = 'pay_test_456';
      const expectedSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');

      const result = razorpayService.verifyPaymentSignature({
        order_id,
        payment_id,
        signature: expectedSignature,
      });

      expect(result).toBe(true);
    });

    it('should return false for tampered signature', () => {
      const result = razorpayService.verifyPaymentSignature({
        order_id: 'order_test_123',
        payment_id: 'pay_test_456',
        signature: 'tampered_signature_value',
      });

      expect(result).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid webhook signature', () => {
      const rawBody = Buffer.from('{"event":"payment.captured"}');
      const expectedSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(rawBody)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(rawBody, expectedSignature);
      expect(result).toBe(true);
    });

    it('should return false for invalid webhook signature', () => {
      const rawBody = Buffer.from('{"event":"payment.captured"}');
      const result = razorpayService.verifyWebhookSignature(rawBody, 'invalid_signature');
      expect(result).toBe(false);
    });
  });

  describe('fetchPayment', () => {
    it('should fetch a payment from Razorpay', async () => {
      (razorpay.payments.fetch as jest.Mock).mockResolvedValue({
        id: 'pay_test_456',
        amount: 99900,
        status: 'captured',
      });

      const result = await razorpayService.fetchPayment('pay_test_456');
      expect(result.id).toBe('pay_test_456');
    });
  });

  describe('refundPayment', () => {
    it('should initiate a refund', async () => {
      (razorpay.payments.refund as jest.Mock).mockResolvedValue({
        id: 'rfnd_test_789',
        amount: 99900,
        status: 'processed',
      });

      const result = await razorpayService.refundPayment('pay_test_456', { amount: 99900 });
      expect(result.id).toBe('rfnd_test_789');
    });
  });
});
