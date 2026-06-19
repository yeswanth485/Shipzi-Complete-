import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get('shipzi-auth')
  const hasAuth = !!authCookie?.value && authCookie.value.length >= 10

  // Only protect /dashboard — send unauthenticated users to login
  if (pathname.startsWith('/dashboard') && !hasAuth) {
    console.log('[middleware] No auth cookie, redirecting to /login from', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // NOTE: We intentionally do NOT redirect logged-in users away from /login here.
  // That redirect is handled client-side in the login page itself (via useEffect)
  // AFTER Firebase has restored the session. Doing it in middleware caused a race
  // condition: the cookie existed but Firebase session wasn't restored yet, causing
  // the dashboard layout to see firebaseUser=null and redirect back to /login.

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/onboarding'],
}
