// Integration tests for payment routes.

import request from 'supertest';
import app from '../../app';

// Mock auth middleware
jest.mock('../../middlewares/auth.middleware', () => ({
  authenticateUser: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@shipzi.com' };
    next();
  },
}));

// Mock services
jest.mock('../../services/payment.service', () => ({
  paymentService: {
    createOrder: jest.fn().mockResolvedValue({
      order_id: 'order_test_123',
      amount: 99900,
      currency: 'INR',
      key_id: 'rzp_test_key',
    }),
    verifyAndCapturePayment: jest.fn().mockResolvedValue({
      success: true,
      message: 'Payment verified successfully',
      payment_id: 'payment-uuid-1',
    }),
    getPayment: jest.fn().mockResolvedValue({
      id: 'payment-uuid-1',
      amount: 99900,
      status: 'paid',
    }),
    getPaymentHistory: jest.fn().mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
  },
}));

jest.mock('../../services/refund.service', () => ({
  refundService: {
    initiateRefund: jest.fn().mockResolvedValue({
      refund_id: 'refund-uuid-1',
      status: 'pending',
      amount: 99900,
      message: 'Refund initiated',
    }),
  },
}));

jest.mock('../../services/webhook.service', () => ({
  webhookService: {
    processWebhook: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('Payment Routes', () => {
  describe('POST /api/payment/create-order', () => {
    it('should create order with valid request', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('X-Idempotency-Key', 'test-idem-key-123')
        .send({ plan_id: 'pro_monthly' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order_id).toBe('order_test_123');
    });

    it('should return 422 for missing plan_id', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('X-Idempotency-Key', 'test-idem-key-456')
        .send({});

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/payment/verify', () => {
    it('should verify payment with valid data', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'valid_signature',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 422 for missing fields', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({ razorpay_order_id: 'order_test_123' });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/payment/refund', () => {
    it('should initiate refund', async () => {
      const response = await request(app)
        .post('/api/payment/refund')
        .send({
          payment_id: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'Duplicate payment',
          type: 'full',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/payment/history', () => {
    it('should return payment history', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/payment/webhook', () => {
    it('should accept webhook with valid signature', async () => {
      const response = await request(app)
        .post('/api/payment/webhook')
        .set('X-Razorpay-Signature', 'valid_signature')
        .send({ event: 'payment.captured', payload: {} });

      expect(response.status).toBe(200);
    });

    it('should always return 200 even on error', async () => {
      const response = await request(app)
        .post('/api/payment/webhook')
        .send({ event: 'payment.captured', payload: {} });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });
});
