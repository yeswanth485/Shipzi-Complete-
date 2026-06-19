"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { completeOnboarding, supabase } from "@/lib/supabase"

interface FormData {
  companyName: string
  industry: string
  warehouseSize: string
  volume: string
}

const INDUSTRIES = [
  "E-Commerce",
  "Retail",
  "Manufacturing",
  "Healthcare",
  "Food & Beverage",
  "Electronics",
  "Fashion",
  "Other",
]
const WAREHOUSE_SIZES = [
  { value: "small", label: "Small", sub: "< 5,000 sqft", icon: "🏠" },
  { value: "medium", label: "Medium", sub: "5K–20K sqft", icon: "🏢" },
  { value: "large", label: "Large", sub: "20K–100K sqft", icon: "🏭" },
  {
    value: "enterprise",
    label: "Enterprise",
    sub: "100K+ sqft",
    icon: "🌆",
  },
]
const VOLUME_OPTIONS = ["< 500", "500–5K", "5K–50K", "50K+"]

export default function OnboardingPage() {
  const router = useRouter()
  const { firebaseUser, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<FormData>({
    companyName: "",
    industry: "",
    warehouseSize: "",
    volume: "",
  })

  const updateForm = (updates: Partial<FormData>) =>
    setForm((f) => ({ ...f, ...updates }))

  const handleComplete = async () => {
    if (!firebaseUser) return
    setLoading(true)
    setError("")
    try {
      const volumeMap: Record<string, number> = {
        "< 500": 100,
        "500–5K": 2500,
        "5K–50K": 25000,
        "50K+": 100000,
      }

      const { data: existingUser, error: checkErr } = await supabase
        .from("users")
        .select("id")
        .eq("id", firebaseUser.uid)
        .maybeSingle()

      if (checkErr) {
        console.warn("[Onboarding] users table check error (non-fatal):", checkErr.message)
      }

      if (!existingUser) {
        const { error: insertErr } = await supabase.from("users").upsert(
          {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            full_name: firebaseUser.displayName || "",
            avatar_url: firebaseUser.photoURL || "",
            onboarding_complete: true,
          },
          { onConflict: "id" }
        )
        if (insertErr) {
          console.warn("[Onboarding] users upsert error (non-fatal):", insertErr.message)
        }
      } else {
        const { error: userError } = await supabase
          .from("users")
          .update({ onboarding_complete: true })
          .eq("id", firebaseUser.uid)
        if (userError) {
          console.warn("[Onboarding] users update error (non-fatal):", userError.message)
        }
      }

      await completeOnboarding(firebaseUser.uid)
      console.log("[Onboarding] completeOnboarding done, refreshing profile...")
      await refreshProfile()
      console.log("[Onboarding] Profile refreshed — redirecting to /dashboard")
      router.replace("/dashboard")
    } catch (err: unknown) {
      console.error("[Onboarding] complete error:", err)
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      )
      setLoading(false)
      // Fallback: try to redirect even if there was an error
      // useAuthRedirect should also catch the onboarding_complete state
      setTimeout(() => {
        router.replace("/dashboard")
      }, 1500)
    }
  }

  const canAdvance = [
    form.companyName.trim().length > 0 && form.industry.length > 0,
    form.warehouseSize.length > 0 && form.volume.length > 0,
  ]

  const steps = ["Company Identity", "Operations"]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-void)" }}
    >
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 justify-center mb-10">
          <Image
            src="/shipzi-logo.png"
            alt="Shipzi Logo"
            width={36}
            height={36}
            className="object-contain"
          />
          <span
            className="font-syne font-bold text-xl"
            style={{ color: "var(--text-primary)" }}
          >
            Shipzi
          </span>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => i < step && setStep(i)}
                className="text-xs font-medium transition-colors"
                style={{
                  color:
                    i <= step
                      ? "var(--accent-primary)"
                      : "var(--text-muted)",
                  cursor: i < step ? "pointer" : "default",
                }}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <div
            className="h-1 rounded-full"
            style={{ background: "var(--border-subtle)" }}
          >
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                background: "var(--accent-primary)",
                width: `${((step + 1) / 2) * 100}%`,
              }}
            />
          </div>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--accent-danger)",
            }}
          >
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8"
          >
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">
                  Tell us about your company
                </h2>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) =>
                      updateForm({ companyName: e.target.value })
                    }
                    className="input-dark"
                    placeholder="Acme Logistics"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Industry *
                  </label>
                  <select
                    value={form.industry}
                    onChange={(e) => updateForm({ industry: e.target.value })}
                    className="input-dark"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">
                  Configure your shipping operations
                </h2>
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Warehouse Size *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {WAREHOUSE_SIZES.map((ws) => (
                      <button
                        key={ws.value}
                        type="button"
                        onClick={() =>
                          updateForm({ warehouseSize: ws.value })
                        }
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          background:
                            form.warehouseSize === ws.value
                              ? "rgba(37,99,235,0.15)"
                              : "var(--bg-elevated)",
                          border: `2px solid ${
                            form.warehouseSize === ws.value
                              ? "var(--accent-primary)"
                              : "var(--border-subtle)"
                          }`,
                        }}
                      >
                        <div className="text-2xl mb-1">{ws.icon}</div>
                        <div className="font-semibold text-sm text-white">
                          {ws.label}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {ws.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Monthly Shipment Volume *
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {VOLUME_OPTIONS.map((vol) => (
                      <button
                        key={vol}
                        type="button"
                        onClick={() => updateForm({ volume: vol })}
                        className="py-3 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background:
                            form.volume === vol
                              ? "rgba(37,99,235,0.15)"
                              : "var(--bg-elevated)",
                          border: `2px solid ${
                            form.volume === vol
                              ? "var(--accent-primary)"
                              : "var(--border-subtle)"
                          }`,
                          color:
                            form.volume === vol
                              ? "var(--accent-primary)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {vol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="btn-ghost"
                style={{ opacity: step === 0 ? 0.3 : 1 }}
              >
                ← Back
              </button>
              {step < 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance[step]}
                  className="btn-primary"
                  style={{
                    opacity: canAdvance[step] ? 1 : 0.5,
                    cursor: canAdvance[step] ? "pointer" : "not-allowed",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Complete Setup"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
