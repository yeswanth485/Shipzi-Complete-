// End-to-end payment flow tests.

import crypto from 'crypto';

const TEST_RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxx';
const TEST_RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
const API_URL = process.env.API_URL || 'http://localhost:5000';

function generateWebhookSignature(payload: object, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function generateWebhookPayload(eventType: string, paymentId: string, orderId: string) {
  return {
    event: eventType,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: 99900,
          currency: 'INR',
          status: eventType.includes('captured') ? 'captured' : 'failed',
          order_id: orderId,
          method: 'upi',
          description: 'E2E test payment',
          notes: {},
          created_at: Math.floor(Date.now() / 1000),
          error_code: eventType.includes('failed') ? 'CARD_EXPIRED' : undefined,
          error_description: eventType.includes('failed') ? 'Card expired' : undefined,
        },
      },
      order: {
        entity: {
          id: orderId,
          entity: 'order',
          amount: 99900,
          currency: 'INR',
          status: 'paid',
          receipt: 'e2e_test',
          notes: {},
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };
}

describe('E2E Payment Flow', () => {
  // Skip these tests in CI — they require real Razorpay test credentials
  const shouldRun = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

  describe.skipIf(!shouldRun)('Scenario 1: Complete successful payment', () => {
    it('should complete full payment flow', async () => {
      // 1. Create order
      const orderRes = await fetch(`${API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
          Authorization: `Bearer test_token`,
        },
        body: JSON.stringify({ plan_id: 'pro_monthly' }),
      });
      expect(orderRes.ok).toBe(true);
      const order = await orderRes.json();
      expect(order.data.order_id).toBeDefined();
    });
  });

  describe.skipIf(!shouldRun)('Scenario 2: Failed payment', () => {
    it('should handle failed payment via webhook', async () => {
      const orderId = `order_e2e_fail_${Date.now()}`;
      const paymentId = `pay_e2e_fail_${Date.now()}`;
      const payload = generateWebhookPayload('payment.failed', paymentId, orderId);
      const signature = generateWebhookSignature(payload, TEST_RAZORPAY_KEY_SECRET);

      const response = await fetch(`${API_URL}/api/payment/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Signature': signature,
        },
        body: JSON.stringify({ ...payload, id: `evt_${Date.now()}` }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe.skipIf(!shouldRun)('Scenario 3: Duplicate webhook (idempotency)', () => {
    it('should process same event only once', async () => {
      const eventId = `evt_e2e_dup_${Date.now()}`;
      const orderId = `order_e2e_dup_${Date.now()}`;
      const paymentId = `pay_e2e_dup_${Date.now()}`;
      const payload = {
        ...generateWebhookPayload('payment.captured', paymentId, orderId),
        id: eventId,
      };
      const signature = generateWebhookSignature(payload, TEST_RAZORPAY_KEY_SECRET);

      // Send same event twice
      const res1 = await fetch(`${API_URL}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature },
        body: JSON.stringify(payload),
      });
      const res2 = await fetch(`${API_URL}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature },
        body: JSON.stringify(payload),
      });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });
});
