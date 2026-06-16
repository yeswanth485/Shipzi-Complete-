// Zod schemas for all payment endpoints.

import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    plan_id: z.string().min(1, 'plan_id is required'),
    description: z.string().max(500).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
    razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
    razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const refundSchema = z.object({
  body: z.object({
    payment_id: z.string().uuid('payment_id must be a valid UUID'),
    amount: z.number().int().positive('amount must be a positive integer').optional(),
    reason: z.string().min(1, 'reason is required').max(255),
    type: z.enum(['full', 'partial']),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const getPaymentSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().uuid('id must be a valid UUID'),
  }),
});

export const paymentHistorySchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.string().optional(),
  }),
  params: z.object({}).passthrough(),
});
