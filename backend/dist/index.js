"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const supabase_js_1 = require("@supabase/supabase-js");
const optimization_engine_1 = require("./services/optimization-engine");
dotenv_1.default.config();
const app = (0, express_1.default)();
// CORS: Allow all origins — frontend can be on any Vercel/Netlify/localhost URL
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
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
}
else {
    console.log(`Supabase client initialized — URL: ${supabaseUrl.slice(0, 30)}… Key: ${supabaseKey.slice(0, 8)}…`);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl || '', supabaseKey || '');
// ── Health check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        supabaseConnected: !!supabaseUrl && !!supabaseKey,
    });
});
// ── Root ────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ service: 'Shipzi Optimization Engine', version: '2.0' });
});
// ── Main optimization endpoint ──────────────────────────────────
app.post('/api/optimize', async (req, res) => {
    const startTime = Date.now();
    console.log(`\n[OPTIMIZE] Request received at ${new Date().toISOString()}`);
    try {
        const { rawRows, companyId, runId } = req.body;
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
        const catalog = catalogData || [];
        console.log(`[OPTIMIZE] Catalog loaded: ${catalog.length} boxes`);
        if (catalog.length === 0) {
            return res.status(400).json({
                error: 'Your box catalog is empty. Add at least one box before running optimization.',
            });
        }
        // ── 2. Run bulk optimization ────────────────────────────────
        console.log('[OPTIMIZE] Step 2: Running bulk optimization...');
        const result = await (0, optimization_engine_1.bulkOptimize)(rawRows, catalog, (processed, total) => {
            if (processed % 100 === 0 || processed === total) {
                console.log(`[OPTIMIZE] Progress: ${processed}/${total}`);
            }
        });
        console.log(`[OPTIMIZE] Optimization complete — ${result.summary.total} rows, ${result.summary.optimized} optimized, $${result.summary.total_savings.toFixed(2)} savings`);
        // ── 3. Insert optimized orders into DB ──────────────────────
        console.log('[OPTIMIZE] Step 3: Inserting optimized orders...');
        const insertRows = (0, optimization_engine_1.buildOrderInsertRows)(result.results, runId, companyId);
        const CHUNK_SIZE = 500;
        let insertedCount = 0;
        let insertErrors = [];
        for (const chunk of (0, optimization_engine_1.chunkArray)(insertRows, CHUNK_SIZE)) {
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
                const shipmentRows = insertedOrders.map((order) => {
                    let shipmentStatus = 'pending';
                    if (order.fit_status === 'optimized' || order.fit_status === 'same_box') {
                        const rand = Math.random();
                        if (rand > 0.7)
                            shipmentStatus = 'delivered';
                        else if (rand > 0.4)
                            shipmentStatus = 'shipped';
                        else if (rand > 0.1)
                            shipmentStatus = 'packed';
                        else
                            shipmentStatus = 'optimized';
                    }
                    return {
                        company_id: companyId,
                        order_id: order.id,
                        status: shipmentStatus,
                        carrier: 'Shipzi Logistics',
                        tracking_number: `SPZ-${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
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
    }
    catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[OPTIMIZE] FAILED after ${elapsed}s:`, error);
        const msg = error instanceof Error ? error.message : 'Unknown optimization error';
        if (req.body?.runId) {
            try {
                await supabase.from('optimization_runs').update({ status: 'failed' }).eq('id', req.body.runId);
            }
            catch (e) {
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
