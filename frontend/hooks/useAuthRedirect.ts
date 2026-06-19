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
      console.log("[AuthRedirect] Redirecting to:", path)
      router.replace(path)
    }

    // Not logged in
    if (!firebaseUser) {
      if (!PUBLIC_PATHS.includes(pathname)) {
        doRedirect("/login")
      }
      return
    }

    // Logged in but on auth pages
    if (pathname === "/login" || pathname === "/signup") {
      if (!profile) return
      doRedirect(profile.onboarding_complete ? "/dashboard" : "/onboarding")
      return
    }

    // On dashboard but not onboarded
    if (pathname.startsWith("/dashboard") && !profile?.onboarding_complete) {
      doRedirect("/onboarding")
      return
    }

    // On onboarding but already onboarded
    if (pathname === "/onboarding" && profile?.onboarding_complete) {
      doRedirect("/dashboard")
      return
    }
  }, [loading, firebaseUser, profile, pathname, router])

  // Reset redirect guard when pathname changes
  useEffect(() => {
    lastRedirect.current = null
  }, [pathname])
}
