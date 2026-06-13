import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const onboardingComplete = request.cookies.get('shipzi-onboarding-complete')

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/onboarding'
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (isProtectedRoute && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dashboard') && authCookie && !onboardingComplete) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (pathname === '/onboarding' && authCookie && onboardingComplete) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAuthRoute && authCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding', '/login', '/signup'],
}
