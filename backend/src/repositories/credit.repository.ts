// Credit transaction operations.

import { supabase } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { CreditRecord } from '../types/payment.types';
import { CreateCreditData } from '../interfaces/repositories.interface';

const logger = createChildLogger('credit-repository');

export const creditRepository = {
  async addCredits(data: CreateCreditData): Promise<CreditRecord> {
    logger.debug('Adding credits', { user_id: data.user_id, amount: data.amount });
    const { data: result, error } = await supabase.from('credits').insert(data).select().single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return result as CreditRecord;
  },

  async deductCredits(data: CreateCreditData): Promise<CreditRecord> {
    logger.debug('Deducting credits', { user_id: data.user_id, amount: data.amount });
    const { data: result, error } = await supabase.from('credits').insert({ ...data, amount: -Math.abs(data.amount) }).select().single();
    if (error) throw new Error(`Database error: ${error.message}`);
    return result as CreditRecord;
  },

  async getUserBalance(user_id: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_user_credit_balance', { p_user_id: user_id });
    if (error) return 0;
    return (data as number) || 0;
  },

  async getHistory(
    user_id: string,
    page: number,
    limit: number
  ): Promise<{ data: CreditRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('credits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    const total = count || 0;

    const { data, error } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Database error: ${error.message}`);
    return { data: (data as CreditRecord[]) || [], total };
  },
};
