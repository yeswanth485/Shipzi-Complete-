import { NextResponse } from 'next/server'

export const maxDuration = 120

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_API_URL
  || 'https://shipzi-payments.onrender.com'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const body = await req.json()
    const { rows, mode, catalog_id, run_id, company_id } = body

    if (!company_id || !run_id) {
      return NextResponse.json({ message: 'Missing company_id or run_id' }, { status: 400 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        rawRows: rows,
        companyId: company_id,
        runId: run_id,
        mode: mode || 'single',
      }),
      signal: AbortSignal.timeout(120000),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      const errorMsg = data.error || data.message || 'Backend optimization failed'
      return NextResponse.json(
        { message: errorMsg },
        { status: backendRes.status }
      )
    }

    return NextResponse.json({
      success: true,
      run_id,
      summary: data.result?.summary || { total: 0, optimized: 0, total_savings: 0, avg_utilization: 0 },
      invalidRows: [],
      results: data.result?.results || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Optimization service unavailable' },
      { status: 500 }
    )
  }
}
