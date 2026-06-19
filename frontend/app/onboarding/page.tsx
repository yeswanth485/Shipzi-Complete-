"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { useUser } from "@/context/UserContext"
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
  const { refreshUser } = useUser()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormData>({
    companyName: "",
    industry: "",
    warehouseSize: "",
    volume: "",
  })

  const updateForm = (updates: Partial<FormData>) =>
    setForm((f) => ({ ...f, ...updates }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleComplete = async () => {
    if (!firebaseUser) {
      console.error("[Onboarding] No firebaseUser — cannot save.")
      setError("Authentication error. Please sign in again.")
      return
    }

    const uid = firebaseUser.uid
    console.log("[Onboarding] Saving for UID:", uid)
    setLoading(true)
    setError("")

    const volumeMap: Record<string, number> = {
      "< 500": 100,
      "500–5K": 2500,
      "5K–50K": 25000,
      "50K+": 100000,
    }

    // ── Step 1: Create company row ──
    let companyId: string | null = null
    try {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: form.companyName,
          industry: form.industry,
          warehouse_size: form.warehouseSize,
          monthly_shipment_volume: volumeMap[form.volume] || 100,
        })
        .select("id")
        .single()

      if (companyError) throw new Error("Failed to create company: " + companyError.message)
      companyId = company.id
      console.log("[Onboarding] Company created:", companyId)
    } catch (err: unknown) {
      console.error("[Onboarding] Company creation failed:", err)
      setError(err instanceof Error ? err.message : "Failed to create company.")
      setLoading(false)
      return
    }

    // ── Step 2: Upload company logo if provided ──
    if (logoFile && companyId) {
      try {
        const ext = logoFile.name.split('.').pop() ?? 'png'
        const path = `company/${companyId}/logo.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('company-logos')
          .upload(path, logoFile, { upsert: true })

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path)
          if (urlData?.publicUrl) {
            await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId)
            console.log("[Onboarding] Logo uploaded:", urlData.publicUrl)
          }
        } else {
          console.warn("[Onboarding] Logo upload failed (non-fatal):", uploadErr.message)
        }
      } catch (err: unknown) {
        console.warn("[Onboarding] Logo upload exception (non-fatal):", err)
      }
    }

    // ── Step 3: Create or update users row and link to company ──
    try {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", uid)
        .maybeSingle()

      if (!existingUser) {
        const { error: insertErr } = await supabase.from("users").upsert(
          {
            id: uid,
            email: firebaseUser.email || "",
            full_name: firebaseUser.displayName || "",
            avatar_url: firebaseUser.photoURL || "",
            company_id: companyId,
            onboarding_complete: true,
          },
          { onConflict: "id" }
        )
        if (insertErr) throw new Error("Failed to create user: " + insertErr.message)
        console.log("[Onboarding] users row created with company_id:", companyId)
      } else {
        const { error: userError } = await supabase
          .from("users")
          .update({
            company_id: companyId,
            onboarding_complete: true,
            full_name: firebaseUser.displayName || "",
            avatar_url: firebaseUser.photoURL || "",
          })
          .eq("id", uid)
        if (userError) throw new Error("Failed to update user: " + userError.message)
        console.log("[Onboarding] users row updated with company_id:", companyId)
      }
    } catch (err: unknown) {
      console.error("[Onboarding] User link failed:", err)
      setError(err instanceof Error ? err.message : "Failed to save user data.")
      setLoading(false)
      return
    }

    // ── Step 4: Create subscription row for the company ──
    try {
      const { error: subErr } = await supabase
        .from("subscriptions")
        .insert({
          company_id: companyId,
          plan: "free",
          status: "active",
          current_usage: 0,
          monthly_shipment_limit: 100,
        })
      if (subErr) {
        console.warn("[Onboarding] Subscription create (non-fatal):", subErr.message)
      } else {
        console.log("[Onboarding] Subscription created for company:", companyId)
      }
    } catch (err: unknown) {
      console.warn("[Onboarding] Subscription exception (non-fatal):", err)
    }

    // ── Step 5: Mark onboarding_complete in user_profiles ──
    try {
      await completeOnboarding(uid)
      console.log("[Onboarding] user_profiles marked complete")
    } catch (err: unknown) {
      console.error("[Onboarding] completeOnboarding failed:", err)
      setError("Failed to complete onboarding profile.")
      setLoading(false)
      return
    }

    // ── Step 6: Refresh both contexts then redirect ──
    try {
      await refreshProfile()
      console.log("[Onboarding] AuthContext profile refreshed")
      await refreshUser()
      console.log("[Onboarding] UserContext refreshed")
    } catch (err: unknown) {
      console.warn("[Onboarding] Context refresh warning:", err)
    }

    console.log("[Onboarding] All done — redirecting to /dashboard")
    router.replace("/dashboard")
  }

  const canAdvance = [
    form.companyName.trim().length > 0 && form.industry.length > 0,
    form.warehouseSize.length > 0 && form.volume.length > 0,
    true, // step 2 (logo) is optional
  ]

  const steps = ["Company Identity", "Operations", "Company Logo"]

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
                width: `${((step + 1) / 3) * 100}%`,
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

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">
                  Add your company logo
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  This is optional — you can add it later from Settings.
                </p>
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[var(--accent-primary)]"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-3">
                      <Image src={logoPreview} alt="Logo preview" width={120} height={60} className="object-contain rounded-lg" unoptimized />
                      <span className="text-xs" style={{ color: "var(--accent-success)" }}>Logo selected — click to change</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">🖼️</div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        Click to upload your company logo
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        PNG, JPG or SVG
                      </p>
                    </div>
                  )}
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
              {step < 2 ? (
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
