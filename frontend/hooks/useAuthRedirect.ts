"use client"
import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

const PUBLIC_PATHS = ["/", "/login", "/signup"]

export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, firebaseUser, profile } = useAuth()
  const lastRedirect = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    const doRedirect = (path: string) => {
      if (lastRedirect.current === path) return
      lastRedirect.current = path
      console.log("[AuthRedirect] Redirecting to:", path, "| from:", pathname, "| profile:", profile?.onboarding_complete)
      router.replace(path)
    }

    // Not logged in → redirect to login (unless already on a public page)
    if (!firebaseUser) {
      if (!PUBLIC_PATHS.includes(pathname)) {
        doRedirect("/login")
      }
      return
    }

    // Logged in on /login or /signup → redirect based on profile
    if (pathname === "/login" || pathname === "/signup") {
      if (profile) {
        doRedirect(profile.onboarding_complete ? "/dashboard" : "/onboarding")
      } else {
        doRedirect("/onboarding")
      }
      return
    }

    // On dashboard but not onboarded → redirect to onboarding
    if (pathname.startsWith("/dashboard") && profile && !profile.onboarding_complete) {
      doRedirect("/onboarding")
      return
    }

    // On onboarding but already onboarded → redirect to dashboard
    if (pathname === "/onboarding" && profile?.onboarding_complete) {
      doRedirect("/dashboard")
      return
    }
  }, [loading, firebaseUser, profile, pathname, router])

  // Reset redirect guard when pathname changes
  useEffect(() => {
    lastRedirect.current = null
  }, [pathname])

  // Dedicated effect: if profile changes to onboarding_complete while on /onboarding, redirect
  useEffect(() => {
    if (loading || !firebaseUser) return
    if (pathname === "/onboarding" && profile?.onboarding_complete) {
      console.log("[AuthRedirect] Profile-based redirect: onboarding complete → /dashboard")
      router.replace("/dashboard")
    }
  }, [profile, pathname, loading, firebaseUser, router])
}
