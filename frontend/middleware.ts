import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SECURITY NOTE: This middleware provides UX-only route protection (redirects).
// It does NOT enforce real authentication. Actual auth is enforced server-side
// via Firebase ID token verification in the backend API. Do NOT rely on this
// middleware for security-critical access control.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const onboardingComplete = request.cookies.get('shipzi-onboarding-complete')

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/onboarding'
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  const hasValidAuth = !!authCookie?.value && authCookie.value.length >= 20

  if (isProtectedRoute && !hasValidAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dashboard') && hasValidAuth && !onboardingComplete) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (pathname === '/onboarding' && hasValidAuth && onboardingComplete) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAuthRoute && hasValidAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding', '/login', '/signup'],
}
