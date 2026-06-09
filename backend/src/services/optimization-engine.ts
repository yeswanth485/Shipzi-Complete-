// =============================================
// SHIPZI — Optimization Engine
// Handles 2,000–10,000 CSV rows safely
// =============================================
import {
  ParsedProduct,
  CatalogBox,
  OptimizationResult,
  FitStatus,
  CSVRow,
  ValidationResult,
  calcDimWeight,
  calcShippingCost,
} from './types'

// ── CSV Row Validator ──────────────────────────────────────────────
export function validateCSVRow(raw: CSVRow, rowIndex: number): ValidationResult {
  const errors: string[] = []

  const pl = parseFloat(raw.product_length)
  const pw = parseFloat(raw.product_width)
  const ph = parseFloat(raw.product_height)
  const ubl = parseFloat(raw.used_box_length)
  const ubw = parseFloat(raw.used_box_width)
  const ubh = parseFloat(raw.used_box_height)
  const fs = parseFloat(raw.fragility_score)
  const ubp = parseFloat(raw.used_box_price)

  if (!raw.product_name?.trim()) errors.push('product_name is required')
  if (isNaN(pl) || pl <= 0) errors.push('product_length must be > 0')
  if (isNaN(pw) || pw <= 0) errors.push('product_width must be > 0')
  if (isNaN(ph) || ph <= 0) errors.push('product_height must be > 0')
  if (isNaN(ubl) || ubl <= 0) errors.push('used_box_length must be > 0')
  if (isNaN(ubw) || ubw <= 0) errors.push('used_box_width must be > 0')
  if (isNaN(ubh) || ubh <= 0) errors.push('used_box_height must be > 0')
  if (isNaN(fs) || fs < 0 || fs > 10) errors.push('fragility_score must be 0–10')
  if (isNaN(ubp) || ubp < 0) errors.push('used_box_price must be >= 0')
  if (!raw.shipping_zone?.trim()) errors.push('shipping_zone is required')

  // Fatal errors — drop row
  if (errors.length > 0) return { valid: false, errors, warnings: [], row: null }

  // Non-fatal warnings — build the row anyway
  const warnings: string[] = []
  if (pl > ubl || pw > ubw || ph > ubh) {
    warnings.push('Product dimensions may exceed used_box — verify data')
  }

  const row: ParsedProduct = {
    product_name: raw.product_name.trim(),
    product_length: pl,
    product_width: pw,
    product_height: ph,
    used_box_length: ubl,
    used_box_width: ubw,
    used_box_height: ubh,
    fragility_score: fs,
    used_box_price: ubp,
    shipping_zone: raw.shipping_zone.trim(),
    quantity: Math.max(1, parseInt(raw.quantity ?? '1') || 1),
    weight_kg: parseFloat(raw.weight_kg ?? '0.5') || 0.5,
    row_index: rowIndex,
    warnings,
  }

  return { valid: true, errors: [], warnings, row }
}

// ── Fragility padding (cm added to each dimension) ────────────────
function fragilityPadding(score: number): number {
  if (score >= 8) return 3.0   // very fragile — needs buffer
  if (score >= 5) return 1.5   // medium fragile
  return 0.5                   // robust
}

// ── Core box selector ──────────────────────────────────────────────
export function selectOptimalBox(
  product: ParsedProduct,
  catalog: CatalogBox[]
): OptimizationResult {
  const pad = fragilityPadding(product.fragility_score)

  // Minimum safe box dimensions for this product (with padding)
  const minL = product.product_length + pad
  const minW = product.product_width + pad
  // FIX 6: Stack units vertically; add padding once (not per unit)
  const minH = (product.product_height * product.quantity) + pad
  const minWeight = product.weight_kg * product.quantity

  const originalBoxDims = `${product.used_box_length}×${product.used_box_width}×${product.used_box_height}`
  const originalBoxVol = product.used_box_length * product.used_box_width * product.used_box_height
  const productVol = product.product_length * product.product_width * product.product_height * product.quantity
  const originalDimWeight = calcDimWeight(product.used_box_length, product.used_box_width, product.used_box_height)
  const originalShipping = calcShippingCost(originalDimWeight, product.weight_kg * product.quantity, product.shipping_zone)
  const originalTotalCost = product.used_box_price + originalShipping

  // FIX 1: Sorted-dims rotation check — box fits if sorted(box) >= sorted(product+pad) in all axes
  function boxFitsProduct(box: CatalogBox): boolean {
    const boxDims  = [box.length_cm, box.width_cm, box.height_cm].sort((a, b) => b - a)
    const prodDims = [minL, minW, minH].sort((a, b) => b - a)
    return (
      boxDims[0] >= prodDims[0] &&
      boxDims[1] >= prodDims[1] &&
      boxDims[2] >= prodDims[2] &&
      box.max_weight_kg >= minWeight
    )
  }

  // Step 1: Find all boxes that can physically fit the product (with rotation + padding)
  const fittingBoxes = catalog.filter(boxFitsProduct)

  if (fittingBoxes.length === 0) {
    return {
      row_index: product.row_index,
      product_name: product.product_name,
      original_box_dimensions: originalBoxDims,
      original_box_price: product.used_box_price,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: product.used_box_price,
      recommended_box_id: null,
      recommended_box_name: 'No fit found',
      shipping_zone: product.shipping_zone,
      savings: 0,
      fit_status: 'no_fit',
      optimization_reason: `No box in catalog safely fits ${product.product_name} (${minL.toFixed(1)}×${minW.toFixed(1)}×${minH.toFixed(1)}cm min required). Add a box to your catalog.`,
      utilization_pct: 0,
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      parsed_product: product,
      recommended_box: null,
    }
  }

  // Step 2: Only consider boxes SMALLER than the original used box
  const smallerFittingBoxes = fittingBoxes.filter(b => {
    const boxVol = b.length_cm * b.width_cm * b.height_cm
    return boxVol < originalBoxVol
  })

  // Step 3: If no smaller box fits, the current box is already optimal
  if (smallerFittingBoxes.length === 0) {
    const bestFit = fittingBoxes
      .map(b => {
        const boxVol = b.length_cm * b.width_cm * b.height_cm
        const utilization = Math.min((productVol / boxVol) * 100, 100)
        return { box: b, utilization, boxVol }
      })
      .sort((a, b) => a.boxVol - b.boxVol)[0]

    return {
      row_index: product.row_index,
      product_name: product.product_name,
      original_box_dimensions: originalBoxDims,
      original_box_price: product.used_box_price,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: product.used_box_price,
      recommended_box_id: null,
      recommended_box_name: 'Same Box',
      shipping_zone: product.shipping_zone,
      savings: 0,
      fit_status: 'same_box',
      optimization_reason: `Current box (${originalBoxDims}cm, volume ${originalBoxVol}cm³) is already the smallest option. No smaller box in catalog can fit ${product.product_name} (${minL.toFixed(1)}×${minW.toFixed(1)}×${minH.toFixed(1)}cm minimum with ${pad}cm padding).`,
      utilization_pct: parseFloat(Math.min((productVol / (bestFit?.boxVol || originalBoxVol)) * 100, 100).toFixed(1)),
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      parsed_product: product,
      recommended_box: null,
    }
  }

  // FIX 2: Scoring with normalized cost — utilization 55% + cost 30% + eco 15%
  // Pre-compute min and max total costs for normalization
  const allCosts = smallerFittingBoxes.map(b => {
    const dw = calcDimWeight(b.length_cm, b.width_cm, b.height_cm)
    return b.cost_per_box_usd + calcShippingCost(dw, product.weight_kg * product.quantity, product.shipping_zone)
  })
  const minCost = Math.min(...allCosts)
  const maxCost = Math.max(...allCosts)
  const costRange = maxCost - minCost || 1

  const scored = smallerFittingBoxes.map(box => {
    const boxVol      = box.length_cm * box.width_cm * box.height_cm
    const utilization = Math.min((productVol / boxVol) * 100, 100)
    const dimWeight   = calcDimWeight(box.length_cm, box.width_cm, box.height_cm)
    const shippingCost = calcShippingCost(dimWeight, product.weight_kg * product.quantity, product.shipping_zone)
    const totalCost   = box.cost_per_box_usd + shippingCost
    // Normalized cost score: 0 = most expensive, 100 = cheapest
    const costScore   = ((maxCost - totalCost) / costRange) * 100
    // Composite: utilization 55% + cost 30% + eco 15%
    const score = (utilization * 0.55) + (costScore * 0.30) + (box.sustainability_score * 0.15)
    return { box, utilization, dimWeight, shippingCost, totalCost, score }
  }).sort((a, b) => {
    // FIX 8: Primary: composite score desc; tiebreaker: smaller volume asc
    if (Math.abs(b.score - a.score) > 0.1) return b.score - a.score
    return (a.box.length_cm * a.box.width_cm * a.box.height_cm) -
           (b.box.length_cm * b.box.width_cm * b.box.height_cm)
  })

  const best = scored[0]
  const bestBoxVol = best.box.length_cm * best.box.width_cm * best.box.height_cm
  const bestBoxDims = `${best.box.length_cm}×${best.box.width_cm}×${best.box.height_cm}`
  const optimizedTotalCost = best.totalCost
  const savings = parseFloat(Math.max(0, originalTotalCost - optimizedTotalCost).toFixed(2))

  // Safety: optimized box MUST be smaller than original
  if (bestBoxVol >= originalBoxVol) {
    return {
      row_index: product.row_index,
      product_name: product.product_name,
      original_box_dimensions: originalBoxDims,
      original_box_price: product.used_box_price,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: product.used_box_price,
      recommended_box_id: null,
      recommended_box_name: 'Same Box',
      shipping_zone: product.shipping_zone,
      savings: 0,
      fit_status: 'same_box',
      optimization_reason: `No smaller box available. Current box is optimal.`,
      utilization_pct: 0,
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      parsed_product: product,
      recommended_box: null,
    }
  }

  // FIX 3: same_box tolerance comparison (0.1cm)
  const TOLERANCE = 0.1
  const isSameBox =
    Math.abs(best.box.length_cm - product.used_box_length) < TOLERANCE &&
    Math.abs(best.box.width_cm  - product.used_box_width)  < TOLERANCE &&
    Math.abs(best.box.height_cm - product.used_box_height) < TOLERANCE

  const fitStatus: FitStatus = isSameBox ? 'same_box' : 'optimized'

  const volReductionPct = Math.round((1 - bestBoxVol / originalBoxVol) * 100)
  let reason: string
  if (fitStatus === 'optimized') {
    reason = `Switched from ${originalBoxDims}cm (${originalBoxVol}cm³) to ${bestBoxDims}cm (${bestBoxVol}cm³) — ${volReductionPct}% smaller volume, saving $${savings.toFixed(2)} per shipment (box $${product.used_box_price.toFixed(2)}→$${best.box.cost_per_box_usd.toFixed(2)} + shipping). Fragility ${product.fragility_score}/10 — ${pad}cm padding.`
  } else {
    reason = `Current box is already optimal. Tolerance match with ${bestBoxDims}cm (${bestBoxVol}cm³). No meaningful size reduction possible for ${product.product_name}.`
  }

  return {
    row_index: product.row_index,
    product_name: product.product_name,
    original_box_dimensions: originalBoxDims,
    original_box_price: product.used_box_price,
    optimized_box_dimensions: bestBoxDims,
    optimized_box_price: parseFloat(best.box.cost_per_box_usd.toFixed(2)),
    recommended_box_id: best.box.id,
    recommended_box_name: best.box.box_name,
    shipping_zone: product.shipping_zone,
    savings: fitStatus === 'same_box' ? 0 : savings,
    fit_status: fitStatus,
    optimization_reason: reason,
    utilization_pct: parseFloat(best.utilization.toFixed(1)),
    dimensional_weight_kg: best.dimWeight,
    sustainability_score: best.box.sustainability_score,
    parsed_product: product,
    recommended_box: best.box,
  }
}

// ── Bulk processor (handles 2000–10000 rows) ──────────────────────
export interface BulkResult {
  results: OptimizationResult[]
  invalidRows: Array<{ rowIndex: number; errors: string[] }>
  summary: {
    total: number
    valid: number
    invalid: number
    optimized: number
    same_box: number
    no_fit: number
    total_savings: number
    avg_utilization: number
  }
}

export async function bulkOptimize(
  rawRows: CSVRow[],
  catalog: CatalogBox[],
  onProgress?: (processed: number, total: number) => void
): Promise<BulkResult> {
  const results: OptimizationResult[] = []
  const invalidRows: BulkResult['invalidRows'] = []

  const CHUNK = 200  // process in chunks to avoid blocking the main thread

  for (let i = 0; i < rawRows.length; i += CHUNK) {
    const chunk = rawRows.slice(i, i + CHUNK)

    for (let j = 0; j < chunk.length; j++) {
      const rawRow = chunk[j]
      const rowIndex = i + j

      try {
        const validation = validateCSVRow(rawRow, rowIndex)

        if (!validation.valid || !validation.row) {
          invalidRows.push({ rowIndex, errors: validation.errors })
          continue
        }

        const result = selectOptimalBox(validation.row, catalog)
        results.push(result)
      } catch (err) {
        // One bad row must never break the batch
        invalidRows.push({
          rowIndex,
          errors: [err instanceof Error ? err.message : 'Unknown processing error'],
        })
      }
    }

    // Yield to event loop between chunks so UI stays responsive
    if (i + CHUNK < rawRows.length) {
      await new Promise(r => setTimeout(r, 0))
    }

    onProgress?.(Math.min(i + CHUNK, rawRows.length), rawRows.length)
  }

  const optimized = results.filter(r => r.fit_status === 'optimized').length
  const sameBox = results.filter(r => r.fit_status === 'same_box').length
  const noFit = results.filter(r => r.fit_status === 'no_fit').length
  const totalSavings = results.reduce((s, r) => s + r.savings, 0)
  const avgUtil = results.length
    ? results.reduce((s, r) => s + r.utilization_pct, 0) / results.length
    : 0

  return {
    results,
    invalidRows,
    summary: {
      total: rawRows.length,
      valid: results.length,
      invalid: invalidRows.length,
      optimized,
      same_box: sameBox,
      no_fit: noFit,
      total_savings: parseFloat(totalSavings.toFixed(2)),
      avg_utilization: parseFloat(avgUtil.toFixed(1)),
    },
  }
}

// ── Build Supabase insert rows from results ────────────────────────
export function buildOrderInsertRows(
  results: OptimizationResult[],
  runId: string,
  companyId: string
) {
  return results.map(r => ({
    run_id: runId,
    company_id: companyId,
    product_name: r.product_name,
    product_length_cm: r.parsed_product.product_length,
    product_width_cm: r.parsed_product.product_width,
    product_height_cm: r.parsed_product.product_height,
    product_weight_kg: r.parsed_product.weight_kg,
    fragility: r.parsed_product.fragility_score >= 7 ? 'high' : r.parsed_product.fragility_score >= 4 ? 'medium' : 'low',
    fragility_score: r.parsed_product.fragility_score,
    quantity: r.parsed_product.quantity,
    shipping_zone: r.parsed_product.shipping_zone,
    used_box_length_cm: r.parsed_product.used_box_length,
    used_box_width_cm: r.parsed_product.used_box_width,
    used_box_height_cm: r.parsed_product.used_box_height,
    used_box_price_usd: r.parsed_product.used_box_price,
    recommended_box_id: r.recommended_box_id,
    original_box_price_usd: r.original_box_price,
    optimized_box_price_usd: r.optimized_box_price,
    savings_usd: r.savings,
    utilization_pct: r.utilization_pct,
    dimensional_weight_kg: r.dimensional_weight_kg,
    sustainability_score: r.sustainability_score,
    fit_status: r.fit_status,
    optimization_reason: r.optimization_reason,
    ai_explanation: r.ai_explanation ?? null,
    run_row_index: r.row_index,
  }))
}

// ── Chunk array for Supabase (max 500 per insert) ─────────────────
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
