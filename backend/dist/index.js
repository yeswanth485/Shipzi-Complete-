"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const optimization_engine_1 = require("./services/optimization-engine");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// Require these in production on Render
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.warn("WARNING: Supabase URL or Key is missing. Ensure they are set in environment variables.");
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl || '', supabaseKey || '');
app.get('/health', (req, res) => {
    res.send('Optimization Engine Backend is healthy');
});
app.post('/api/optimize', async (req, res) => {
    try {
        const { rawRows, companyId, runId } = req.body;
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
        const catalog = catalogData || [];
        if (catalog.length === 0) {
            return res.status(400).json({ error: 'Your box catalog is empty. Add boxes first.' });
        }
        // 2. Run bulk optimize
        const result = await (0, optimization_engine_1.bulkOptimize)(rawRows, catalog, (processed, total) => {
            // In a real app we might use websockets or SSE for progress. For now, we omit it.
        });
        // 3. Insert optimized orders
        const insertRows = (0, optimization_engine_1.buildOrderInsertRows)(result.results, runId, companyId);
        const CHUNK_SIZE = 500;
        for (const chunk of (0, optimization_engine_1.chunkArray)(insertRows, CHUNK_SIZE)) {
            const { error: insertError } = await supabase.from('optimized_orders').insert(chunk);
            if (insertError) {
                console.error('Insert chunk error:', insertError);
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
    }
    catch (error) {
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
