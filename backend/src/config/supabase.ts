// Initialize Supabase client with service role key for backend use.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from './env';
import { logger } from './logger';

export const supabase: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await queryFn();
  if (error) {
    logger.error('Supabase query error', { error: error.message, code: error.code });
    throw new Error(`Database error: ${error.message}`);
  }
  return data as T;
}
