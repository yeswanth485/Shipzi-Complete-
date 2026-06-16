// All database operations for payments table.

import { supabase, executeQuery } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { PaymentRecord } from '../types/payment.types';
import { CreatePaymentData } from '../interfaces/repositories.interface';

const logger = createChildLogger('payment-repository');

export const paymentRepository = {
  async create(data: CreatePaymentData): Promise<PaymentRecord> {
    logger.debug('Creating payment', { orderId: data.razorpay_order_id });
    return executeQuery(() =>
      supabase.from('payments').insert(data).select().single()
    );
  },

  async findById(id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by ID', { id });
    const result = await executeQuery(() =>
      supabase.from('payments').select('*').eq('id', id).is('deleted_at', null).single()
    );
    return result || null;
  },

  async findByOrderId(razorpay_order_id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by order ID', { razorpay_order_id });
    const result = await executeQuery(() =>
      supabase.from('payments').select('*').eq('razorpay_order_id', razorpay_order_id).single()
    );
    return result || null;
  },

  async findByPaymentId(razorpay_payment_id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by Razorpay payment ID', { razorpay_payment_id });
    const result = await executeQuery(() =>
      supabase.from('payments').select('*').eq('razorpay_payment_id', razorpay_payment_id).single()
    );
    return result || null;
  },

  async findByIdempotencyKey(key: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by idempotency key', { key });
    const result = await executeQuery(() =>
      supabase.from('payments').select('*').eq('idempotency_key', key).single()
    );
    return result || null;
  },

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}): Promise<PaymentRecord> {
    logger.debug('Updating payment status', { id, status });
    return executeQuery(() =>
      supabase.from('payments').update({ status, ...extra }).eq('id', id).select().single()
    );
  },

  async findByUserId(user_id: string, page: number, limit: number): Promise<{ data: PaymentRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const countResult = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .is('deleted_at', null);

    const total = countResult.count || 0;

    const data = await executeQuery(() =>
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', user_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    return { data: data || [], total };
  },

  async findByUserIdFiltered(
    user_id: string,
    page: number,
    limit: number,
    status?: string
  ): Promise<{ data: PaymentRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching payment history', { error: error.message });
      throw new Error(`Database error: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  },

  async markCaptured(
    id: string,
    razorpay_payment_id: string,
    signature: string,
    payment_method?: string
  ): Promise<PaymentRecord> {
    logger.debug('Marking payment captured', { id });
    return executeQuery(() =>
      supabase
        .from('payments')
        .update({
          status: 'paid',
          razorpay_payment_id,
          razorpay_signature: signature,
          payment_method: payment_method || null,
          captured_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  async markFailed(id: string, error_code: string, error_description: string): Promise<PaymentRecord> {
    logger.debug('Marking payment failed', { id, error_code });
    return executeQuery(() =>
      supabase
        .from('payments')
        .update({
          status: 'failed',
          error_code,
          error_description,
          failed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    );
  },
};
