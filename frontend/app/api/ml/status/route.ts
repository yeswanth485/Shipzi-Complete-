import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const mlUrl = process.env.ML_BRIDGE_URL
    || process.env.NEXT_PUBLIC_ML_BRIDGE_URL
    || 'https://shipzi-complete-ml-engine.onrender.com'
  const mlEnabled = process.env.NEXT_PUBLIC_ML_BRIDGE_ENABLED !== 'false'

  if (!mlEnabled) {
    return NextResponse.json({ connected: false, status: 'disabled' })
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      const res = await fetch(`${mlUrl}/ml/health`, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          connected: true,
          status: data.status,
          models_loaded: data.models_loaded,
          all_required_loaded: data.all_required_loaded,
          attempt,
        })
      }
      return NextResponse.json({ connected: false, status: `HTTP ${res.status}`, attempt })
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      return NextResponse.json({
        connected: false,
        status: 'unreachable',
        error: err instanceof Error ? err.message : String(err),
        attempts: attempt,
      })
    }
  }

  return NextResponse.json({ connected: false, status: 'unknown error' })
}
