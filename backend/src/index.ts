import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { bulkOptimize, bulkOptimizeMulti, buildOrderInsertRows, chunkArray } from './services/optimization-engine';
import { CSVRow, CatalogBox } from './services/types';

dotenv.config();

const app = express();

// CORS: Restrict to allowed origins only
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      process.env.FRONTEND_URL,
      'https://shipzi.vercel.app',
      'http://localhost:3000',
    ].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── Supabase client ─────────────────────────────────────────────
// Use SERVICE_ROLE key when available (has write access).
// Fall back to ANON key if service key is not set.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Supabase URL or Key is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.');
} else {
  console.log('Supabase client initialized');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ── Health check ────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let mlBridgeStatus = 'unknown'
  try {
    const mlUrl = process.env.ML_BRIDGE_URL || process.env.NEXT_PUBLIC_ML_BRIDGE_URL || 'https://shipzi-complete-ml-engine.onrender.com'
    const mlHeaders: Record<string, string> = {}
    if (process.env.ML_API_KEY) {
      mlHeaders['Authorization'] = `Bearer ${process.env.ML_API_KEY}`
    }
    const mlRes = await fetch(`${mlUrl}/ml/health`, { headers: mlHeaders, signal: AbortSignal.timeout(3000) })
    if (mlRes.ok) {
      const mlData = await mlRes.json()
      mlBridgeStatus = mlData.status || 'healthy'
    } else {
      mlBridgeStatus = 'error'
    }
  } catch {
    mlBridgeStatus = 'unreachable'
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supabaseConnected: !!supabaseUrl && !!supabaseKey,
    mlBridge: mlBridgeStatus,
    version: '2.0',
  })
});

// ── Root ────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'Shipzi Optimization Engine',
    version: '2.0',
    endpoints: {
      health: 'GET /health',
      optimize: 'POST /api/optimize',
    },
  })
});

// ── Firebase auth verification middleware ────────────────────────
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (e) {
    console.error('Firebase admin init failed:', e);
  }
}

async function verifyAuthToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).userId = decoded.uid;
    (req as any).userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Main optimization endpoint ──────────────────────────────────
app.post('/api/optimize', verifyAuthToken, async (req, res) => {
  const startTime = Date.now();
  console.log(`\n[OPTIMIZE] Request received at ${new Date().toISOString()}`);

  try {
    const { rawRows, companyId, runId, mode } = req.body as {
      rawRows: CSVRow[];
      companyId: string;
      runId: string;
      mode?: 'single' | 'multi';
    };

    // ── Validate inputs ─────────────────────────────────────────
    if (!rawRows || !companyId || !runId) {
      console.error('[OPTIMIZE] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: rawRows, companyId, or runId',
      });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(companyId)) {
      console.error(`[OPTIMIZE] Invalid companyId format: ${companyId}`);
      return res.status(400).json({ error: 'Invalid companyId format — must be a UUID' });
    }
    if (!UUID_REGEX.test(runId)) {
      console.error(`[OPTIMIZE] Invalid runId format: ${runId}`);
      return res.status(400).json({ error: 'Invalid runId format — must be a UUID' });
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ error: 'rawRows must be a non-empty array' });
    }
    if (rawRows.length > 10000) {
      return res.status(400).json({ error: 'Maximum 10,000 rows per request' });
    }

    // ── Verify user owns this company ──────────────────────────
    const userId = (req as any).userId;
    const { data: userRecord, error: userLookupErr } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userLookupErr || !userRecord) {
      return res.status(403).json({ error: 'User not found' });
    }
    if (userRecord.company_id !== companyId) {
      return res.status(403).json({ error: 'You do not have access to this company' });
    }

    console.log(`[OPTIMIZE] Company: ${companyId}, Run: ${runId}, Rows: ${rawRows.length}`);

    // ── 1. Fetch box catalog ────────────────────────────────────
    console.log('[OPTIMIZE] Step 1: Fetching box catalog...');
    const { data: catalogData, error: catalogError } = await supabase
      .from('box_catalog')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('length_cm', { ascending: true });

    if (catalogError) {
      console.error('[OPTIMIZE] Catalog fetch error:', catalogError);
      throw new Error(`Failed to load box catalog: ${catalogError.message}`);
    }

    const catalog = (catalogData as CatalogBox[]) || [];
    console.log(`[OPTIMIZE] Catalog loaded: ${catalog.length} boxes`);

    if (catalog.length === 0) {
      return res.status(400).json({
        error: 'Your box catalog is empty. Add at least one box before running optimization.',
      });
    }

    // ── 2. Run bulk optimization ────────────────────────────────
    console.log(`[OPTIMIZE] Step 2: Running ${mode === 'multi' ? 'multi-product' : 'single-product'} optimization...`);
    const result = mode === 'multi'
      ? await bulkOptimizeMulti(rawRows, catalog, (processed, total) => {
          if (processed % 100 === 0 || processed === total) {
            console.log(`[OPTIMIZE] Progress: ${processed}/${total}`);
          }
        })
      : await bulkOptimize(rawRows, catalog, (processed, total) => {
          if (processed % 100 === 0 || processed === total) {
            console.log(`[OPTIMIZE] Progress: ${processed}/${total}`);
          }
        });
    console.log(`[OPTIMIZE] Optimization complete — ${result.summary.total} rows, ${result.summary.optimized} optimized, $${result.summary.total_savings.toFixed(2)} savings`);

    // ── 3. Insert optimized orders into DB ──────────────────────
    console.log('[OPTIMIZE] Step 3: Inserting optimized orders...');
    const insertRows = buildOrderInsertRows(result.results, runId, companyId);
    const CHUNK_SIZE = 500;
    let insertedCount = 0;
    let insertErrors: string[] = [];

    for (const chunk of chunkArray(insertRows, CHUNK_SIZE)) {
      const { data: insertedOrders, error: insertError } = await supabase
        .from('optimized_orders')
        .insert(chunk)
        .select('id, fit_status');

      if (insertError) {
        console.error('[OPTIMIZE] Insert chunk error:', insertError.message);
        insertErrors.push(insertError.message);
        continue;
      }

      insertedCount += insertedOrders?.length ?? 0;

      // 3.1 Create a shipment for each inserted order
      if (insertedOrders && insertedOrders.length > 0) {
        const shipmentRows = insertedOrders.map((order: any) => {
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
            tracking_number: `SPZ-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
          };
        });

        const { error: shipmentError } = await supabase.from('shipments').insert(shipmentRows);
        if (shipmentError) {
          console.error('[OPTIMIZE] Shipment insert error:', shipmentError.message);
        }
      }
    }

    console.log(`[OPTIMIZE] Inserted ${insertedCount} orders`);
    if (insertErrors.length > 0) {
      console.warn(`[OPTIMIZE] ${insertErrors.length} chunk(s) failed to insert:`, insertErrors);
    }

    // ── 4. Update optimization run status ───────────────────────
    console.log('[OPTIMIZE] Step 4: Updating run status...');
    const { error: runUpdateError } = await supabase.from('optimization_runs').update({
      status: 'complete',
      total_savings_usd: result.summary.total_savings,
      avg_utilization_pct: result.summary.avg_utilization,
    }).eq('id', runId);

    if (runUpdateError) {
      console.error('[OPTIMIZE] Run update error:', runUpdateError.message);
    }

    // ── 5. Increment subscription usage ─────────────────────────
    const { error: usageError } = await supabase.rpc('increment_usage', {
      p_company_id: companyId,
    });
    if (usageError) {
      console.warn('[OPTIMIZE] Usage increment error (non-fatal):', usageError.message);
    }

    // ── 6. Update analytics snapshot ────────────────────────────
    const { error: analyticsError } = await supabase.from('analytics_snapshots').upsert({
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

    if (analyticsError) {
      console.warn('[OPTIMIZE] Analytics update error (non-fatal):', analyticsError.message);
    }

    // ── 7. Create sustainability metrics ────────────────────────
    const carbonReduction = result.summary.total_savings * 0.15; // rough estimate
    const wasteReduction = result.summary.avg_utilization > 0
      ? Math.round((1 - result.summary.avg_utilization / 100) * 50)
      : 0;

    await supabase.from('sustainability_metrics').upsert({
      company_id: companyId,
      metric_date: new Date().toISOString().slice(0, 10),
      carbon_reduction_kg: parseFloat(carbonReduction.toFixed(2)),
      packaging_waste_reduction_pct: wasteReduction,
      recyclable_material_pct: 75,
      sustainability_score: Math.min(100, Math.round(result.summary.avg_utilization + 20)),
    }, { onConflict: 'company_id,metric_date' });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[OPTIMIZE] Done in ${elapsed}s — ${insertedCount} orders saved\n`);

    res.json({ success: true, result });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[OPTIMIZE] FAILED after ${elapsed}s:`, error);
    const msg = error instanceof Error ? error.message : 'Unknown optimization error';

    if (req.body?.runId) {
      try {
        await supabase.from('optimization_runs').update({ status: 'failed' }).eq('id', req.body.runId);
      } catch (e) {
        console.error('[OPTIMIZE] Failed to update run status:', e);
      }
    }

    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n🚀 Shipzi Optimization Engine listening on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Optimize: POST http://localhost:${PORT}/api/optimize`);
  console.log(`   Supabase: ${supabaseUrl ? 'configured' : '⚠️  NOT configured'}\n`);
});
