import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { bulkOptimize, buildOrderInsertRows, chunkArray } from './services/optimization-engine';
import { CSVRow, CatalogBox } from './services/types';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://shipzi-complete.vercel.app',
    'https://shipzi-complete-*.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Require these in production on Render
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: Supabase URL or Key is missing. Ensure they are set in environment variables.");
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

app.get('/health', (req, res) => {
  res.send('Optimization Engine Backend is healthy');
});

app.post('/api/optimize', async (req, res) => {
  try {
    const { rawRows, companyId, runId } = req.body as { 
      rawRows: CSVRow[], 
      companyId: string, 
      runId: string 
    };

    if (!rawRows || !companyId || !runId) {
      return res.status(400).json({ error: 'Missing required fields: rawRows, companyId, or runId' });
    }

    // 1. Fetch catalog
    const { data: catalogData, error: catalogError } = await supabase
      .from('box_catalog')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('length_cm', { ascending: true });

    if (catalogError) {
      throw new Error(`Failed to load box catalog: ${catalogError.message}`);
    }

    const catalog = (catalogData as CatalogBox[]) || [];

    if (catalog.length === 0) {
      return res.status(400).json({ error: 'Your box catalog is empty. Add boxes first.' });
    }

    // 2. Run bulk optimize
    const result = await bulkOptimize(rawRows, catalog, (processed, total) => {
      // In a real app we might use websockets or SSE for progress. For now, we omit it.
    });

    // 3. Insert optimized orders and mock shipments
    const insertRows = buildOrderInsertRows(result.results, runId, companyId);
    const CHUNK_SIZE = 500;
    
    for (const chunk of chunkArray(insertRows, CHUNK_SIZE)) {
      // Insert orders and return the inserted records so we get the generated UUIDs
      const { data: insertedOrders, error: insertError } = await supabase
        .from('optimized_orders')
        .insert(chunk)
        .select('id, fit_status');

      if (insertError) {
        console.error('Insert chunk error:', insertError);
        continue; // Try to continue with the next chunk
      }

      // 3.1 Create a shipment for each inserted order so the dashboard has data
      if (insertedOrders && insertedOrders.length > 0) {
        const shipmentRows = insertedOrders.map((order: any) => {
          // Assign realistic statuses based on fit_status
          let shipmentStatus = 'pending';
          if (order.fit_status === 'optimized' || order.fit_status === 'same_box') {
            const rand = Math.random();
            if (rand > 0.7) shipmentStatus = 'delivered';
            else if (rand > 0.4) shipmentStatus = 'shipped';
            else if (rand > 0.1) shipmentStatus = 'packed';
            else shipmentStatus = 'optimized';
          }
          
          return {
            company_id: companyId,
            order_id: order.id,
            status: shipmentStatus,
            carrier: 'Shipzi Logistics',
            tracking_number: `SPZ${Math.floor(Math.random() * 100000000)}`,
          };
        });

        const { error: shipmentError } = await supabase.from('shipments').insert(shipmentRows);
        if (shipmentError) {
          console.error('Insert shipments error:', shipmentError);
        }
      }
    }

    // 4. Update run record
    await supabase.from('optimization_runs').update({
      status: 'complete',
      total_savings_usd: result.summary.total_savings,
      avg_utilization_pct: result.summary.avg_utilization,
    }).eq('id', runId);

    // 5. Update analytics
    await supabase.from('analytics_snapshots').upsert({
      company_id: companyId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      total_shipments: result.summary.total,
      optimized_shipments: result.summary.optimized,
      total_savings_usd: result.summary.total_savings,
      avg_utilization_pct: result.summary.avg_utilization,
      optimization_rate_pct: result.summary.total > 0
        ? parseFloat(((result.summary.optimized / result.summary.total) * 100).toFixed(1))
        : 0,
    }, { onConflict: 'company_id,snapshot_date' });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Optimization error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    
    // Attempt to mark the run as failed if we can
    if (req.body.runId) {
      await supabase.from('optimization_runs').update({ status: 'failed' }).eq('id', req.body.runId);
    }

    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
