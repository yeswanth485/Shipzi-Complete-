"use client"
import type { ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"

export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth()
  useAuthRedirect()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0f0f0f" }}
      >
        <div
          className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: "var(--accent-primary)",
            borderRightColor: "var(--accent-secondary)",
          }}
        />
      </div>
    )
  }

  return <>{children}</>
}
