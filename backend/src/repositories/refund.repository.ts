// All database operations for refunds table.

import { supabase, executeQuery } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { RefundRecord } from '../types/payment.types';
import { CreateRefundData } from '../interfaces/repositories.interface';

const logger = createChildLogger('refund-repository');

export const refundRepository = {
  async create(data: CreateRefundData): Promise<RefundRecord> {
    logger.debug('Creating refund', { payment_id: data.payment_id });
    return executeQuery(() =>
      supabase.from('refunds').insert(data).select().single()
    );
  },

  async findById(id: string): Promise<RefundRecord | null> {
    logger.debug('Finding refund by ID', { id });
    const result = await executeQuery(() =>
      supabase.from('refunds').select('*').eq('id', id).is('deleted_at', null).single()
    );
    return result || null;
  },

  async findByPaymentId(payment_id: string): Promise<RefundRecord[]> {
    logger.debug('Finding refunds by payment ID', { payment_id });
    const result = await executeQuery(() =>
      supabase
        .from('refunds')
        .select('*')
        .eq('payment_id', payment_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    );
    return result || [];
  },

  async findByRazorpayRefundId(razorpay_refund_id: string): Promise<RefundRecord | null> {
    logger.debug('Finding refund by Razorpay refund ID', { razorpay_refund_id });
    const result = await executeQuery(() =>
      supabase.from('refunds').select('*').eq('razorpay_refund_id', razorpay_refund_id).single()
    );
    return result || null;
  },

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}): Promise<RefundRecord> {
    logger.debug('Updating refund status', { id, status });
    return executeQuery(() =>
      supabase.from('refunds').update({ status, ...extra }).eq('id', id).select().single()
    );
  },

  async getTotalRefundedAmount(payment_id: string): Promise<number> {
    const result = await executeQuery(() =>
      supabase
        .from('refunds')
        .select('amount')
        .eq('payment_id', payment_id)
        .eq('status', 'processed')
    );
    const refunds = result as { amount: number }[];
    return refunds.reduce((sum, r) => sum + r.amount, 0);
  },
};
