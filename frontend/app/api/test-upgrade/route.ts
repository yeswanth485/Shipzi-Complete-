// Test-only endpoint: simulates Razorpay payment success and upgrades subscription.
// Requires Firebase auth token + admin UID. Only works in development mode.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Verify Firebase ID token via Google's tokeninfo endpoint (no admin SDK needed)
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.aud !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return null
    return { uid: data.sub, email: data.email }
  } catch {
    return null
  }
}

const PLAN_LIMITS: Record<string, { plan: string; monthly_shipment_limit: number; monthly_optimization_limit: number; max_rows_per_upload: number }> = {
  pro: { plan: 'growth', monthly_shipment_limit: 10000, monthly_optimization_limit: 999999, max_rows_per_upload: 10000 },
  enterprise: { plan: 'enterprise', monthly_shipment_limit: -1, monthly_optimization_limit: 999999, max_rows_per_upload: 100000 },
}

// Admin-only UIDs (set via environment variable, comma-separated)
const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').filter(Boolean)

export async function POST(req: Request) {
  // Only allow in development mode — never in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test upgrade is not available in production' }, { status: 403 })
  }

  // Require Firebase auth + admin role
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    const user = await verifyFirebaseToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Check admin: must be in ADMIN_UIDS list
    if (!ADMIN_UIDS.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
    }

    const { plan_id, company_id } = await req.json()

    if (!plan_id || !company_id) {
      return NextResponse.json({ error: 'Missing plan_id or company_id' }, { status: 400 })
    }

    const limits = PLAN_LIMITS[plan_id]
    if (!limits) {
      return NextResponse.json({ error: 'Invalid plan_id' }, { status: 400 })
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
    return NextResponse.json(
      { error: 'Test upgrade failed' },
      { status: 500 }
    )
  }
}
