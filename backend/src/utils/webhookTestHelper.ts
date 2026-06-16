// Helper for local webhook testing with ngrok.

import crypto from 'crypto';

export function generateWebhookPayload(eventType: string, paymentId: string, orderId: string) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
          description: 'Test payment',
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
          receipt: 'test',
          notes: {},
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };
}

export function generateWebhookSignature(payload: object, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * NGROK SETUP INSTRUCTIONS:
 *
 * 1. Install ngrok: npm install -g ngrok
 * 2. Start your backend: npm run dev (on port 5000)
 * 3. Start ngrok: ngrok http 5000
 * 4. Copy the https URL (e.g., https://abc123.ngrok-free.app)
 * 5. Go to Razorpay Dashboard → Settings → Webhooks
 * 6. Add webhook URL: https://abc123.ngrok-free.app/api/payment/webhook
 * 7. Select events: payment.captured, payment.failed, refund.processed
 * 8. Copy the webhook secret
 * 9. Set RAZORPAY_WEBHOOK_SECRET in your .env
 *
 * TEST WITH CURL:
 * ```bash
 * PAYLOAD='{"event":"payment.captured","id":"evt_test_123","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_123","amount":99900,"currency":"INR","status":"captured","method":"upi"}}}}'
 * SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your_webhook_secret" | awk '{print $2}')
 * curl -X POST http://localhost:5000/api/payment/webhook \
 *   -H "Content-Type: application/json" \
 *   -H "X-Razorpay-Signature: $SIGNATURE" \
 *   -d "$PAYLOAD"
 * ```
 */
export const WEBHOOK_TESTING_INSTRUCTIONS = `
SETUP:
1. Start backend: cd backend && npm run dev
2. Start ngrok: ngrok http 5000
3. Copy https URL → Razorpay Dashboard → Webhooks
4. Set webhook secret in .env

TEST EVENTS:
- payment.captured → payment should be marked as paid
- payment.failed → payment should be marked as failed
- refund.processed → refund should be marked as processed
`;
