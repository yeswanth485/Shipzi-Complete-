import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  // Read env vars at RUNTIME (not build time)
  const mlUrl = process.env.ML_BRIDGE_URL
    || process.env.NEXT_PUBLIC_ML_BRIDGE_URL
    || 'https://shipzi-complete-ml-engine.onrender.com'
  const mlEnabled = process.env.NEXT_PUBLIC_ML_BRIDGE_ENABLED !== 'false'

  const debug = {
    mlUrl,
    mlEnabled,
    ML_BRIDGE_URL: process.env.ML_BRIDGE_URL || '(not set)',
    NEXT_PUBLIC_ML_BRIDGE_URL: process.env.NEXT_PUBLIC_ML_BRIDGE_URL || '(not set)',
    NEXT_PUBLIC_ML_BRIDGE_ENABLED: process.env.NEXT_PUBLIC_ML_BRIDGE_ENABLED || '(not set)',
  }

  if (!mlEnabled) {
    return NextResponse.json({ ...debug, connected: false, status: 'disabled' })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${mlUrl}/ml/health`, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        ...debug,
        connected: true,
        status: data.status,
        models_loaded: data.models_loaded,
        all_required_loaded: data.all_required_loaded,
      })
    }
    return NextResponse.json({ ...debug, connected: false, status: `HTTP ${res.status}` })
  } catch (err) {
    return NextResponse.json({
      ...debug,
      connected: false,
      status: 'unreachable',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
