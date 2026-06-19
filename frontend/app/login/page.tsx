"use client"
import Image from "next/image"
import Link from "next/link"
import { useGoogleLogin } from "@/hooks/useGoogleLogin"

export default function LoginPage() {
  const { signInWithGoogle, loading, error, clearError } = useGoogleLogin()

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "linear-gradient(135deg,var(--bg-void) 0%,#060A10 100%)",
      }}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <Image
              src="/shipzi-logo.png"
              alt="Shipzi Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <span
              className="font-syne font-bold text-xl"
              style={{ color: "var(--text-primary)" }}
            >
              Shipzi
            </span>
          </div>

          <div className="glass-card p-8">
            <h1 className="font-syne text-3xl font-bold text-white mb-2">
              Welcome back
            </h1>
            <p
              className="text-sm mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Sign in to your Shipzi workspace
            </p>

            {error && (
              <div
                className="mb-5 p-4 rounded-xl text-sm flex items-center justify-between"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "var(--accent-danger)",
                }}
              >
                <span>{error}</span>
                <button
                  onClick={clearError}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-danger)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
              style={{
                background: "white",
                color: "#1a1a1a",
                border: "none",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      fill="#4285F4"
                      d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                    />
                    <path
                      fill="#34A853"
                      d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
                    />
                    <path
                      fill="#EA4335"
                      d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <p
              className="text-center text-sm mt-6"
              style={{ color: "var(--text-muted)" }}
            >
              No account?{" "}
              <Link
                href="/signup"
                style={{ color: "var(--accent-secondary)" }}
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:flex flex-1 items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg,rgba(37,99,235,0.08) 0%,rgba(6,182,212,0.05) 100%)",
        }}
      >
        <div className="text-center p-12 max-w-sm">
          <div className="text-6xl mb-6">📦</div>
          <h2 className="font-syne text-3xl font-bold text-white mb-4">
            Ship Smarter
          </h2>
          <p
            className="text-lg mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            AI-optimized packaging that saves money and the planet.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cost Savings", value: "23%" },
              { label: "Utilization", value: "85%+" },
              { label: "CO₂ Reduced", value: "340T" },
              { label: "Teams", value: "500+" },
            ].map((s) => (
              <div
                key={s.label}
                className="p-4 rounded-xl"
                style={{
                  background: "rgba(17,22,32,0.6)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="font-syne font-bold text-2xl"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
