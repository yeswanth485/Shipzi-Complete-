import { createClient } from "@supabase/supabase-js"
import type { CatalogBox, OptimizedOrderRow } from "./types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "")

export { supabase }

export type { CatalogBox, OptimizedOrderRow }

export interface UserProfile {
  uid: string
  email: string
  display_name: string | null
  photo_url: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("uid", uid)
      .maybeSingle()

    if (error) {
      console.error("[Supabase] getProfile error:", error.message, error.code)
      return null
    }
    return (data as UserProfile) || null
  } catch (e) {
    console.error("[Supabase] getProfile exception:", e)
    return null
  }
}

export async function upsertProfile(
  uid: string,
  email: string,
  displayName: string | null,
  photoUrl: string | null
): Promise<UserProfile | null> {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          uid,
          email,
          display_name: displayName,
          photo_url: photoUrl,
          updated_at: now,
        },
        { onConflict: "uid", ignoreDuplicates: false }
      )
      .select()
      .maybeSingle()

    if (error) {
      console.error("[Supabase] upsertProfile error:", error.message, error.code)
      return null
    }
    return (data as UserProfile) || null
  } catch (e) {
    console.error("[Supabase] upsertProfile exception:", e)
    return null
  }
}

export async function completeOnboarding(uid: string): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
    .eq("uid", uid)

  if (error) throw error
}

// ── Re-export existing row types used across the app ────────────────

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
  status: "pending" | "processing" | "complete" | "failed"
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
  plan: "free" | "growth" | "enterprise"
  status: string
  monthly_shipment_limit: number | null
  current_usage: number
  billing_cycle_start: string | null
  billing_cycle_end: string | null
  created_at: string
}
