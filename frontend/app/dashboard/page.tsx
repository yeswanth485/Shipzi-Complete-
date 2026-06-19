"use client"
import { useAuth } from "@/context/AuthContext"

export default function DashboardPage() {
  const { profile, firebaseUser, signOutUser } = useAuth()

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="font-syne text-3xl font-bold text-white mb-6">
        Dashboard
      </h1>

      <div className="glass-card p-6 mb-6">
        <h2 className="font-syne text-xl font-semibold text-white mb-4">
          Account
        </h2>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            <span style={{ color: "var(--text-muted)" }}>Email: </span>
            {firebaseUser?.email}
          </p>
          <p>
            <span style={{ color: "var(--text-muted)" }}>Name: </span>
            {profile?.display_name || firebaseUser?.displayName || "Not set"}
          </p>
          <p>
            <span style={{ color: "var(--text-muted)" }}>Onboarding: </span>
            {profile?.onboarding_complete ? "Complete" : "Pending"}
          </p>
        </div>
      </div>

      <button
        onClick={signOutUser}
        className="px-6 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-80"
        style={{
          background: "rgba(239,68,68,0.15)",
          color: "var(--accent-danger)",
          border: "1px solid rgba(239,68,68,0.3)",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  )
}
