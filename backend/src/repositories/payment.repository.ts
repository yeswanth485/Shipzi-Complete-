// All database operations for payments table.

import { supabase } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { PaymentRecord } from '../types/payment.types';
import { CreatePaymentData } from '../interfaces/repositories.interface';

const logger = createChildLogger('payment-repository');

export const paymentRepository = {
  async create(data: CreatePaymentData): Promise<PaymentRecord> {
    logger.debug('Creating payment', { orderId: data.razorpay_order_id });
    const { data: result, error } = await supabase.from('payments').insert(data).select().single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return result as PaymentRecord;
  },

  async findById(id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by ID', { id });
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).is('deleted_at', null).single();
    if (error) return null;
    return data as PaymentRecord;
  },

  async findByOrderId(razorpay_order_id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by order ID', { razorpay_order_id });
    const { data, error } = await supabase.from('payments').select('*').eq('razorpay_order_id', razorpay_order_id).single();
    if (error) return null;
    return data as PaymentRecord;
  },

  async findByPaymentId(razorpay_payment_id: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by Razorpay payment ID', { razorpay_payment_id });
    const { data, error } = await supabase.from('payments').select('*').eq('razorpay_payment_id', razorpay_payment_id).single();
    if (error) return null;
    return data as PaymentRecord;
  },

  async findByIdempotencyKey(key: string): Promise<PaymentRecord | null> {
    logger.debug('Finding payment by idempotency key', { key });
    const { data, error } = await supabase.from('payments').select('*').eq('idempotency_key', key).single();
    if (error) return null;
    return data as PaymentRecord;
  },

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}): Promise<PaymentRecord> {
    logger.debug('Updating payment status', { id, status });
    const { data, error } = await supabase.from('payments').update({ status, ...extra }).eq('id', id).select().single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return data as PaymentRecord;
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

    return { data: (data as PaymentRecord[]) || [], total: count || 0 };
  },

  async markCaptured(
    id: string,
    razorpay_payment_id: string,
    signature: string,
    payment_method?: string
  ): Promise<PaymentRecord> {
    logger.debug('Marking payment captured', { id });
    const { data, error } = await supabase
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
      .single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return data as PaymentRecord;
  },

  async markFailed(id: string, error_code: string, error_description: string): Promise<PaymentRecord> {
    logger.debug('Marking payment failed', { id, error_code });
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        error_code,
        error_description,
        failed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return data as PaymentRecord;
  },
};
