// Subscription API routes.

import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.middleware';
import { supabase } from '../config/supabase';
import { createChildLogger } from '../config/logger';

const logger = createChildLogger('subscription-routes');
const router = Router();

const FREE_LIMITS = {
  monthly_optimizations: 10,
  max_rows_per_upload: 50,
};

// GET /api/subscription — get current subscription for authenticated user's company
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Find user's company_id
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userErr || !userRow?.company_id) {
      // No company — return default free subscription
      res.json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          current_usage: 0,
          monthly_shipment_limit: 100,
          total_optimizations: 0,
          monthly_optimization_limit: FREE_LIMITS.monthly_optimizations,
        },
      });
      return;
    }

    const companyId = userRow.company_id;

    // Try to load existing subscription
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (subErr || !sub) {
      // No subscription exists — count optimization_runs, then create one
      const { count } = await supabase
        .from('optimization_runs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'complete');

      const existingUsage = count ?? 0;

      // Create default free subscription via service_role (bypasses RLS)
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          company_id: companyId,
          plan: 'free',
          status: 'active',
          current_usage: existingUsage,
          monthly_shipment_limit: 100,
        })
        .select('*')
        .single();

      res.json({
        success: true,
        data: {
          plan: 'free',
          status: 'active',
          current_usage: existingUsage,
          monthly_shipment_limit: 100,
          total_optimizations: existingUsage,
          monthly_optimization_limit: FREE_LIMITS.monthly_optimizations,
        },
      });
      return;
    }

    // Count actual optimizations from optimization_runs
    const { count } = await supabase
      .from('optimization_runs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'complete');

    const totalOptimizations = count ?? sub.current_usage ?? 0;
    const isPro = sub.plan === 'growth' || sub.plan === 'enterprise';

    res.json({
      success: true,
      data: {
        plan: sub.plan,
        status: sub.status,
        current_usage: totalOptimizations,
        monthly_shipment_limit: sub.monthly_shipment_limit ?? 100,
        total_optimizations: totalOptimizations,
        monthly_optimization_limit: isPro ? 999999 : FREE_LIMITS.monthly_optimizations,
      },
    });
  } catch (err) {
    logger.error('Subscription fetch error', { error: (err as Error).message });
    // Return default free subscription on error
    res.json({
      success: true,
      data: {
        plan: 'free',
        status: 'active',
        current_usage: 0,
        monthly_shipment_limit: 100,
        total_optimizations: 0,
        monthly_optimization_limit: FREE_LIMITS.monthly_optimizations,
      },
    });
  }
});

// POST /api/subscription/activate — activate a plan after payment
router.post('/activate', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { plan_id } = req.body;

    if (!plan_id || !['pro', 'enterprise'].includes(plan_id)) {
      res.status(400).json({ success: false, error: 'Invalid plan_id. Use "pro" or "enterprise".' });
      return;
    }

    const plan = plan_id === 'enterprise' ? 'enterprise' : 'growth';
    const shipmentLimit = plan === 'enterprise' ? -1 : 10000;

    // Find user's company_id
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userErr || !userRow?.company_id) {
      res.status(400).json({ success: false, error: 'User has no company_id' });
      return;
    }

    const companyId = userRow.company_id;

    // Upsert subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({
          plan,
          status: 'active',
          monthly_shipment_limit: shipmentLimit,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          company_id: companyId,
          plan,
          status: 'active',
          current_usage: 0,
          monthly_shipment_limit: shipmentLimit,
        });
    }

    logger.info('Subscription activated', { userId, plan, companyId });

    res.json({
      success: true,
      data: {
        plan,
        status: 'active',
        monthly_shipment_limit: shipmentLimit,
      },
    });
  } catch (err) {
    logger.error('Subscription activation error', { error: (err as Error).message });
    res.status(500).json({ success: false, error: 'Failed to activate subscription' });
  }
});

export default router;
