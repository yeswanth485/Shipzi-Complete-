import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_API_URL
  || 'https://shipzi-payments.onrender.com'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const body = await req.json()
    const idempotencyKey = req.headers.get('x-idempotency-key') || crypto.randomUUID()

    const backendRes = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to create order' },
        { status: backendRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Payment service unavailable' },
      { status: 500 }
    )
  }
}
