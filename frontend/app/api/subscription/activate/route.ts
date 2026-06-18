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

    const backendRes = await fetch(`${BACKEND_URL}/api/subscription/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to activate subscription' },
        { status: backendRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Subscription activation service unavailable' },
      { status: 500 }
    )
  }
}
