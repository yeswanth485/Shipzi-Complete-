// Test-only endpoint: simulates Razorpay payment success and upgrades subscription.
// Only works in development mode or when TEST_UPGRADE_ENABLED=true.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const PLAN_LIMITS: Record<string, { plan: string; monthly_shipment_limit: number; monthly_optimization_limit: number; max_rows_per_upload: number }> = {
  pro: { plan: 'growth', monthly_shipment_limit: 10000, monthly_optimization_limit: 999999, max_rows_per_upload: 10000 },
  enterprise: { plan: 'enterprise', monthly_shipment_limit: -1, monthly_optimization_limit: 999999, max_rows_per_upload: 100000 },
}

export async function POST(req: Request) {
  // Only allow when explicitly enabled via NEXT_PUBLIC_TEST_MODE
  const isEnabled = process.env.NEXT_PUBLIC_TEST_MODE === 'true' || process.env.TEST_UPGRADE_ENABLED === 'true'
  if (!isEnabled) {
    return NextResponse.json({ error: 'Test upgrade is only available in development mode' }, { status: 403 })
  }

  try {
    const { plan_id, company_id } = await req.json()

    if (!plan_id || !company_id) {
      return NextResponse.json({ error: 'Missing plan_id or company_id' }, { status: 400 })
    }

    const limits = PLAN_LIMITS[plan_id]
    if (!limits) {
      return NextResponse.json({ error: `Invalid plan_id: ${plan_id}. Use 'pro' or 'enterprise'` }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Upsert subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('company_id', company_id)
      .single()

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({
          plan: limits.plan,
          status: 'active',
          current_usage: 0,
          monthly_shipment_limit: limits.monthly_shipment_limit,
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          company_id,
          plan: limits.plan,
          status: 'active',
          current_usage: 0,
          monthly_shipment_limit: limits.monthly_shipment_limit,
        })
    }

    return NextResponse.json({
      success: true,
      message: `Upgraded to ${limits.plan} (test mode)`,
      plan: limits.plan,
      limits,
    })
  } catch (error) {
    console.error('Test upgrade error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test upgrade failed' },
      { status: 500 }
    )
  }
}
