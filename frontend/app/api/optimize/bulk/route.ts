import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { bulkOptimize, buildOrderInsertRows, chunkArray, parseMultiProductRow, selectOptimalBoxMultiProduct } from '@/lib/optimization-engine'
import { CSVRow, CatalogBox } from '@/lib/types'
import crypto from 'crypto'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rows, mode, catalog_id, run_id, company_id } = body as {
      rows: any[],
      mode: 'single' | 'multi',
      catalog_id: string,
      run_id: string,
      company_id: string
    }

    if (!company_id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: catalog, error: catalogError } = await supabase
      .from('box_catalog')
      .select('*')
      .eq('company_id', company_id)
      .or('is_active.eq.true,is_active.is.null')

    if (catalogError || !catalog || catalog.length === 0) {
      return NextResponse.json({ message: 'No active boxes in catalog' }, { status: 400 })
    }

    // ── Run optimization based on mode ──
    let bulkResult: any

    if (mode === 'multi') {
      // ══════════════════════════════════════════════════════════════
      // MULTI-PRODUCT: Each row = one ORDER with multiple products
      // Optimize ONE BOX for ALL products in the order together
      // ══════════════════════════════════════════════════════════════
      const multiResults: any[] = []

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx]
        const orderId = row.order_id || `ORD-${idx + 1}`

        const products = parseMultiProductRow(row)
        if (!products || products.length === 0) {
          console.warn('[MULTI] Skipping row — no valid products:', orderId)
          continue
        }

        console.log(`[MULTI] Order ${orderId}: ${products.length} products → 1 box`)

        const result = selectOptimalBoxMultiProduct(
          orderId,
          products,
          parseFloat(row.used_box_length),
          parseFloat(row.used_box_width),
          parseFloat(row.used_box_height),
          parseFloat(row.used_box_price),
          row.shipping_zone,
          catalog as CatalogBox[],
        )

        multiResults.push({
          ...result,
          order_id: orderId,
          product_names: products.map(p => p.name).join('|'),
          product_count: products.length,
        })
      }

      const optimized = multiResults.filter(r => r.fit_status === 'optimized').length
      const sameBox = multiResults.filter(r => r.fit_status === 'same_box').length
      const noFit = multiResults.filter(r => r.fit_status === 'no_fit').length
      const totalSavings = multiResults.reduce((s, r) => s + r.savings, 0)
      const avgUtil = multiResults.length
        ? multiResults.reduce((s, r) => s + r.utilization_pct, 0) / multiResults.length
        : 0

      bulkResult = {
        results: multiResults,
        invalidRows: [],
        summary: {
          total: rows.length,
          valid: multiResults.length,
          invalid: rows.length - multiResults.length,
          optimized,
          same_box: sameBox,
          no_fit: noFit,
          total_savings: parseFloat(totalSavings.toFixed(2)),
          avg_utilization: parseFloat(avgUtil.toFixed(1)),
          ml_used: false,
        },
      }

    } else {
      // ══════════════════════════════════════════════════════════════
      // SINGLE-PRODUCT: Each row = one product → optimize individually
      // ══════════════════════════════════════════════════════════════
      bulkResult = await bulkOptimize(rows as CSVRow[], catalog as CatalogBox[])
    }

    // ── 1. Insert optimized orders ──
    const insertRows = buildOrderInsertRows(bulkResult.results, run_id, company_id)
    const chunks = chunkArray(insertRows, 500)
    const allInsertedOrders: { id: string; fit_status: string }[] = []

    const insertErrors: string[] = []
    for (const chunk of chunks) {
      const { data: inserted, error } = await supabase
        .from('optimized_orders')
        .insert(chunk)
        .select('id, fit_status')
      if (error) {
        console.error('Chunk insert error:', error)
        insertErrors.push(error.message)
      }
      if (inserted) allInsertedOrders.push(...inserted)
    }
    if (insertErrors.length > 0 && allInsertedOrders.length === 0) {
      return NextResponse.json(
        { success: false, message: `Failed to save orders to database: ${insertErrors[0]}` },
        { status: 500 }
      )
    }

    // ── 2. Create shipments for each inserted order ──
    if (allInsertedOrders.length > 0) {
      const shipmentRows = allInsertedOrders.map((order) => {
        let shipmentStatus = 'pending'
        if (order.fit_status === 'optimized' || order.fit_status === 'same_box') {
          shipmentStatus = 'packed'
        }
        return {
          company_id,
          order_id: order.id,
          status: shipmentStatus,
          carrier: 'Shipzi Logistics',
          tracking_number: `SPZ-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        }
      })

      const shipmentChunks = chunkArray(shipmentRows, 500)
      for (const chunk of shipmentChunks) {
        const { error: shipErr } = await supabase.from('shipments').insert(chunk)
        if (shipErr) {
          console.error('Shipment insert error:', shipErr)
        }
      }
    }

    // ── 3. Update optimization run status ──
    const { data: currentRun } = await supabase.from('optimization_runs').select('total_products, total_savings_usd').eq('id', run_id).single();
    await supabase.from('optimization_runs').update({
      total_products: (currentRun?.total_products || 0) + bulkResult.summary.total,
      total_savings_usd: (currentRun?.total_savings_usd || 0) + bulkResult.summary.total_savings,
      avg_utilization_pct: bulkResult.summary.avg_utilization,
      status: 'complete'
    }).eq('id', run_id)

    // ── 4. Update analytics snapshot ──
    const today = new Date().toISOString().slice(0, 10)
    const { data: existingSnap } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('company_id', company_id)
      .eq('snapshot_date', today)
      .single()

    const newTotal = (existingSnap?.total_shipments || 0) + bulkResult.summary.total
    const newOptimized = (existingSnap?.optimized_shipments || 0) + bulkResult.summary.optimized
    const newSavings = (existingSnap?.total_savings_usd || 0) + bulkResult.summary.total_savings

    await supabase.from('analytics_snapshots').upsert({
      company_id,
      snapshot_date: today,
      total_shipments: newTotal,
      optimized_shipments: newOptimized,
      total_savings_usd: newSavings,
      avg_utilization_pct: bulkResult.summary.avg_utilization,
      optimization_rate_pct: newTotal > 0
        ? parseFloat(((newOptimized / newTotal) * 100).toFixed(1))
        : 0,
    }, { onConflict: 'company_id,snapshot_date' })

    // ── 5. Create sustainability metrics ──
    const carbonReduction = bulkResult.summary.total_savings * 0.15
    const wasteReduction = bulkResult.summary.avg_utilization > 0
      ? Math.round((1 - bulkResult.summary.avg_utilization / 100) * 50)
      : 0

    const { data: existingSustain } = await supabase
      .from('sustainability_metrics')
      .select('*')
      .eq('company_id', company_id)
      .eq('metric_date', today)
      .single()

    const newCarbon = (existingSustain?.carbon_reduction_kg || 0) + carbonReduction

    await supabase.from('sustainability_metrics').upsert({
      company_id,
      metric_date: today,
      carbon_reduction_kg: parseFloat(newCarbon.toFixed(2)),
      packaging_waste_reduction_pct: wasteReduction,
      recyclable_material_pct: 75,
      sustainability_score: Math.min(100, Math.round(bulkResult.summary.avg_utilization + 20)),
    }, { onConflict: 'company_id,metric_date' })

    console.log(`[API/optimize/bulk] Success — ${bulkResult.summary.valid} rows, ${bulkResult.summary.optimized} optimized, $${bulkResult.summary.total_savings} savings, ML: ${bulkResult.summary.ml_used ? 'YES' : 'NO'}`)

    return NextResponse.json({
      success: true,
      run_id,
      summary: {
        ...bulkResult.summary,
        ml_used: bulkResult.summary.ml_used ?? false,
      },
      invalidRows: bulkResult.invalidRows || [],
      results: bulkResult.results || []
    })
  } catch (error: any) {
    console.error('Optimization error:', error)
    return NextResponse.json({ message: error.message || 'Optimization failed' }, { status: 500 })
  }
}
