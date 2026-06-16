// Business logic for refunds.

import { paymentRepository } from '../repositories/payment.repository';
import { refundRepository } from '../repositories/refund.repository';
import { auditRepository } from '../repositories/audit.repository';
import { razorpayService } from './razorpay.service';
import { createChildLogger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';
import { AUDIT_ACTIONS, REFUND_STATUS, REFUND_TYPE } from '../constants/payment.constants';
import { RefundRequest, RefundResponse } from '../types/payment.types';

const logger = createChildLogger('refund-service');

export const refundService = {
  async initiateRefund(
    userId: string,
    request: RefundRequest,
    ip?: string,
    userAgent?: string
  ): Promise<RefundResponse> {
    // Fetch original payment
    const payment = await paymentRepository.findById(request.payment_id);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Verify ownership
    if (payment.user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Verify payment is paid
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      throw new AppError(`Cannot refund payment in '${payment.status}' status`, 400);
    }

    // Calculate refundable amount
    const alreadyRefunded = await refundRepository.getTotalRefundedAmount(payment.id);
    const refundableAmount = payment.amount - alreadyRefunded;

    if (refundableAmount <= 0) {
      throw new AppError('Payment has already been fully refunded', 400);
    }

    let refundAmount: number;
    if (request.type === REFUND_TYPE.FULL) {
      refundAmount = refundableAmount;
    } else {
      if (!request.amount || request.amount <= 0) {
        throw new AppError('Partial refund requires a positive amount', 400);
      }
      if (request.amount > refundableAmount) {
        throw new AppError(
          `Refund amount ${request.amount} exceeds refundable amount ${refundableAmount}`,
          400
        );
      }
      refundAmount = request.amount;
    }

    // Call Razorpay refund
    const razorpayRefund = await razorpayService.refundPayment(
      payment.razorpay_payment_id!,
      {
        amount: refundAmount,
        notes: { reason: request.reason, user_id: userId },
      }
    );

    // Create refund record
    const refund = await refundRepository.create({
      payment_id: payment.id,
      user_id: userId,
      amount: refundAmount,
      reason: request.reason,
      type: request.type,
      notes: { razorpay_refund_id: (razorpayRefund as any).id },
    });

    // Update Razorpay refund ID on the record
    await refundRepository.updateStatus(refund.id, REFUND_STATUS.PENDING, {
      razorpay_refund_id: (razorpayRefund as any).id,
    });

    // Update payment status
    const totalRefunded = alreadyRefunded + refundAmount;
    if (totalRefunded >= payment.amount) {
      await paymentRepository.updateStatus(payment.id, 'refunded');
    } else {
      await paymentRepository.updateStatus(payment.id, 'partially_refunded');
    }

    // Audit log
    await auditRepository.log({
      user_id: userId,
      actor: userId,
      action: AUDIT_ACTIONS.REFUND_INITIATED,
      entity_type: 'refund',
      entity_id: refund.id,
      new_data: { payment_id: payment.id, amount: refundAmount, type: request.type },
      ip_address: ip,
      user_agent: userAgent,
    });

    logger.info('Refund initiated', { refundId: refund.id, paymentId: payment.id, amount: refundAmount });

    return {
      refund_id: refund.id,
      status: REFUND_STATUS.PENDING,
      amount: refundAmount,
      message: 'Refund initiated successfully',
    };
  },

  async handleRefundWebhook(refundData: Record<string, unknown>): Promise<void> {
    const razorpayRefundId = refundData.id as string;
    const status = refundData.status as string;

    const refund = await refundRepository.findByRazorpayRefundId(razorpayRefundId);
    if (!refund) {
      logger.warn('Refund not found for webhook', { razorpayRefundId });
      return;
    }

    if (status === 'processed' || status === 'credited') {
      await refundRepository.updateStatus(refund.id, REFUND_STATUS.PROCESSED, {
        processed_at: new Date().toISOString(),
      });

      // Check if payment should be marked as fully refunded
      const payment = await paymentRepository.findById(refund.payment_id);
      if (payment) {
        const totalRefunded = await refundRepository.getTotalRefundedAmount(payment.id);
        if (totalRefunded >= payment.amount) {
          await paymentRepository.updateStatus(payment.id, 'refunded');
        } else {
          await paymentRepository.updateStatus(payment.id, 'partially_refunded');
        }
      }

      await auditRepository.log({
        user_id: refund.user_id,
        actor: 'webhook',
        action: AUDIT_ACTIONS.REFUND_PROCESSED,
        entity_type: 'refund',
        entity_id: refund.id,
        new_data: { status: 'processed' },
      });
    } else if (status === 'failed') {
      await refundRepository.updateStatus(refund.id, REFUND_STATUS.FAILED, {
        failed_at: new Date().toISOString(),
      });

      await auditRepository.log({
        user_id: refund.user_id,
        actor: 'webhook',
        action: AUDIT_ACTIONS.REFUND_FAILED,
        entity_type: 'refund',
        entity_id: refund.id,
        new_data: { status: 'failed' },
      });
    }

    logger.info('Refund webhook processed', { razorpayRefundId, status });
  },
};
