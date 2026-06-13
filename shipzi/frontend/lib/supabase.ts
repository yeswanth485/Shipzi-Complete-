import { createClient } from '@supabase/supabase-js'
import type { CatalogBox, OptimizedOrderRow } from './types'

// BUG-007 FIX: Build-safe Supabase initialization
// During Vercel build, env vars may not be available.
// We only create a real client when both URL and key are present.
// Otherwise, we use a plain no-op object that never throws.

// Helper: creates a plain no-op client (no createClient call, no Proxy)
// Used when env vars are missing during build or when createClient throws
function createNoopClient() {
  if (typeof window !== 'undefined') {
    console.warn('[Shipzi] Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  const NOOP_RESULT = { data: null, error: null, count: null }

  // Proxy-based chainable: any method call returns itself (for chaining)
  // and it's thenable so `await supabase.from('x').select().eq(...)` resolves to NOOP_RESULT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeChainable(): any {
    return new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === 'then') {
          // Make the chainable thenable so `await` resolves to NOOP_RESULT
          return (resolve: (v: unknown) => void) => resolve(NOOP_RESULT)
        }
        if (prop === Symbol.toPrimitive) return () => ''
        if (prop === Symbol.iterator) return undefined
        // Any method call returns another chainable for further chaining
        return (..._args: unknown[]) => makeChainable()
      },
      apply(_target, _thisArg, _args) {
        return makeChainable()
      },
    })
  }

  return {
    from: (_table?: string) => makeChainable(),
    channel: (_name?: string) => ({
      on: (_event?: string, _filter?: object, _callback?: Function) => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: (_channel?: unknown) => Promise.resolve({ error: null }),
    storage: {
      from: (_bucket?: string) => ({
        upload: (_path?: string, _file?: unknown, _opts?: object) => Promise.resolve({ data: null, error: null }),
        getPublicUrl: (_path?: string) => ({ data: { publicUrl: '' } }),
        list: (_prefix?: string) => Promise.resolve({ data: [], error: null }),
        remove: (_paths?: string[]) => Promise.resolve({ data: null, error: null }),
      }),
    },
    rpc: (_fn?: string, _params?: object) => Promise.resolve({ data: null, error: null, count: null }),
    auth: {
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChanged: (_cb?: Function) => () => {},
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    supabase = createClient(url, key)
  } else {
    supabase = createNoopClient()
  }
} catch (e) {
  // Safety net: if createClient throws (e.g. invalid URL), use no-op
  console.warn('[Shipzi] Supabase init failed:', e)
  supabase = createNoopClient()
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
