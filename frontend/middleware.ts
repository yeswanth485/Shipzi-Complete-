import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const hasAuth = !!authCookie?.value && authCookie.value.length >= 10

  // Only protect /dashboard — /onboarding and auth pages handle their own logic
  if (pathname.startsWith('/dashboard') && !hasAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If already logged in and visiting login/signup, go to dashboard
  if ((pathname === '/login' || pathname === '/signup') && hasAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
