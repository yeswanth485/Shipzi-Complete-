import { createClient } from '@supabase/supabase-js'
import type { CatalogBox, OptimizedOrderRow } from './types'

// BUG-007 FIX: Build-safe Supabase initialization
// During Vercel build, env vars may not be available.
// We only create a real client when both URL and key are present.
// Otherwise, we use a plain no-op object that never throws.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    supabase = createClient(url, key)
  } else {
    if (typeof window !== 'undefined') {
      console.warn('[Shipzi] Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
    // Plain no-op client — no Proxy, no createClient call
    const noop = () => Promise.resolve({ data: null, error: null, count: null })
    const chainable = () => ({
      select: noop, insert: noop, update: noop, upsert: noop,
      delete: noop, eq: noop, order: noop, single: noop, limit: noop,
    })
    supabase = {
      from: chainable,
      storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
      rpc: noop,
      auth: {},
    }
  }
} catch (e) {
  // Safety net: if createClient throws, use no-op
  console.warn('[Shipzi] Supabase init failed:', e)
  const noop = () => Promise.resolve({ data: null, error: null, count: null })
  const chainable = () => ({
    select: noop, insert: noop, update: noop, upsert: noop,
    delete: noop, eq: noop, order: noop, single: noop, limit: noop,
  })
  supabase = {
    from: chainable,
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    rpc: noop,
    auth: {},
  }
}

export { supabase }

// ── Re-export DB row types used across the app ────────────────────
export type { CatalogBox, OptimizedOrderRow }

export interface CompanyRow {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
  warehouse_size: string | null
  monthly_shipment_volume: number | null
  packaging_goals: string[] | null
  sustainability_goals: string[] | null
  shipping_regions: string[] | null
  created_at: string
}

export interface UserRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company_id: string | null
  onboarding_complete: boolean
  role: string
  notification_preferences: Record<string, boolean> | null
  api_key: string | null
  created_at: string
  companies: CompanyRow | null
}

export interface OptimizationRunRow {
  id: string
  company_id: string
  user_id: string
  run_name: string | null
  total_products: number | null
  total_savings_usd: number | null
  avg_utilization_pct: number | null
  status: 'pending' | 'processing' | 'complete' | 'failed'
  created_at: string
}

export interface ShipmentRow {
  id: string
  order_id: string | null
  company_id: string
  tracking_number: string | null
  carrier: string | null
  status: string
  estimated_delivery_date: string | null
  actual_delivery_date: string | null
  package_weight_kg: number | null
  packaging_details: Record<string, unknown> | null
  created_at: string
}

export interface AnalyticsSnapshotRow {
  id: string
  company_id: string
  snapshot_date: string
  total_shipments: number
  optimized_shipments: number
  total_savings_usd: number
  avg_utilization_pct: number
  optimization_rate_pct: number
  created_at: string
}

export interface SustainabilityMetricRow {
  id: string
  company_id: string
  metric_date: string
  carbon_reduction_kg: number
  packaging_waste_reduction_pct: number
  recyclable_material_pct: number
  sustainability_score: number
  created_at: string
}

export interface SubscriptionRow {
  id: string
  company_id: string
  plan: 'free' | 'growth' | 'enterprise'
  status: string
  monthly_shipment_limit: number | null
  current_usage: number
  billing_cycle_start: string | null
  billing_cycle_end: string | null
  created_at: string
}
