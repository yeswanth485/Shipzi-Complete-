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
  ProductSpec,
  calcDimWeight,
  calcShippingCost,
} from './types'

export interface MLEnhancement {
  recommended_box_name: string
  optimized_box_price: number
  ml_confidence_pct: number
  savings_usd: number
  is_oversized: boolean
  fit_status: string
  packaging_tip: string
}

// ── Runtime env reads (NOT build-time inlined) ─────────────────────
function getMLBridgeUrl(): string {
  return process.env.ML_BRIDGE_URL
    || process.env.NEXT_PUBLIC_ML_BRIDGE_URL
    || 'https://shipzi-complete-ml-engine.onrender.com'
}

function isMLEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ML_BRIDGE_ENABLED !== 'false'
}

export async function checkMLBridge(): Promise<boolean> {
  if (!isMLEnabled()) return false
  const url = getMLBridgeUrl()
  try {
    const headers: Record<string, string> = {}
    if (process.env.ML_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.ML_API_KEY}`
    }
    const res = await fetch(`${url}/ml/health`, { headers, signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      console.log('ML bridge connected ✅')
      return true
    }
  } catch (err) {
    // offline
  }
  console.log('ML bridge offline — rule-based mode')
  return false
}

export async function mlEnhance(product: ParsedProduct): Promise<MLEnhancement | null> {
  if (!isMLEnabled()) return null
  const url = getMLBridgeUrl()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.ML_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.ML_API_KEY}`
    }
    const res = await fetch(`${url}/ml/single`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
      signal: AbortSignal.timeout(2000)
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    return null
  }
}

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
  catalog: CatalogBox[],
  mlResult?: MLEnhancement | null
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

  // Score: prioritize SMALLEST box that fits, then cheapest, then eco-friendly
  const scored = smallerFittingBoxes.map(box => {
    const boxVol      = box.length_cm * box.width_cm * box.height_cm
    const utilization = Math.min((productVol / boxVol) * 100, 100)
    const dimWeight   = calcDimWeight(box.length_cm, box.width_cm, box.height_cm)
    const shippingCost = calcShippingCost(dimWeight, product.weight_kg * product.quantity, product.shipping_zone)
    const totalCost   = box.cost_per_box_usd + shippingCost
    return { box, utilization, dimWeight, shippingCost, totalCost, boxVol }
  }).sort((a, b) => {
    // Primary: smallest box volume (this is the key optimization goal)
    if (Math.abs(a.boxVol - b.boxVol) > 1) return a.boxVol - b.boxVol
    // Secondary: lowest total cost (box + shipping)
    if (Math.abs(a.totalCost - b.totalCost) > 0.01) return a.totalCost - b.totalCost
    // Tertiary: higher sustainability score
    return b.box.sustainability_score - a.box.sustainability_score
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

  let finalBoxId: string | null = best.box.id
  let finalBoxName = best.box.box_name
  let finalBoxDims = bestBoxDims
  let finalPrice = parseFloat(best.box.cost_per_box_usd.toFixed(2))
  let finalSavings = fitStatus === 'same_box' ? 0 : savings
  let finalReason = reason
  let mlEnhanced = false
  let aiExplanation = undefined
  let mlConfidence = undefined

  // When same_box, always show original used box dimensions
  if (fitStatus === 'same_box') {
    finalBoxDims = originalBoxDims
    finalPrice = product.used_box_price
    finalBoxId = null
    finalBoxName = 'Same Box'
  }

  if (mlResult && mlResult.recommended_box_name) {
    // Always track ML confidence when ML was used
    mlConfidence = mlResult.ml_confidence_pct

    if (mlResult.recommended_box_name !== best.box.box_name) {
      if (mlResult.savings_usd > finalSavings) {
        // ML found a better box that exists in catalog? We should find it.
        const mlBox = catalog.find(b => b.box_name === mlResult.recommended_box_name)
        if (mlBox) {
          finalBoxId = mlBox.id
          finalBoxName = mlBox.box_name
          finalBoxDims = `${mlBox.length_cm}×${mlBox.width_cm}×${mlBox.height_cm}`
          finalPrice = parseFloat(mlBox.cost_per_box_usd.toFixed(2))
          finalSavings = mlResult.savings_usd
          mlEnhanced = true
          aiExplanation = mlResult.packaging_tip
        }
      }
    } else {
      // both agree
      mlEnhanced = true
    }
  }

  return {
    row_index: product.row_index,
    product_name: product.product_name,
    original_box_dimensions: originalBoxDims,
    original_box_price: product.used_box_price,
    optimized_box_dimensions: finalBoxDims,
    optimized_box_price: finalPrice,
    recommended_box_id: finalBoxId,
    recommended_box_name: finalBoxName,
    shipping_zone: product.shipping_zone,
    savings: finalSavings,
    fit_status: fitStatus,
    optimization_reason: finalReason,
    utilization_pct: parseFloat(best.utilization.toFixed(1)),
    dimensional_weight_kg: best.dimWeight,
    sustainability_score: best.box.sustainability_score,
    ml_confidence_pct: mlConfidence,
    ml_recommended_box: mlResult?.recommended_box_name,
    ml_enhanced: mlEnhanced,
    ai_explanation: aiExplanation,
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
    ml_used: boolean
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
  let mlUsed = false

  for (let i = 0; i < rawRows.length; i += CHUNK) {
    const chunk = rawRows.slice(i, i + CHUNK)

    const validRows: ParsedProduct[] = []

    for (let j = 0; j < chunk.length; j++) {
      const rawRow = chunk[j]
      const rowIndex = i + j

      const validation = validateCSVRow(rawRow, rowIndex)
      if (!validation.valid || !validation.row) {
        invalidRows.push({ rowIndex, errors: validation.errors })
      } else {
        validRows.push(validation.row)
      }
    }
    
    // Bulk ML call
    const mlUrl = getMLBridgeUrl()
    const mlEnabled = isMLEnabled()
    let mlResults: Record<number, MLEnhancement> = {}
    if (mlEnabled && validRows.length > 0) {
      try {
        console.log(`[ML] Calling ML bridge at ${mlUrl}/ml/bulk for ${validRows.length} rows...`)
        const mlHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (process.env.ML_API_KEY) {
          mlHeaders['Authorization'] = `Bearer ${process.env.ML_API_KEY}`
        }
        const res = await fetch(`${mlUrl}/ml/bulk`, {
          method: 'POST',
          headers: mlHeaders,
          body: JSON.stringify(validRows),
          signal: AbortSignal.timeout(15000)
        })
        if (res.ok) {
          const data: MLEnhancement[] = await res.json()
          data.forEach((item, idx) => {
            if (item && !('error' in item)) {
              mlResults[validRows[idx].row_index] = item
            }
          })
          mlUsed = true
          console.log(`[ML] ML bridge responded — ${Object.keys(mlResults).length}/${validRows.length} rows enhanced`)
        } else {
          console.warn(`[ML] ML bridge returned status ${res.status} — using rule-based fallback`)
        }
      } catch (err) {
        console.warn(`[ML] ML bridge unreachable — using rule-based fallback. Error:`, err instanceof Error ? err.message : err)
      }
    }

    for (const row of validRows) {
      try {
        const mlResult = mlResults[row.row_index] || null
        const result = selectOptimalBox(row, catalog, mlResult)
        results.push(result)
      } catch (err) {
        invalidRows.push({
          rowIndex: row.row_index,
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

  console.log(`[OPTIMIZE] Complete — ${results.length} rows, ${optimized} optimized, $${totalSavings.toFixed(2)} savings, ML: ${mlUsed ? 'YES' : 'NO'}`)

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
      ml_used: mlUsed,
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

// ══════════════════════════════════════════════════════════════════
// MULTI-PRODUCT SUPPORT
// ══════════════════════════════════════════════════════════════════

export function parseMultiProductRow(row: CSVRow): ProductSpec[] | null {
  const names = (row.product_names || '').split('|').map(s => s.trim()).filter(Boolean)
  const lengths = (row.product_lengths || '').split('|').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0)
  const widths = (row.product_widths || '').split('|').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0)
  const heights = (row.product_heights || '').split('|').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0)
  const fragilities = (row.product_fragilities || '').split('|').map(s => parseFloat(s.trim()))

  if (names.length === 0 || lengths.length !== names.length || widths.length !== names.length || heights.length !== names.length) {
    return null
  }

  return names.map((name, i) => ({
    name,
    length: lengths[i],
    width: widths[i],
    height: heights[i],
    fragility: !isNaN(fragilities[i]) ? fragilities[i] : 0,
  }))
}

function computeCombinedDimensions(products: ProductSpec[]) {
  const combinedLength = Math.max(...products.map(p => p.length))
  const combinedWidth = Math.max(...products.map(p => p.width))
  const combinedHeight = Math.max(...products.map(p => p.height))
  const maxFragility = Math.max(...products.map(p => p.fragility))
  const productNames = products.map(p => p.name).join(', ')

  return { combinedLength, combinedWidth, combinedHeight, maxFragility, productCount: products.length, productNames }
}

// Try multiple packing strategies and return the best fitting dimensions
function computeBestPacking(products: ProductSpec[]): {
  length: number; width: number; height: number; strategy: string
} {
  if (products.length === 1) {
    return { length: products[0].length, width: products[0].width, height: products[0].height, strategy: 'single' }
  }

  const strategies: Array<{ length: number; width: number; height: number; strategy: string }> = []

  // Strategy 1: Max of each dimension (side-by-side, worst case)
  strategies.push({
    length: Math.max(...products.map(p => p.length)),
    width: Math.max(...products.map(p => p.width)),
    height: Math.max(...products.map(p => p.height)),
    strategy: 'side_by_side',
  })

  // Strategy 2: Stack vertically (max L/W, sum of heights)
  strategies.push({
    length: Math.max(...products.map(p => p.length)),
    width: Math.max(...products.map(p => p.width)),
    height: products.reduce((sum, p) => sum + p.height, 0),
    strategy: 'stack_vertical',
  })

  // Strategy 3: Stack along width (max L/H, sum of widths)
  strategies.push({
    length: Math.max(...products.map(p => p.length)),
    width: products.reduce((sum, p) => sum + p.width, 0),
    height: Math.max(...products.map(p => p.height)),
    strategy: 'stack_width',
  })

  // Strategy 4: Stack along length (sum of lengths, max W/H)
  strategies.push({
    length: products.reduce((sum, p) => sum + p.length, 0),
    width: Math.max(...products.map(p => p.width)),
    height: Math.max(...products.map(p => p.height)),
    strategy: 'stack_length',
  })

  // Strategy 5: 2x2 grid for 4 products (pair-wise max)
  if (products.length === 4) {
    const sorted = [...products].sort((a, b) => (b.length * b.width) - (a.length * a.width))
    strategies.push({
      length: Math.max(sorted[0].length, sorted[1].length) + Math.max(sorted[2].length, sorted[3].length),
      width: Math.max(
        Math.max(sorted[0].width, sorted[1].width),
        Math.max(sorted[2].width, sorted[3].width)
      ),
      height: Math.max(...products.map(p => p.height)),
      strategy: '2x2_grid',
    })
  }

  // Strategy 6: Pairs stacked (for 3-4 products, pair two and stack)
  if (products.length >= 3) {
    const sorted = [...products].sort((a, b) => (b.length * b.width) - (a.length * a.width))
    // Pair the two largest, stack the rest on top
    const pairMaxL = Math.max(sorted[0].length, sorted[1].length)
    const pairMaxW = Math.max(sorted[0].width, sorted[1].width)
    const pairSumH = sorted[0].height + sorted[1].height
    const restMaxL = products.length > 2 ? Math.max(...sorted.slice(2).map(p => p.length)) : 0
    const restMaxW = products.length > 2 ? Math.max(...sorted.slice(2).map(p => p.width)) : 0
    const restSumH = products.length > 2 ? sorted.slice(2).reduce((s, p) => s + p.height, 0) : 0
    strategies.push({
      length: Math.max(pairMaxL, restMaxL),
      width: Math.max(pairMaxW, restMaxW),
      height: pairSumH + restSumH,
      strategy: 'paired_stack',
    })
  }

  // Pick the strategy with the smallest volume
  return strategies.reduce((best, s) => {
    const vol = s.length * s.width * s.height
    const bestVol = best.length * best.width * best.height
    return vol < bestVol ? s : best
  })
}

export function selectOptimalBoxMultiProduct(
  orderId: string,
  products: ProductSpec[],
  usedBoxLength: number,
  usedBoxWidth: number,
  usedBoxHeight: number,
  usedBoxPrice: number,
  shippingZone: string,
  catalog: CatalogBox[],
  mlResult?: MLEnhancement | null,
): OptimizationResult {
  const { maxFragility, productCount, productNames } =
    computeCombinedDimensions(products)

  // Use best packing strategy instead of just max-of-each
  const packing = computeBestPacking(products)

  const pad = fragilityPadding(maxFragility)
  const minL = packing.length + pad
  const minW = packing.width + pad
  const minH = packing.height + pad
  const minWeight = products.length * 0.5

  const originalBoxDims = `${usedBoxLength}×${usedBoxWidth}×${usedBoxHeight}`
  const originalBoxVol = usedBoxLength * usedBoxWidth * usedBoxHeight
  const originalDimWeight = calcDimWeight(usedBoxLength, usedBoxWidth, usedBoxHeight)
  const originalShipping = calcShippingCost(originalDimWeight, minWeight, shippingZone)
  const originalTotalCost = usedBoxPrice + originalShipping

  function boxFitsGroup(box: CatalogBox): boolean {
    const boxDims = [box.length_cm, box.width_cm, box.height_cm].sort((a, b) => b - a)
    const prodDims = [minL, minW, minH].sort((a, b) => b - a)
    const EPSILON = 0.05
    return (
      boxDims[0] >= prodDims[0] - EPSILON &&
      boxDims[1] >= prodDims[1] - EPSILON &&
      boxDims[2] >= prodDims[2] - EPSILON &&
      box.max_weight_kg >= minWeight - EPSILON
    )
  }

  const fittingBoxes = catalog.filter(boxFitsGroup)

  if (fittingBoxes.length === 0) {
    return {
      row_index: 0,
      product_name: `${orderId} (${productCount} products)`,
      original_box_dimensions: originalBoxDims,
      original_box_price: usedBoxPrice,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: usedBoxPrice,
      recommended_box_id: null,
      recommended_box_name: 'No fit found',
      shipping_zone: shippingZone,
      savings: 0,
      fit_status: 'no_fit',
      optimization_reason: `No box in catalog fits all ${productCount} products together (${productNames}). Combined: ${minL.toFixed(1)}×${minW.toFixed(1)}×${minH.toFixed(1)}cm (packing: ${packing.strategy}).`,
      utilization_pct: 0,
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      parsed_product: {
        product_name: orderId, product_length: packing.length, product_width: packing.width,
        product_height: packing.height, used_box_length: usedBoxLength, used_box_width: usedBoxWidth,
        used_box_height: usedBoxHeight, fragility_score: maxFragility, used_box_price: usedBoxPrice,
        shipping_zone: shippingZone, quantity: 1, weight_kg: minWeight, row_index: 0,
      },
      recommended_box: null,
    }
  }

  const smallerFittingBoxes = fittingBoxes.filter(b => {
    const boxVol = b.length_cm * b.width_cm * b.height_cm
    return boxVol < originalBoxVol
  })

  if (smallerFittingBoxes.length === 0) {
    const bestFit = fittingBoxes
      .map(b => {
        const boxVol = b.length_cm * b.width_cm * b.height_cm
        const utilization = (packing.length * packing.width * packing.height / boxVol) * 100
        return { box: b, utilization }
      })
      .sort((a, b) => b.utilization - a.utilization)[0]

    // Same box: show original used box dimensions
    return {
      row_index: 0,
      product_name: `${orderId} (${productCount} products)`,
      original_box_dimensions: originalBoxDims,
      original_box_price: usedBoxPrice,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: usedBoxPrice,
      recommended_box_id: null,
      recommended_box_name: 'Same Box',
      shipping_zone: shippingZone,
      savings: 0,
      fit_status: 'same_box',
      optimization_reason: `Current box is already the best fit for ${productCount} products (packing: ${packing.strategy}).`,
      utilization_pct: parseFloat(bestFit.utilization.toFixed(1)),
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      ml_confidence_pct: mlResult?.ml_confidence_pct,
      ml_enhanced: !!mlResult,
      parsed_product: {
        product_name: orderId, product_length: packing.length, product_width: packing.width,
        product_height: packing.height, used_box_length: usedBoxLength, used_box_width: usedBoxWidth,
        used_box_height: usedBoxHeight, fragility_score: maxFragility, used_box_price: usedBoxPrice,
        shipping_zone: shippingZone, quantity: 1, weight_kg: minWeight, row_index: 0,
      },
      recommended_box: null,
    }
  }

  // Score: prioritize SMALLEST box that fits, then cheapest, then eco-friendly
  const scored = smallerFittingBoxes.map(box => {
    const boxVol = box.length_cm * box.width_cm * box.height_cm
    const utilization = Math.min((packing.length * packing.width * packing.height / boxVol) * 100, 100)
    const dw = calcDimWeight(box.length_cm, box.width_cm, box.height_cm)
    const ship = calcShippingCost(dw, minWeight, shippingZone)
    const totalCost = box.cost_per_box_usd + ship
    return { box, utilization, totalCost, boxVol }
  }).sort((a, b) => {
    // Primary: smallest box volume (key optimization goal)
    if (Math.abs(a.boxVol - b.boxVol) > 1) return a.boxVol - b.boxVol
    // Secondary: lowest total cost
    if (Math.abs(a.totalCost - b.totalCost) > 0.01) return a.totalCost - b.totalCost
    // Tertiary: higher sustainability score
    return b.box.sustainability_score - a.box.sustainability_score
  })

  const best = scored[0]
  const bestBoxVol = best.box.length_cm * best.box.width_cm * best.box.height_cm
  const bestBoxDims = `${best.box.length_cm}×${best.box.width_cm}×${best.box.height_cm}`
  const optimizedTotalCost = best.totalCost
  const savings = parseFloat(Math.max(0, originalTotalCost - optimizedTotalCost).toFixed(2))

  // Safety: optimized box MUST be smaller than original
  if (bestBoxVol >= originalBoxVol) {
    return {
      row_index: 0,
      product_name: `${orderId} (${productCount} products)`,
      original_box_dimensions: originalBoxDims,
      original_box_price: usedBoxPrice,
      optimized_box_dimensions: originalBoxDims,
      optimized_box_price: usedBoxPrice,
      recommended_box_id: null,
      recommended_box_name: 'Same Box',
      shipping_zone: shippingZone,
      savings: 0,
      fit_status: 'same_box',
      optimization_reason: `No smaller box available. Current box is optimal (packing: ${packing.strategy}).`,
      utilization_pct: 0,
      dimensional_weight_kg: originalDimWeight,
      sustainability_score: 0,
      ml_confidence_pct: mlResult?.ml_confidence_pct,
      ml_enhanced: !!mlResult,
      parsed_product: {
        product_name: orderId, product_length: packing.length, product_width: packing.width,
        product_height: packing.height, used_box_length: usedBoxLength, used_box_width: usedBoxWidth,
        used_box_height: usedBoxHeight, fragility_score: maxFragility, used_box_price: usedBoxPrice,
        shipping_zone: shippingZone, quantity: 1, weight_kg: minWeight, row_index: 0,
      },
      recommended_box: null,
    }
  }

  const TOLERANCE = 0.1
  const isSameBox =
    Math.abs(best.box.length_cm - usedBoxLength) < TOLERANCE &&
    Math.abs(best.box.width_cm  - usedBoxWidth)  < TOLERANCE &&
    Math.abs(best.box.height_cm - usedBoxHeight) < TOLERANCE

  const fitStatus: FitStatus = isSameBox ? 'same_box' : 'optimized'

  const volReductionPct = Math.round((1 - bestBoxVol / originalBoxVol) * 100)
  let reason: string
  if (fitStatus === 'optimized') {
    reason = `Switched from ${originalBoxDims}cm (${originalBoxVol}cm³) to ${bestBoxDims}cm (${bestBoxVol}cm³) — ${volReductionPct}% smaller volume, saving $${savings.toFixed(2)} per order (box $${usedBoxPrice.toFixed(2)}→$${best.box.cost_per_box_usd.toFixed(2)} + shipping). Packing: ${packing.strategy}.`
  } else {
    reason = `Current box is already optimal. Tolerance match with ${bestBoxDims}cm. No meaningful size reduction for ${productCount} products (packing: ${packing.strategy}).`
  }

  let finalBoxId: string | null = best.box.id
  let finalBoxName = best.box.box_name
  let finalBoxDims = bestBoxDims
  let finalPrice = parseFloat(best.box.cost_per_box_usd.toFixed(2))
  let finalSavings = fitStatus === 'same_box' ? 0 : savings
  let mlEnhanced = false
  let mlConfidence = mlResult?.ml_confidence_pct

  // When same_box, always show original used box dimensions
  if (fitStatus === 'same_box') {
    finalBoxDims = originalBoxDims
    finalPrice = usedBoxPrice
    finalBoxId = null
    finalBoxName = 'Same Box'
  }

  // Apply ML enhancement
  if (mlResult && mlResult.recommended_box_name) {
    if (mlResult.recommended_box_name !== best.box.box_name) {
      if (mlResult.savings_usd > finalSavings) {
        const mlBox = catalog.find(b => b.box_name === mlResult.recommended_box_name)
        if (mlBox) {
          const mlBoxVol = mlBox.length_cm * mlBox.width_cm * mlBox.height_cm
          if (mlBoxVol < originalBoxVol) {
            finalBoxId = mlBox.id
            finalBoxName = mlBox.box_name
            finalBoxDims = `${mlBox.length_cm}×${mlBox.width_cm}×${mlBox.height_cm}`
            finalPrice = parseFloat(mlBox.cost_per_box_usd.toFixed(2))
            finalSavings = mlResult.savings_usd
            mlEnhanced = true
          }
        }
      }
    } else {
      mlEnhanced = true
    }
  }

  return {
    row_index: 0,
    product_name: `${orderId} (${productCount} products)`,
    original_box_dimensions: originalBoxDims,
    original_box_price: usedBoxPrice,
    optimized_box_dimensions: finalBoxDims,
    optimized_box_price: finalPrice,
    recommended_box_id: finalBoxId,
    recommended_box_name: finalBoxName,
    shipping_zone: shippingZone,
    savings: finalSavings,
    fit_status: fitStatus,
    optimization_reason: reason,
    utilization_pct: parseFloat(best.utilization.toFixed(1)),
    dimensional_weight_kg: calcDimWeight(best.box.length_cm, best.box.width_cm, best.box.height_cm),
    sustainability_score: best.box.sustainability_score,
    ml_confidence_pct: mlConfidence,
    ml_recommended_box: mlResult?.recommended_box_name,
    ml_enhanced: mlEnhanced,
    parsed_product: {
      product_name: orderId, product_length: packing.length, product_width: packing.width,
      product_height: packing.height, used_box_length: usedBoxLength, used_box_width: usedBoxWidth,
      used_box_height: usedBoxHeight, fragility_score: maxFragility, used_box_price: usedBoxPrice,
      shipping_zone: shippingZone, quantity: 1, weight_kg: minWeight, row_index: 0,
    },
    recommended_box: best.box,
  }
}

export async function bulkOptimizeMulti(
  rawRows: CSVRow[],
  catalog: CatalogBox[],
  onProgress?: (processed: number, total: number) => void,
): Promise<BulkResult> {
  const results: OptimizationResult[] = []
  const invalidRows: BulkResult['invalidRows'] = []
  let mlUsed = false

  // Pre-parse all valid rows and build combined-dimension products for ML
  const parsedOrders: Array<{
    index: number
    orderId: string
    products: ProductSpec[]
    row: CSVRow
  }> = []

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const orderId = row.order_id || `ORD-${i + 1}`
    const products = parseMultiProductRow(row)
    if (!products || products.length === 0) {
      invalidRows.push({ rowIndex: i, errors: ['No valid products found in row'] })
      onProgress?.(i + 1, rawRows.length)
      continue
    }
    parsedOrders.push({ index: i, orderId, products, row })
  }

  // Build ML input: combined dimensions for each order
  const mlInput = parsedOrders.map(({ products, row }) => {
    const { combinedLength, combinedWidth, combinedHeight, maxFragility } =
      computeCombinedDimensions(products)
    return {
      product_name: products.map(p => p.name).join('|'),
      product_length: combinedLength,
      product_width: combinedWidth,
      product_height: combinedHeight,
      fragility_score: maxFragility,
      shipping_zone: row.shipping_zone || 'Unknown',
      used_box_price: parseFloat(row.used_box_price || '0'),
    }
  })

  // Call ML bridge for multi-product orders
  const mlUrl = getMLBridgeUrl()
  const mlEnabled = isMLEnabled()
  let mlResults: Record<number, MLEnhancement> = {}

  if (mlEnabled && mlInput.length > 0) {
    try {
      console.log(`[ML] Calling ML bridge at ${mlUrl}/ml/bulk for ${mlInput.length} multi-product orders...`)
      const mlHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.ML_API_KEY) {
        mlHeaders['Authorization'] = `Bearer ${process.env.ML_API_KEY}`
      }
      const res = await fetch(`${mlUrl}/ml/bulk`, {
        method: 'POST',
        headers: mlHeaders,
        body: JSON.stringify(mlInput),
        signal: AbortSignal.timeout(15000)
      })
      if (res.ok) {
        const data: MLEnhancement[] = await res.json()
        data.forEach((item, idx) => {
          if (item && !('error' in item)) {
            mlResults[parsedOrders[idx].index] = item
          }
        })
        mlUsed = true
        console.log(`[ML] ML bridge responded — ${Object.keys(mlResults).length}/${parsedOrders.length} multi-product orders enhanced`)
      } else {
        console.warn(`[ML] ML bridge returned status ${res.status} — using rule-based fallback for multi-product`)
      }
    } catch (err) {
      console.warn(`[ML] ML bridge unreachable for multi-product — using rule-based fallback. Error:`, err instanceof Error ? err.message : err)
    }
  }

  // Process each order with ML enhancement
  for (const { index: i, orderId, products, row } of parsedOrders) {
    try {
      const mlResult = mlResults[i] || null
      const result = selectOptimalBoxMultiProduct(
        orderId,
        products,
        parseFloat(row.used_box_length),
        parseFloat(row.used_box_width),
        parseFloat(row.used_box_height),
        parseFloat(row.used_box_price),
        row.shipping_zone,
        catalog,
        mlResult,
      )

      results.push(result)
    } catch (err) {
      invalidRows.push({
        rowIndex: i,
        errors: [err instanceof Error ? err.message : 'Processing error'],
      })
    }

    onProgress?.(i + 1, rawRows.length)
  }

  const optimized = results.filter(r => r.fit_status === 'optimized').length
  const sameBox = results.filter(r => r.fit_status === 'same_box').length
  const noFit = results.filter(r => r.fit_status === 'no_fit').length
  const totalSavings = results.reduce((s, r) => s + r.savings, 0)
  const avgUtil = results.length
    ? results.reduce((s, r) => s + r.utilization_pct, 0) / results.length
    : 0

  console.log(`[OPTIMIZE] Multi-product complete — ${results.length} orders, ${optimized} optimized, $${totalSavings.toFixed(2)} savings, ML: ${mlUsed ? 'YES' : 'NO'}`)

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
      ml_used: mlUsed,
    },
  }
}
