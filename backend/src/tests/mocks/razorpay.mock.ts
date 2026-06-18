// Mock Razorpay SDK for testing.

import crypto from 'crypto';

const TEST_SECRET = 'rzp_test_FAKE_SECRET_FOR_TESTING_ONLY';

export const mockRazorpayOrders = {
  create: jest.fn().mockResolvedValue({
    id: `order_${Date.now()}`,
    entity: 'order',
    amount: 99900,
    currency: 'INR',
    receipt: 'rcpt_test_123',
    status: 'created',
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
  }),
};

export const mockRazorpayPayments = {
  fetch: jest.fn().mockResolvedValue({
    id: `pay_${Date.now()}`,
    entity: 'payment',
    amount: 99900,
    currency: 'INR',
    status: 'captured',
    order_id: 'order_test_123',
    method: 'upi',
    description: 'Test payment',
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
  }),
  capture: jest.fn().mockResolvedValue({
    id: `pay_${Date.now()}`,
    entity: 'payment',
    amount: 99900,
    currency: 'INR',
    status: 'captured',
  }),
  refund: jest.fn().mockResolvedValue({
    id: `rfnd_${Date.now()}`,
    entity: 'refund',
    amount: 99900,
    currency: 'INR',
    payment_id: 'pay_test_123',
    status: 'processed',
    notes: {},
    created_at: Math.floor(Date.now() / 1000),
  }),
};

export function generateValidSignature(order_id: string, payment_id: string): string {
  const body = `${order_id}|${payment_id}`;
  return crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex');
}

export function generateInvalidSignature(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const mockRazorpayInstance = {
  orders: mockRazorpayOrders,
  payments: mockRazorpayPayments,
};

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => mockRazorpayInstance);
});
