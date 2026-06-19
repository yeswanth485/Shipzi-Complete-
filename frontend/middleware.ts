import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("firebase_token")?.value
  const isAuth = Boolean(token)

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/settings")

  if (isProtected && !isAuth) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
