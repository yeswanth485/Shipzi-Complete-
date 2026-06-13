import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { bulkOptimize, buildOrderInsertRows, chunkArray } from '@/lib/optimization-engine'
import { CSVRow, CatalogBox } from '@/lib/types'
import crypto from 'crypto'

export const maxDuration = 60

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

    let processedRows: CSVRow[] = []

    if (mode === 'multi') {
      for (const row of rows) {
        if (!row.product_names) continue
        const names = row.product_names.split('|')
        const lengths = row.product_lengths.split('|')
        const widths = row.product_widths.split('|')
        const heights = row.product_heights.split('|')
        const fragilities = row.product_fragilities ? row.product_fragilities.split('|') : []

        if (lengths.length !== names.length || widths.length !== names.length || heights.length !== names.length) {
          console.warn('Mismatched pipe-delimited fields for row', row)
          continue
        }

        for (let i = 0; i < names.length; i++) {
          processedRows.push({
            product_name: names[i],
            product_length: lengths[i],
            product_width: widths[i],
            product_height: heights[i],
            fragility_score: fragilities[i] || '0',
            used_box_length: row.used_box_length,
            used_box_width: row.used_box_width,
            used_box_height: row.used_box_height,
            used_box_price: row.used_box_price,
            shipping_zone: row.shipping_zone,
          })
        }
      }
    } else {
      processedRows = rows
    }

    const bulkResult = await bulkOptimize(processedRows, catalog as CatalogBox[])

    // ── 1. Insert optimized orders ──
    const insertRows = buildOrderInsertRows(bulkResult.results, run_id, company_id)
    const chunks = chunkArray(insertRows, 500)
    const allInsertedOrders: { id: string; fit_status: string }[] = []

    for (const chunk of chunks) {
      const { data: inserted, error } = await supabase
        .from('optimized_orders')
        .insert(chunk)
        .select('id, fit_status')
      if (error) {
        console.error('Chunk insert error:', error)
      }
      if (inserted) allInsertedOrders.push(...inserted)
    }

    // ── 2. Create shipments for each inserted order ──
    if (allInsertedOrders.length > 0) {
      const shipmentRows = allInsertedOrders.map((order) => {
        let shipmentStatus = 'pending'
        if (order.fit_status === 'optimized' || order.fit_status === 'same_box') {
          const rand = Math.random()
          if (rand > 0.7) shipmentStatus = 'delivered'
          else if (rand > 0.4) shipmentStatus = 'shipped'
          else if (rand > 0.1) shipmentStatus = 'packed'
          else shipmentStatus = 'optimized'
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
        if (shipErr) console.error('Shipment insert error:', shipErr)
      }
    }

    // ── 3. Update optimization run status (Accumulate) ──
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

    return NextResponse.json({
      success: true,
      run_id,
      summary: bulkResult.summary,
      invalidRows: bulkResult.invalidRows || [],
      results: bulkResult.results || []
    })
  } catch (error: any) {
    console.error('Optimization error:', error)
    return NextResponse.json({ message: error.message || 'Optimization failed' }, { status: 500 })
  }
}
