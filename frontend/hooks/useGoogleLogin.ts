"use client"
import { useState, useCallback } from "react"
import { signInWithPopup, type UserCredential } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

interface UseGoogleLoginReturn {
  signInWithGoogle: () => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useGoogleLogin(): UseGoogleLoginReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.log("[GoogleLogin] Starting Google sign-in popup")

    try {
      const result: UserCredential = await signInWithPopup(auth, googleProvider)
      console.log("[GoogleLogin] Popup success — UID:", result.user.uid)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ""

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setLoading(false)
        return
      }

      if (code === "auth/popup-blocked") {
        setError("Pop-up blocked. Allow pop-ups and try again.")
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Try again.")
      } else {
        setError("Google sign-in failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { signInWithGoogle, loading, error, clearError }
}
