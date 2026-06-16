// All payment-related constants.

export const PAYMENT_STATUS = {
  CREATED: 'created',
  ATTEMPTED: 'attempted',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const EVENT_TYPES = {
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_DISPUTED: 'payment.disputed',
  PAYMENT_REFUNDED: 'payment.refunded',
  ORDER_PAID: 'order.paid',
  ORDER_FAILED: 'order.failed',
  REFUND_CREATED: 'refund.created',
  REFUND_PROCESSED: 'refund.processed',
  REFUND_FAILED: 'refund.failed',
  SUBSCRIPTION_AUTHENTICATED: 'subscription.authenticated',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CHARGED: 'subscription.charged',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_COMPLETED: 'subscription.completed',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
} as const;

export const AUDIT_ACTIONS = {
  PAYMENT_ORDER_CREATED: 'PAYMENT_ORDER_CREATED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  SIGNATURE_VALID: 'SIGNATURE_VALID',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  REFUND_FAILED: 'REFUND_FAILED',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED: 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',
  WEBHOOK_PAYMENT_CAPTURED: 'WEBHOOK_PAYMENT_CAPTURED',
  WEBHOOK_PAYMENT_FAILED: 'WEBHOOK_PAYMENT_FAILED',
  CREDIT_GRANTED: 'CREDIT_GRANTED',
  CREDIT_DEDUCTED: 'CREDIT_DEDUCTED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
} as const;

export const CURRENCY = 'INR';

export const MIN_PAYMENT_AMOUNT = 100; // ₹1 in paise
export const MAX_PAYMENT_AMOUNT = 10000000; // ₹1,00,000 in paise

export const REFUND_REASONS = [
  'Duplicate payment',
  'Order cancelled by customer',
  'Product/service not delivered',
  'Quality issue',
  'Billing error',
  'Other',
] as const;

export const CREDIT_TYPES = {
  PURCHASE: 'purchase',
  DEDUCTION: 'deduction',
  REFUND: 'refund',
  ADMIN_GRANT: 'admin_grant',
  ADMIN_DEDUCT: 'admin_deduct',
  EXPIRY: 'expiry',
} as const;

export const REFUND_STATUS = {
  INITIATED: 'initiated',
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export const REFUND_TYPE = {
  FULL: 'full',
  PARTIAL: 'partial',
} as const;

export const SUBSCRIPTION_STATUS = {
  CREATED: 'created',
  AUTHENTICATED: 'authenticated',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;
