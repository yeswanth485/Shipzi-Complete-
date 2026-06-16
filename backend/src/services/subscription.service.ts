// Extend Shipzi's payment system with subscriptions.

import { razorpay } from '../config/razorpay';
import { supabase } from '../config/supabase';
import { auditRepository } from '../repositories/audit.repository';
import { createChildLogger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';
import { AUDIT_ACTIONS } from '../constants/payment.constants';
import { SUBSCRIPTION_PLANS } from '../constants/plans.constants';

const logger = createChildLogger('subscription-service');

export const subscriptionService = {
  async createSubscription(userId: string, planId: string): Promise<Record<string, unknown>> {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new AppError(`Unknown plan: ${planId}`, 400);
    }

    // Create Razorpay subscription
    const subscription = await (razorpay.subscriptions as any).create({
      plan_id: plan.razorpay_plan_id,
      total_count: plan.interval === 'annual' ? 12 : 1,
      quantity: 1,
      customer_notify: 1,
      notes: { user_id: userId, plan_id: planId },
    });

    // Store in DB
    const { data: record, error: insertError } = await supabase.from('subscriptions').insert({
      user_id: userId,
      razorpay_subscription_id: subscription.id,
      plan_id: planId,
      status: 'created',
      quantity: 1,
      metadata: { razorpay_response: subscription },
    }).select().single();

    if (insertError) throw new Error(`Database error: ${insertError.message}`);

    await auditRepository.log({
      user_id: userId,
      actor: userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
      entity_type: 'subscription',
      entity_id: (record as any).id,
      new_data: { plan_id: planId, razorpay_subscription_id: subscription.id },
    });

    logger.info('Subscription created', { userId, planId, subscriptionId: subscription.id });
    return { subscription_id: subscription.id, status: 'created' };
  },

  async cancelSubscription(userId: string, subscriptionId: string, cancelAtEnd: boolean): Promise<void> {
    const { data: record } = await supabase.from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (!record) {
      throw new AppError('Subscription not found', 404);
    }

    const sub = record as any;
    if (sub.status !== 'active' && sub.status !== 'authenticated') {
      throw new AppError(`Cannot cancel subscription in '${sub.status}' status`, 400);
    }

    if (cancelAtEnd) {
      await supabase.from('subscriptions')
        .update({ cancel_at_end: true, cancelled_at: new Date().toISOString() })
        .eq('id', subscriptionId);
    } else {
      await (razorpay.subscriptions as any).cancel(sub.razorpay_subscription_id);

      await supabase.from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);
    }

    await auditRepository.log({
      user_id: userId,
      actor: userId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      entity_type: 'subscription',
      entity_id: subscriptionId,
      new_data: { cancel_at_end: cancelAtEnd },
    });

    logger.info('Subscription cancelled', { subscriptionId, cancelAtEnd });
  },

  async handleSubscriptionWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
    const subEntity = (payload as any)?.subscription?.entity;
    if (!subEntity) {
      logger.warn('Subscription webhook: missing subscription entity');
      return;
    }

    const razorpaySubId = subEntity.id;

    const { data: record } = await supabase.from('subscriptions')
      .select('*')
      .eq('razorpay_subscription_id', razorpaySubId)
      .single();

    if (!record) {
      logger.warn('Subscription not found for webhook', { razorpaySubId });
      return;
    }

    const sub = record as any;

    switch (event) {
      case 'subscription.charged':
        await supabase.from('subscriptions')
          .update({
            status: 'active',
            current_start: new Date(subEntity.current_start * 1000).toISOString(),
            current_end: new Date(subEntity.current_end * 1000).toISOString(),
          })
          .eq('id', sub.id);
        logger.info('Subscription charged', { subscriptionId: sub.id });
        break;

      case 'subscription.cancelled':
        await supabase.from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', sub.id);
        logger.info('Subscription cancelled via webhook', { subscriptionId: sub.id });
        break;

      case 'subscription.completed':
        await supabase.from('subscriptions')
          .update({ status: 'completed' })
          .eq('id', sub.id);
        logger.info('Subscription completed', { subscriptionId: sub.id });
        break;

      case 'subscription.paused':
        await supabase.from('subscriptions')
          .update({ status: 'paused' })
          .eq('id', sub.id);
        logger.info('Subscription paused', { subscriptionId: sub.id });
        break;

      default:
        logger.info('Unhandled subscription event', { event });
    }
  },
};
