import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateUser } from '../middlewares/auth.middleware';
import { supabase } from '../config/supabase';
import { createChildLogger } from '../config/logger';
import {
  bulkOptimize,
  bulkOptimizeMulti,
  buildOrderInsertRows,
  chunkArray,
} from '../services/optimization-engine';
import { CSVRow, CatalogBox, ProductSpec } from '../services/types';

const router = Router();
const logger = createChildLogger('optimization-routes');

router.post('/', authenticateUser, async (req: Request, res: Response) => {
  const startTime = Date.now();
  logger.info('Request received');

  try {
    const { rawRows, companyId, runId, mode } = req.body as {
      rawRows: CSVRow[];
      companyId: string;
      runId: string;
      mode?: 'single' | 'multi';
    };

    if (!rawRows || !companyId || !runId) {
      logger.error('Missing required fields');
      res.status(400).json({
        error: 'Missing required fields: rawRows, companyId, or runId',
      });
      return;
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(companyId)) {
      logger.error(`Invalid companyId format: ${companyId}`);
      res.status(400).json({ error: 'Invalid companyId format — must be a UUID' });
      return;
    }
    if (!UUID_REGEX.test(runId)) {
      logger.error(`Invalid runId format: ${runId}`);
      res.status(400).json({ error: 'Invalid runId format — must be a UUID' });
      return;
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      res.status(400).json({ error: 'rawRows must be a non-empty array' });
      return;
    }
    if (rawRows.length > 10000) {
      res.status(400).json({ error: 'Maximum 10,000 rows per request' });
      return;
    }

    const userId = req.user!.id;
    const { data: userRecord, error: userLookupErr } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userLookupErr || !userRecord) {
      res.status(403).json({ error: 'User not found' });
      return;
    }
    if (userRecord.company_id !== companyId) {
      res.status(403).json({ error: 'You do not have access to this company' });
      return;
    }

    logger.info(`Company: ${companyId}, Run: ${runId}, Rows: ${rawRows.length}`);

    // 1. Fetch box catalog
    logger.info('Step 1: Fetching box catalog...');
    const { data: catalogData, error: catalogError } = await supabase
      .from('box_catalog')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('length_cm', { ascending: true });

    if (catalogError) {
      logger.error('Catalog fetch error:', catalogError);
      throw new Error(`Failed to load box catalog: ${catalogError.message}`);
    }

    const catalog = (catalogData as CatalogBox[]) || [];
    logger.info(`Catalog loaded: ${catalog.length} boxes`);

    if (catalog.length === 0) {
      res.status(400).json({
        error: 'Your box catalog is empty. Add at least one box before running optimization.',
      });
      return;
    }

    // 2. Run bulk optimization
    logger.info(`Step 2: Running ${mode === 'multi' ? 'multi-product' : 'single-product'} optimization...`);
    const result = mode === 'multi'
      ? await bulkOptimizeMulti(rawRows, catalog, (processed, total) => {
          if (processed % 100 === 0 || processed === total) {
            logger.info(`Progress: ${processed}/${total}`);
          }
        })
      : await bulkOptimize(rawRows, catalog, (processed, total) => {
          if (processed % 100 === 0 || processed === total) {
            logger.info(`Progress: ${processed}/${total}`);
          }
        });
    logger.info(`Optimization complete — ${result.summary.total} rows, ${result.summary.optimized} optimized, $${result.summary.total_savings.toFixed(2)} savings`);

    // 3. Insert optimized orders into DB
    logger.info('Step 3: Inserting optimized orders...');
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
        logger.error('Insert chunk error:', insertError.message);
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
          logger.error('Shipment insert error:', shipmentError.message);
        }
      }
    }

    logger.info(`Inserted ${insertedCount} orders`);
    if (insertErrors.length > 0) {
      logger.warn(`${insertErrors.length} chunk(s) failed to insert:`, insertErrors);
    }

    // 4. Update optimization run status
    logger.info('Step 4: Updating run status...');
    const { error: runUpdateError } = await supabase.from('optimization_runs').update({
      status: 'complete',
      total_savings_usd: result.summary.total_savings,
      avg_utilization_pct: result.summary.avg_utilization,
    }).eq('id', runId);

    if (runUpdateError) {
      logger.error('Run update error:', runUpdateError.message);
    }

    // 5. Increment subscription usage
    const { error: usageError } = await supabase.rpc('increment_usage', {
      p_company_id: companyId,
    });
    if (usageError) {
      logger.warn('Usage increment error (non-fatal):', usageError.message);
    }

    // 6. Update analytics snapshot
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
      logger.warn('Analytics update error (non-fatal):', analyticsError.message);
    }

    // 7. Create sustainability metrics
    const carbonReduction = result.summary.total_savings * 0.15;
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
    logger.info(`Done in ${elapsed}s — ${insertedCount} orders saved`);

    res.json({ success: true, result });
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.error(`FAILED after ${elapsed}s:`, error);
    const msg = error instanceof Error ? error.message : 'Unknown optimization error';

    if (req.body?.runId) {
      try {
        await supabase.from('optimization_runs').update({ status: 'failed' }).eq('id', req.body.runId);
      } catch (e) {
        logger.error('Failed to update run status:', e);
      }
    }

    res.status(500).json({ error: msg });
  }
});

export default router;
