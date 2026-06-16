// Process incoming Razorpay webhook events.

import { razorpayService } from './razorpay.service';
import { paymentRepository } from '../repositories/payment.repository';
import { webhookRepository } from '../repositories/webhook.repository';
import { auditRepository } from '../repositories/audit.repository';
import { refundService } from './refund.service';
import { createChildLogger } from '../config/logger';
import { AUDIT_ACTIONS } from '../constants/payment.constants';
import { WebhookPayload } from '../types/payment.types';

const logger = createChildLogger('webhook-service');

const MAX_RETRIES = 3;

export const webhookService = {
  async processWebhook(
    rawBody: Buffer,
    signature: string,
    payload: WebhookPayload
  ): Promise<void> {
    const eventType = payload.event;
    const eventId = (payload as any).id as string;

    logger.info('Processing webhook', { eventType, eventId });

    // Step 1: Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Invalid webhook signature — rejecting', { eventId });
      // Still return 200 to Razorpay — don't reveal failures
      return;
    }

    // Step 2: Check event_id for deduplication
    const existingEvent = eventId ? await webhookRepository.findByEventId(eventId) : null;
    if (existingEvent) {
      if (existingEvent.status === 'processed') {
        logger.info('Duplicate webhook event — skipping', { eventId });
        return;
      }
      if (existingEvent.status === 'dead_letter') {
        logger.warn('Event is in dead letter — skipping', { eventId });
        return;
      }
    }

    // Step 3: Persist event
    const eventRecord = await webhookRepository.create({
      event_id: eventId || `evt_${Date.now()}`,
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      status: 'processing',
    });

    // Step 4: Route to handler
    try {
      switch (eventType) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;
        case 'order.paid':
          await this.handleOrderPaid(payload);
          break;
        case 'refund.processed':
        case 'refund.created':
          await this.handleRefundEvent(payload);
          break;
        default:
          logger.info('Unhandled webhook event type', { eventType });
      }

      // Step 5: Mark processed
      await webhookRepository.markProcessed(eventRecord.id);

      await auditRepository.log({
        actor: 'webhook',
        action: AUDIT_ACTIONS.WEBHOOK_PROCESSED,
        entity_type: 'payment',
        entity_id: eventRecord.id as any,
        new_data: { event_type: eventType },
      });
    } catch (error) {
      logger.error('Webhook processing failed', { eventId, error: (error as Error).message });

      await webhookRepository.markFailed(eventRecord.id, (error as Error).message);

      const refreshedEvent = await webhookRepository.findByEventId(eventId || eventRecord.id);
      const retryCount = refreshedEvent ? (refreshedEvent as any).retry_count || 0 : 0;

      await webhookRepository.updateRetryCount(eventRecord.id);

      // Dead letter after max retries
      if (retryCount >= MAX_RETRIES) {
        await webhookRepository.markDeadLetter(eventRecord.id);
        logger.error('Webhook moved to dead letter', { eventId });
      }

      await auditRepository.log({
        actor: 'webhook',
        action: AUDIT_ACTIONS.WEBHOOK_FAILED,
        entity_type: 'payment',
        entity_id: eventRecord.id as any,
        new_data: { event_type: eventType, error: (error as Error).message },
      });
    }
  },

  async handlePaymentCaptured(payload: WebhookPayload): Promise<void> {
    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      logger.warn('payment.captured: missing payment entity');
      return;
    }

    const payment = await paymentRepository.findByOrderId(paymentEntity.order_id);
    if (!payment) {
      logger.warn('payment.captured: payment not found for order', { orderId: paymentEntity.order_id });
      return;
    }

    await paymentRepository.markCaptured(
      payment.id,
      paymentEntity.id,
      '', // Signature not available in webhook
      paymentEntity.method
    );

    await auditRepository.log({
      user_id: payment.user_id,
      actor: 'webhook',
      action: AUDIT_ACTIONS.WEBHOOK_PAYMENT_CAPTURED,
      entity_type: 'payment',
      entity_id: payment.id,
      new_data: { razorpay_payment_id: paymentEntity.id, method: paymentEntity.method },
    });

    logger.info('Payment captured via webhook', { paymentId: payment.id });
  },

  async handlePaymentFailed(payload: WebhookPayload): Promise<void> {
    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      logger.warn('payment.failed: missing payment entity');
      return;
    }

    const payment = await paymentRepository.findByOrderId(paymentEntity.order_id);
    if (!payment) {
      logger.warn('payment.failed: payment not found for order', { orderId: paymentEntity.order_id });
      return;
    }

    await paymentRepository.markFailed(
      payment.id,
      paymentEntity.error_code || 'UNKNOWN',
      paymentEntity.error_description || 'Payment failed'
    );

    await auditRepository.log({
      user_id: payment.user_id,
      actor: 'webhook',
      action: AUDIT_ACTIONS.WEBHOOK_PAYMENT_FAILED,
      entity_type: 'payment',
      entity_id: payment.id,
      new_data: { error_code: paymentEntity.error_code, error_description: paymentEntity.error_description },
    });

    logger.info('Payment failed via webhook', { paymentId: payment.id });
  },

  async handleOrderPaid(payload: WebhookPayload): Promise<void> {
    const orderEntity = payload.payload.order?.entity;
    if (!orderEntity) {
      logger.warn('order.paid: missing order entity');
      return;
    }

    const payment = await paymentRepository.findByOrderId(orderEntity.id);
    if (payment && payment.status !== 'paid') {
      await paymentRepository.updateStatus(payment.id, 'paid');
    }

    logger.info('Order paid via webhook', { orderId: orderEntity.id });
  },

  async handleRefundEvent(payload: WebhookPayload): Promise<void> {
    const refundEntity = payload.payload.refund?.entity;
    if (!refundEntity) {
      logger.warn('refund event: missing refund entity');
      return;
    }

    await refundService.handleRefundWebhook(refundEntity as unknown as Record<string, unknown>);
  },
};
