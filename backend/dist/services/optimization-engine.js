"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCSVRow = validateCSVRow;
exports.selectOptimalBox = selectOptimalBox;
exports.bulkOptimize = bulkOptimize;
exports.buildOrderInsertRows = buildOrderInsertRows;
exports.chunkArray = chunkArray;
// =============================================
// SHIPZI — Optimization Engine
// Handles 2,000–10,000 CSV rows safely
// =============================================
const types_1 = require("./types");
// ── CSV Row Validator ──────────────────────────────────────────────
function validateCSVRow(raw, rowIndex) {
    const errors = [];
    const pl = parseFloat(raw.product_length);
    const pw = parseFloat(raw.product_width);
    const ph = parseFloat(raw.product_height);
    const ubl = parseFloat(raw.used_box_length);
    const ubw = parseFloat(raw.used_box_width);
    const ubh = parseFloat(raw.used_box_height);
    const fs = parseFloat(raw.fragility_score);
    const ubp = parseFloat(raw.used_box_price);
    if (!raw.product_name?.trim())
        errors.push('product_name is required');
    if (isNaN(pl) || pl <= 0)
        errors.push('product_length must be > 0');
    if (isNaN(pw) || pw <= 0)
        errors.push('product_width must be > 0');
    if (isNaN(ph) || ph <= 0)
        errors.push('product_height must be > 0');
    if (isNaN(ubl) || ubl <= 0)
        errors.push('used_box_length must be > 0');
    if (isNaN(ubw) || ubw <= 0)
        errors.push('used_box_width must be > 0');
    if (isNaN(ubh) || ubh <= 0)
        errors.push('used_box_height must be > 0');
    if (isNaN(fs) || fs < 0 || fs > 10)
        errors.push('fragility_score must be 0–10');
    if (isNaN(ubp) || ubp < 0)
        errors.push('used_box_price must be >= 0');
    if (!raw.shipping_zone?.trim())
        errors.push('shipping_zone is required');
    if (errors.length > 0)
        return { valid: false, errors, row: null };
    // Ensure product fits in the used box (basic sanity)
    if (pl > ubl || pw > ubw || ph > ubh) {
        errors.push('Product dimensions exceed used_box dimensions — data may be incorrect');
        // Still parse — we warn but don't reject outright
    }
    const row = {
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
    };
    return { valid: errors.length === 0, errors, row };
}
// ── Fragility padding (cm added to each dimension) ────────────────
function fragilityPadding(score) {
    if (score >= 8)
        return 3.0; // very fragile — needs buffer
    if (score >= 5)
        return 1.5; // medium fragile
    return 0.5; // robust
}
// ── Core box selector ──────────────────────────────────────────────
function selectOptimalBox(product, catalog) {
    const pad = fragilityPadding(product.fragility_score);
    // Minimum safe box dimensions for this product
    const minL = product.product_length + pad;
    const minW = product.product_width + pad;
    const minH = product.product_height + pad;
    const minWeight = product.weight_kg * product.quantity;
    // Filter boxes that safely fit the product
    const fittingBoxes = catalog.filter(b => b.length_cm >= minL &&
        b.width_cm >= minW &&
        b.height_cm >= minH &&
        b.max_weight_kg >= minWeight);
    const originalBoxDims = `${product.used_box_length}×${product.used_box_width}×${product.used_box_height}`;
    const originalBoxVol = product.used_box_length * product.used_box_width * product.used_box_height;
    const productVol = product.product_length * product.product_width * product.product_height * product.quantity;
    const originalDimWeight = (0, types_1.calcDimWeight)(product.used_box_length, product.used_box_width, product.used_box_height);
    const originalShipping = (0, types_1.calcShippingCost)(originalDimWeight, product.weight_kg * product.quantity, product.shipping_zone);
    const originalTotalCost = product.used_box_price + originalShipping;
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
        };
    }
    // Score each fitting box: prioritize smaller volume (tight fit) + lower cost + eco score
    const scored = fittingBoxes.map(box => {
        const boxVol = box.length_cm * box.width_cm * box.height_cm;
        const utilization = Math.min((productVol / boxVol) * 100, 100);
        const dimWeight = (0, types_1.calcDimWeight)(box.length_cm, box.width_cm, box.height_cm);
        const shippingCost = (0, types_1.calcShippingCost)(dimWeight, product.weight_kg * product.quantity, product.shipping_zone);
        const totalCost = box.cost_per_box_usd + shippingCost;
        // Composite score: higher utilization = smaller box = better
        // Lower total cost = better; Higher eco score = better
        const score = (utilization * 0.55) + ((1 / (totalCost + 0.01)) * 25) + (box.sustainability_score * 0.15);
        return { box, utilization, dimWeight, shippingCost, totalCost, score };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    const bestBoxDims = `${best.box.length_cm}×${best.box.width_cm}×${best.box.height_cm}`;
    const optimizedTotalCost = best.totalCost;
    const savings = parseFloat(Math.max(0, originalTotalCost - optimizedTotalCost).toFixed(2));
    // Determine fit status
    const isSameBox = best.box.length_cm === product.used_box_length &&
        best.box.width_cm === product.used_box_width &&
        best.box.height_cm === product.used_box_height;
    const fitStatus = isSameBox ? 'same_box' : 'optimized';
    // Build human-readable reason
    let reason;
    if (fitStatus === 'optimized') {
        const volReduction = Math.round((1 - (best.box.length_cm * best.box.width_cm * best.box.height_cm) / originalBoxVol) * 100);
        reason = `Switched from ${originalBoxDims}cm to ${bestBoxDims}cm — ${volReduction > 0 ? `${volReduction}% smaller volume` : 'comparable size'}, saving $${savings.toFixed(2)} per shipment (box + dimensional weight). Fragility score ${product.fragility_score}/10 — ${fragilityPadding(product.fragility_score)}cm padding applied.`;
    }
    else {
        reason = `Current box is already optimal for this product. No smaller valid box exists in catalog with required ${minL.toFixed(1)}×${minW.toFixed(1)}×${minH.toFixed(1)}cm minimum.`;
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
        savings,
        fit_status: fitStatus,
        optimization_reason: reason,
        utilization_pct: parseFloat(best.utilization.toFixed(1)),
        dimensional_weight_kg: best.dimWeight,
        sustainability_score: best.box.sustainability_score,
        parsed_product: product,
        recommended_box: best.box,
    };
}
async function bulkOptimize(rawRows, catalog, onProgress) {
    const results = [];
    const invalidRows = [];
    const CHUNK = 200; // process in chunks to avoid blocking the main thread
    for (let i = 0; i < rawRows.length; i += CHUNK) {
        const chunk = rawRows.slice(i, i + CHUNK);
        for (let j = 0; j < chunk.length; j++) {
            const rawRow = chunk[j];
            const rowIndex = i + j;
            try {
                const validation = validateCSVRow(rawRow, rowIndex);
                if (!validation.valid || !validation.row) {
                    invalidRows.push({ rowIndex, errors: validation.errors });
                    continue;
                }
                const result = selectOptimalBox(validation.row, catalog);
                results.push(result);
            }
            catch (err) {
                // One bad row must never break the batch
                invalidRows.push({
                    rowIndex,
                    errors: [err instanceof Error ? err.message : 'Unknown processing error'],
                });
            }
        }
        // Yield to event loop between chunks so UI stays responsive
        if (i + CHUNK < rawRows.length) {
            await new Promise(r => setTimeout(r, 0));
        }
        onProgress?.(Math.min(i + CHUNK, rawRows.length), rawRows.length);
    }
    const optimized = results.filter(r => r.fit_status === 'optimized').length;
    const sameBox = results.filter(r => r.fit_status === 'same_box').length;
    const noFit = results.filter(r => r.fit_status === 'no_fit').length;
    const totalSavings = results.reduce((s, r) => s + r.savings, 0);
    const avgUtil = results.length
        ? results.reduce((s, r) => s + r.utilization_pct, 0) / results.length
        : 0;
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
    };
}
// ── Build Supabase insert rows from results ────────────────────────
function buildOrderInsertRows(results, runId, companyId) {
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
    }));
}
// ── Chunk array for Supabase (max 500 per insert) ─────────────────
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
