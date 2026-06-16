// Webhook event deduplication and persistence.

import { supabase, executeQuery } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { WebhookEventData } from '../interfaces/repositories.interface';

const logger = createChildLogger('webhook-repository');

export const webhookRepository = {
  async findByEventId(event_id: string): Promise<{ id: string; status: string; retry_count: number } | null> {
    const result = await executeQuery(() =>
      supabase
        .from('payment_events')
        .select('id, status, retry_count')
        .eq('event_id', event_id)
        .single()
    );
    return result || null;
  },

  async create(data: WebhookEventData): Promise<{ id: string }> {
    logger.debug('Persisting webhook event', { event_id: data.event_id, event_type: data.event_type });
    return executeQuery(() =>
      supabase.from('payment_events').insert(data).select('id').single()
    );
  },

  async markProcessed(id: string): Promise<void> {
    await executeQuery(() =>
      supabase
        .from('payment_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', id)
    );
  },

  async markFailed(id: string, error_message: string): Promise<void> {
    await executeQuery(() =>
      supabase
        .from('payment_events')
        .update({ status: 'failed', error_message })
        .eq('id', id)
    );
  },

  async markDeadLetter(id: string): Promise<void> {
    logger.warn('Moving webhook to dead letter', { id });
    await executeQuery(() =>
      supabase
        .from('payment_events')
        .update({ status: 'dead_letter' })
        .eq('id', id)
    );
  },

  async updateRetryCount(id: string): Promise<void> {
    const event = await executeQuery(() =>
      supabase.from('payment_events').select('retry_count').eq('id', id).single()
    );
    const currentCount = (event as { retry_count: number }).retry_count || 0;
    await executeQuery(() =>
      supabase
        .from('payment_events')
        .update({ retry_count: currentCount + 1 })
        .eq('id', id)
    );
  },
};
