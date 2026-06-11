import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { bulkOptimize, buildOrderInsertRows, chunkArray } from '@/lib/optimization-engine'
import { CSVRow, CatalogBox } from '@/lib/types'

export const maxDuration = 60 // 60 seconds timeout (if on Vercel)

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
      .eq('is_active', true)

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

    const insertRows = buildOrderInsertRows(bulkResult.results, run_id, company_id)
    const chunks = chunkArray(insertRows, 500)

    for (const chunk of chunks) {
      const { error } = await supabase.from('optimized_orders').insert(chunk)
      if (error) {
        console.error('Chunk insert error:', error)
      }
    }

    await supabase.from('optimization_runs').update({
      total_rows: bulkResult.summary.total,
      optimized_rows: bulkResult.summary.optimized,
      total_savings_usd: bulkResult.summary.total_savings,
      avg_utilization_pct: bulkResult.summary.avg_utilization,
      invalid_rows: (bulkResult.invalidRows || []).length,
      status: 'complete'
    }).eq('id', run_id)

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
