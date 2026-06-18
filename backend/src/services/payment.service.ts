// Core business logic for payments. Orchestrates repositories and Razorpay service.

import { paymentRepository } from '../repositories/payment.repository';
import { auditRepository } from '../repositories/audit.repository';
import { razorpayService } from './razorpay.service';
import { createChildLogger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';
import { AUDIT_ACTIONS, CURRENCY, MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT } from '../constants/payment.constants';
import { CreateOrderResponse, VerifyPaymentRequest, VerifyPaymentResponse, PaymentRecord, PaginatedResponse } from '../types/payment.types';
import { supabase } from '../config/supabase';
import { CONFIG } from '../config/env';

const logger = createChildLogger('payment-service');

const PLAN_AMOUNTS: Record<string, number> = {
  // Shipzi subscription plans (UI prices)
  pro: 249900,
  enterprise: 999900,
  pro_annual: 199900,
  enterprise_annual: 799900,
  // Legacy credit-based plans
  basic_monthly: 49900,
  pro_monthly: 99900,
  basic_annual: 499900,
  pro_annual_legacy: 999900,
  starter_pack: 9900,
  growth_pack: 29900,
  enterprise_pack: 99900,
};

// Map plan ID to subscription plan name
function getSubscriptionPlan(planId: string): 'growth' | 'enterprise' {
  if (planId === 'enterprise' || planId === 'enterprise_annual' || planId === 'enterprise_pack') {
    return 'enterprise';
  }
  return 'growth';
}

export const paymentService = {
  async createOrder(
    userId: string,
    planId: string,
    idempotencyKey: string,
    ip?: string,
    userAgent?: string
  ): Promise<CreateOrderResponse> {
    // CHECK idempotency — bound to user to prevent cross-user replay
    const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey, userId);
    if (existing) {
      logger.info('Returning existing order for idempotency key', { idempotencyKey });
      return {
        order_id: existing.razorpay_order_id,
        amount: existing.amount,
        currency: existing.currency,
        key_id: CONFIG.RAZORPAY_KEY_ID,
      };
    }

    // Calculate amount on backend — NEVER from frontend
    const amount = PLAN_AMOUNTS[planId];
    if (!amount) {
      throw new AppError(`Unknown plan: ${planId}`, 400);
    }

    if (amount < MIN_PAYMENT_AMOUNT || amount > MAX_PAYMENT_AMOUNT) {
      throw new AppError('Amount out of allowed range', 400);
    }

    // Create Razorpay order
    const order = await razorpayService.createOrder({
      amount,
      currency: CURRENCY,
      receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { plan_id: planId, user_id: userId },
    });

    // Insert payment record
    const payment = await paymentRepository.create({
      user_id: userId,
      razorpay_order_id: order.id,
      amount,
      currency: CURRENCY,
      status: 'created',
      description: `Payment for ${planId}`,
      notes: { plan_id: planId },
      idempotency_key: idempotencyKey,
    });

    // Audit log
    await auditRepository.log({
      user_id: userId,
      actor: userId,
      action: AUDIT_ACTIONS.PAYMENT_ORDER_CREATED,
      entity_type: 'payment',
      entity_id: payment.id,
      new_data: { razorpay_order_id: order.id, amount, plan_id: planId },
      ip_address: ip,
      user_agent: userAgent,
    });

    logger.info('Order created', { paymentId: payment.id, orderId: order.id });

    return {
      order_id: order.id,
      amount,
      currency: CURRENCY,
      key_id: CONFIG.RAZORPAY_KEY_ID,
    };
  },

  async verifyAndCapturePayment(
    userId: string,
    request: VerifyPaymentRequest,
    ip?: string,
    userAgent?: string
  ): Promise<VerifyPaymentResponse> {
    // Fetch payment by order ID
    const payment = await paymentRepository.findByOrderId(request.razorpay_order_id);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Verify ownership
    if (payment.user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Check status
    if (payment.status !== 'created' && payment.status !== 'attempted') {
      throw new AppError(`Payment is in '${payment.status}' state and cannot be verified`, 400);
    }

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      order_id: request.razorpay_order_id,
      payment_id: request.razorpay_payment_id,
      signature: request.razorpay_signature,
    });

    if (!isValid) {
      await paymentRepository.markFailed(payment.id, 'INVALID_SIGNATURE', 'Payment signature verification failed');
      await auditRepository.log({
        user_id: userId,
        actor: userId,
        action: AUDIT_ACTIONS.SIGNATURE_INVALID,
        entity_type: 'payment',
        entity_id: payment.id,
        ip_address: ip,
        user_agent: userAgent,
      });
      throw new AppError('Invalid payment signature', 400);
    }

    // Mark as paid
    const updatedPayment = await paymentRepository.markCaptured(
      payment.id,
      request.razorpay_payment_id,
      request.razorpay_signature
    );

    // Fetch from Razorpay to confirm
    const razorpayPayment = await razorpayService.fetchPayment(request.razorpay_payment_id);
    const paymentMethod = (razorpayPayment as any).method as string | undefined;

    if (paymentMethod) {
      await paymentRepository.updateStatus(payment.id, 'paid', { payment_method: paymentMethod });
    }

    // Audit log
    await auditRepository.log({
      user_id: userId,
      actor: userId,
      action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
      entity_type: 'payment',
      entity_id: payment.id,
      old_data: { status: payment.status },
      new_data: { status: 'paid', razorpay_payment_id: request.razorpay_payment_id },
      ip_address: ip,
      user_agent: userAgent,
    });

    logger.info('Payment verified and captured', { paymentId: payment.id });

    // Activate subscription after successful payment
    try {
      const planId = (payment.notes as Record<string, string>)?.plan_id;
      if (planId && planId !== 'starter_pack' && planId !== 'growth_pack' && planId !== 'enterprise_pack') {
        const subscriptionPlan = getSubscriptionPlan(planId);

        // Find user's company_id from users table
        const { data: userRow } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', userId)
          .single();

        if (userRow?.company_id) {
          // Check if subscription already exists
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('company_id', userRow.company_id)
            .single();

          if (existingSub) {
            // Update existing subscription
            await supabase
              .from('subscriptions')
              .update({
                plan: subscriptionPlan,
                status: 'active',
                current_usage: 0,
                monthly_shipment_limit: subscriptionPlan === 'enterprise' ? -1 : 10000,
              })
              .eq('id', existingSub.id);
          } else {
            // Create new subscription
            await supabase
              .from('subscriptions')
              .insert({
                company_id: userRow.company_id,
                plan: subscriptionPlan,
                status: 'active',
                current_usage: 0,
                monthly_shipment_limit: subscriptionPlan === 'enterprise' ? -1 : 10000,
              });
          }

          logger.info('Subscription activated', { userId, plan: subscriptionPlan, companyId: userRow.company_id });

          await auditRepository.log({
            user_id: userId,
            actor: userId,
            action: 'SUBSCRIPTION_ACTIVATED',
            entity_type: 'subscription',
            entity_id: payment.id,
            new_data: { plan: subscriptionPlan, payment_id: payment.id },
          });
        }
      }
    } catch (subErr) {
      // Non-fatal — payment succeeded but subscription update failed
      logger.error('Failed to activate subscription after payment', { error: subErr });
    }

    return {
      success: true,
      message: 'Payment verified successfully',
      payment_id: updatedPayment.id,
    };
  },

  async getPayment(userId: string, paymentId: string): Promise<PaymentRecord> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    if (payment.user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }
    return payment;
  },

  async getPaymentHistory(
    userId: string,
    page: number,
    limit: number,
    status?: string
  ): Promise<PaginatedResponse<PaymentRecord>> {
    const result = await paymentRepository.findByUserIdFiltered(userId, page, limit, status);
    return {
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  },
};
