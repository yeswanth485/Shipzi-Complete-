// =============================================
// SHIPZI — Central TypeScript types
// All field names match the DB schema exactly
// =============================================

// ── CSV input row (exactly what the user uploads) ──
export interface CSVRow {
  product_name: string
  product_length: string
  product_width: string
  product_height: string
  used_box_length: string
  used_box_width: string
  used_box_height: string
  fragility_score: string
  used_box_price: string
  shipping_zone: string
  // optional extras
  quantity?: string
  weight_kg?: string
  // multi-product fields (pipe-separated)
  order_id?: string
  product_names?: string
  product_lengths?: string
  product_widths?: string
  product_heights?: string
  product_fragilities?: string
}

// ── Multi-product spec (parsed from pipe-separated fields) ──
export interface ProductSpec {
  name: string
  length: number
  width: number
  height: number
  fragility: number
}

// ── Parsed & validated product row ──
export interface ParsedProduct {
  product_name: string
  product_length: number
  product_width: number
  product_height: number
  used_box_length: number
  used_box_width: number
  used_box_height: number
  fragility_score: number        // 0–10
  used_box_price: number         // cost of the box the user currently uses
  shipping_zone: string
  quantity: number
  weight_kg: number
  row_index: number              // 0-based row in CSV (for error reporting)
  warnings?: string[]            // non-fatal warnings attached to row
}

// ── Box from box_catalog ──
export interface CatalogBox {
  id: string
  company_id: string
  box_name: string
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
  material_type: string
  cost_per_box_usd: number
  sustainability_score: number
  is_active: boolean
}

// ── Per-row optimization result ──
export type FitStatus = 'optimized' | 'same_box' | 'no_fit' | 'error'

export interface OptimizationResult {
  row_index: number
  product_name: string
  // original (used) box
  original_box_dimensions: string         // "L×W×H"
  original_box_price: number
  // recommended box
  optimized_box_dimensions: string        // "L×W×H"
  optimized_box_price: number
  recommended_box_id: string | null
  recommended_box_name: string
  // metrics
  shipping_zone: string
  savings: number                          // original − optimized cost
  fit_status: FitStatus
  optimization_reason: string
  utilization_pct: number
  dimensional_weight_kg: number
  sustainability_score: number
  // ML Enhancements
  ml_confidence_pct?: number
  ml_recommended_box?: string
  ml_enhanced?: boolean
  ai_explanation?: string
  // raw refs
  parsed_product: ParsedProduct
  recommended_box: CatalogBox | null
  // error
  error_message?: string
}

// ── Optimization run summary ──
export interface RunSummary {
  total_rows: number
  optimized: number
  same_box: number
  no_fit: number
  errors: number
  total_savings: number
  avg_utilization: number
  run_id: string
}

// ── Supabase row shapes (match DB columns exactly) ──
export interface OptimizedOrderRow {
  id: string
  run_id: string | null
  company_id: string
  product_name: string
  product_length_cm: number | null
  product_width_cm: number | null
  product_height_cm: number | null
  product_weight_kg: number | null
  fragility: string | null
  fragility_score: number | null
  quantity: number | null
  shipping_zone: string | null
  // used (original) box
  used_box_length_cm: number | null
  used_box_width_cm: number | null
  used_box_height_cm: number | null
  used_box_price_usd: number | null
  // recommended box
  recommended_box_id: string | null
  current_box_id: string | null
  original_box_price_usd: number | null
  optimized_box_price_usd: number | null
  savings_usd: number | null
  shipping_cost_usd: number | null
  utilization_pct: number | null
  dimensional_weight_kg: number | null
  sustainability_impact: string | null
  sustainability_score: number | null
  fit_status: string | null
  optimization_reason: string | null
  ai_explanation: string | null
  run_row_index: number | null
  created_at: string
  // joined
  recommended_box?: CatalogBox | null
}

// ── Validation result for a single CSV row ──
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  row: ParsedProduct | null
}

// ── Shipping zone cost multipliers ──
export const ZONE_RATE_MAP: Record<string, number> = {
  'zone 1': 0.65,
  'zone 2': 0.80,
  'zone 3': 1.00,
  'zone 4': 1.20,
  'zone 5': 1.45,
  'zone 6': 1.70,
  'zone 7': 2.00,
  'zone 8': 2.40,
  'international': 3.50,
  'default': 1.00,
}

export function getZoneRate(zone: string): number {
  return ZONE_RATE_MAP[zone.toLowerCase()] ?? ZONE_RATE_MAP['default']
}

// ── DIM weight calculation (industry standard) ──
export const DIM_DIVISOR = 5000  // cm³/kg

export function calcDimWeight(l: number, w: number, h: number): number {
  return parseFloat(((l * w * h) / DIM_DIVISOR).toFixed(3))
}

export const BASE_RATE_PER_KG = 1.20  // USD per kg — industry average ground

export function calcShippingCost(dimWeightKg: number, actualWeightKg: number, zone: string): number {
  const billableWeight = Math.max(dimWeightKg, actualWeightKg)
  const rate = getZoneRate(zone)
  return parseFloat((billableWeight * BASE_RATE_PER_KG * rate).toFixed(2))
}
