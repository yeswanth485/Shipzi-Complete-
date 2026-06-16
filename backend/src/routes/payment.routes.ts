// Define all routes with proper middleware chain.

import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { paymentRateLimit, webhookRateLimit } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { webhookBodyParser } from '../middlewares/webhook.middleware';
import {
  createOrderSchema,
  verifyPaymentSchema,
  refundSchema,
  getPaymentSchema,
  paymentHistorySchema,
} from '../validators/payment.validators';

const router = Router();

// Webhook route — NO auth, NO standard rate limit, uses raw body parser
router.post(
  '/webhook',
  webhookRateLimit,
  webhookBodyParser,
  paymentController.webhookHandler
);

// All other routes require authentication
router.use(authenticateUser);

// Create order
router.post(
  '/create-order',
  paymentRateLimit,
  validate(createOrderSchema),
  paymentController.createOrder
);

// Verify payment
router.post(
  '/verify',
  paymentRateLimit,
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

// Refund
router.post(
  '/refund',
  paymentRateLimit,
  validate(refundSchema),
  paymentController.refundPayment
);

// Payment history — MUST be before /:id to avoid route conflict
router.get(
  '/history',
  validate(paymentHistorySchema),
  paymentController.getPaymentHistory
);

// Get payment by ID
router.get(
  '/:id',
  validate(getPaymentSchema),
  paymentController.getPayment
);

export default router;
