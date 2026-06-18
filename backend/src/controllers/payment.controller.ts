// HTTP layer only. No business logic. Calls service and formats response.

import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { refundService } from '../services/refund.service';
import { webhookService } from '../services/webhook.service';
import { createChildLogger } from '../config/logger';
import { WebhookRequest } from '../middlewares/webhook.middleware';

const logger = createChildLogger('payment-controller');

export const paymentController = {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { plan_id } = req.body;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      if (!idempotencyKey) {
        res.status(400).json({ success: false, error: 'X-Idempotency-Key header is required' });
        return;
      }

      const result = await paymentService.createOrder(
        userId,
        plan_id,
        idempotencyKey,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Order created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await paymentService.verifyAndCapturePayment(
        userId,
        req.body,
        req.ip,
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
      );

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await refundService.initiateRefund(
        userId,
        req.body,
        req.ip,
        typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
      );

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  async webhookHandler(req: WebhookRequest, res: Response): Promise<void> {
    try {
      const rawBody = req.rawBody;
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!rawBody || !signature) {
        logger.warn('Webhook missing body or signature');
        // Return 200 to prevent Razorpay from retrying on malformed requests
        res.status(200).json({ status: 'ok' });
        return;
      }

      await webhookService.processWebhook(rawBody, signature, req.body);

      // Return 200 on success
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('Webhook handler error', { error: (error as Error).message });
      // Return 500 on processing errors so Razorpay retries
      res.status(500).json({ status: 'error' });
    }
  },

  async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const payment = await paymentService.getPayment(userId, id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await paymentService.getPaymentHistory(userId, page, limit, status);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
