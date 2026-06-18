import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_API_URL
  || 'https://shipzi-payments.onrender.com'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const { id } = await params

    const backendRes = await fetch(`${BACKEND_URL}/api/payment/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
      signal: AbortSignal.timeout(15000),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Payment not found' },
        { status: backendRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Payment get proxy failed:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Payment service unavailable' },
      { status: 500 }
    )
  }
}
