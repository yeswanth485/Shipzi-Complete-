// Append-only audit log operations.

import { supabase, executeQuery } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import { AuditLogRecord } from '../types/payment.types';
import { AuditLogInput } from '../interfaces/repositories.interface';

const logger = createChildLogger('audit-repository');

export const auditRepository = {
  async log(data: AuditLogInput): Promise<AuditLogRecord> {
    logger.debug('Writing audit log', { action: data.action, entity_type: data.entity_type });
    return executeQuery(() =>
      supabase.from('audit_logs').insert(data).select().single()
    );
  },

  async findByEntity(
    entity_type: string,
    entity_id: string,
    page: number,
    limit: number
  ): Promise<{ data: AuditLogRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id);

    const total = countResult.count || 0;

    const data = await executeQuery(() =>
      supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    return { data: data || [], total };
  },

  async findByUser(
    user_id: string,
    page: number,
    limit: number
  ): Promise<{ data: AuditLogRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    const total = countResult.count || 0;

    const data = await executeQuery(() =>
      supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    return { data: data || [], total };
  },
};
