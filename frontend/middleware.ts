import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const onboardingComplete = request.cookies.get('shipzi-onboarding-complete')

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/onboarding'
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // Validate auth cookie is a valid UUID format (not forged arbitrary string)
  const hasValidAuth = authCookie && UUID_REGEX.test(authCookie.value)

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
