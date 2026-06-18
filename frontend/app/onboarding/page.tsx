'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { setOnboardingComplete } from '@/lib/auth-cookies'

interface FormData {
  companyName: string
  industry: string
  logoUrl: string
  warehouseSize: string
  volume: string
  regions: string[]
  packagingGoals: string[]
  sustainabilityGoals: string[]
}

const INDUSTRIES = ['E-Commerce', 'Retail', 'Manufacturing', 'Healthcare', 'Food & Beverage', 'Electronics', 'Fashion', 'Other']
const WAREHOUSE_SIZES = [
  { value: 'small', label: 'Small', sub: '< 5,000 sqft', icon: '🏠' },
  { value: 'medium', label: 'Medium', sub: '5K–20K sqft', icon: '🏢' },
  { value: 'large', label: 'Large', sub: '20K–100K sqft', icon: '🏭' },
  { value: 'enterprise', label: 'Enterprise', sub: '100K+ sqft', icon: '🌆' },
]
const VOLUME_OPTIONS = ['< 500', '500–5K', '5K–50K', '50K+']
const REGIONS = [
  'India', 'United States', 'Singapore',
  'Western Europe', 'Southern Europe', 'Northern Europe', 'Eastern Europe',
  'North America', 'South America', 'Southeast Asia', 'East Asia', 'South Asia',
  'Middle East', 'Africa', 'Oceania', 'Caribbean',
]
const PACKAGING_GOALS = ['Reduce Shipping Costs', 'Minimize Void Fill', 'Right-Size All Packages', 'Eliminate Oversized Boxes', 'Standardize Box Inventory', 'Reduce Returns Due to Damage']
const SUSTAINABILITY_GOALS = ['Reduce Carbon Footprint', 'Use Recyclable Materials', 'Achieve Carbon Neutral Shipping', 'Minimize Packaging Waste', 'ESG Compliance Reporting']

function MultiSelectChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
      style={{
        background: selected ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)',
        border: `1px solid ${selected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
      }}>
      {selected && '✓ '}{label}
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { firebaseUser, refreshUser } = useUser()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [form, setForm] = useState<FormData>({
    companyName: '',
    industry: '',
    logoUrl: '',
    warehouseSize: '',
    volume: '',
    regions: [],
    packagingGoals: [],
    sustainabilityGoals: [],
  })

  const updateForm = (updates: Partial<FormData>) => setForm(f => ({ ...f, ...updates }))

  const toggleArrayItem = (key: 'regions' | 'packagingGoals' | 'sustainabilityGoals', value: string) => {
    const current = form[key]
    updateForm({ [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] })
  }

  const [submitError, setSubmitError] = useState('')

  const [logoWarning, setLogoWarning] = useState('')

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setSubmitError('')
    setLogoWarning('')
    try {
      // Validate file type and size
      const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (!allowedTypes.includes(file.type)) {
        setLogoWarning('Only PNG, JPG, and SVG files are allowed.')
        return
      }
      if (file.size > maxSize) {
        setLogoWarning('File too large. Maximum size is 5MB.')
        return
      }
      // Force safe extension based on MIME type
      const extMap: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' }
      const ext = extMap[file.type] ?? 'png'
      const path = `${firebaseUser?.uid ?? 'anon'}/logo.${ext}`
      const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path)
        if (urlData?.publicUrl) {
          updateForm({ logoUrl: urlData.publicUrl })
        } else {
          setLogoWarning('Logo uploaded but URL unavailable. You can add it later in Settings > Company.')
        }
      } else {
        console.warn('Logo storage upload failed:', error.message)
        setLogoWarning('Logo upload skipped (storage not configured). You can add it later in Settings > Company.')
      }
    } catch (err: any) {
      console.warn('Logo upload error:', err.message)
      setLogoWarning('Logo upload skipped. You can add it later in Settings > Company.')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleComplete = async () => {
    if (!firebaseUser) return
    setLoading(true)
    setSubmitError('')
    try {
      const volumeMap: Record<string, number> = { '< 500': 100, '500–5K': 2500, '5K–50K': 25000, '50K+': 100000 }

      // Check if user already has a company (created by UserContext)
      const { data: currentUser } = await supabase.from('users')
        .select('company_id')
        .eq('id', firebaseUser.uid)
        .single()

      let companyId = currentUser?.company_id

      if (!companyId) {
        // 1. Create company
        const { data: company, error: companyError } = await supabase.from('companies').insert({
          name: form.companyName,
          logo_url: form.logoUrl || null,
          industry: form.industry,
          warehouse_size: form.warehouseSize,
          monthly_shipment_volume: volumeMap[form.volume] ?? null,
          packaging_goals: form.packagingGoals,
          sustainability_goals: form.sustainabilityGoals,
          shipping_regions: form.regions,
        }).select().single()

        if (companyError) throw new Error(`Company creation failed: ${companyError.message}`)
        if (!company) throw new Error('Company creation returned no data.')
        companyId = company.id
      }

      // 2. Ensure user row exists, then update with company_id
      const { data: existingUser } = await supabase.from('users')
        .select('id')
        .eq('id', firebaseUser.uid)
        .single()
      if (!existingUser) {
        await supabase.from('users').upsert({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: firebaseUser.displayName || '',
          avatar_url: firebaseUser.photoURL || '',
          company_id: companyId,
          onboarding_complete: true,
        }, { onConflict: 'id' })
      } else {
        const { error: userError } = await supabase.from('users')
          .update({ company_id: companyId, onboarding_complete: true })
          .eq('id', firebaseUser.uid)
        if (userError) throw new Error(`User update failed: ${userError.message}`)
      }

      // 3. Create subscription (ignore if already exists)
      await supabase.from('subscriptions')
        .insert({ company_id: companyId, plan: 'free', monthly_shipment_limit: 100 })

      // 4. Set cookie FIRST so middleware allows /dashboard, then redirect immediately
      setOnboardingComplete()
      // Refresh context in background — don't await so we don't block the redirect
      refreshUser().catch(console.error)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Onboarding complete error:', err)
      setSubmitError(err.message || 'An unknown error occurred during setup.')
      setLoading(false)
    }
  }

  const canAdvance = [
    form.companyName.trim().length > 0 && form.industry.length > 0,
    form.warehouseSize.length > 0 && form.volume.length > 0,
    form.packagingGoals.length > 0,
  ]

  const steps = ['Company Identity', 'Operations', 'Goals']

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-void)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={36} height={36} className="object-contain" />
          <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {steps.map((s, i) => (
              <button key={s} onClick={() => i < step && setStep(i)}
                className="text-xs font-medium transition-colors"
                style={{ color: i <= step ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: i < step ? 'pointer' : 'default' }}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <div className="h-1 rounded-full" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-1 rounded-full transition-all duration-500"
              style={{ background: 'var(--accent-primary)', width: `${((step + 1) / 3) * 100}%` }} />
          </div>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)' }}>
            {submitError}
          </div>
        )}

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8">

            {/* STEP 1: Company Identity */}
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">Tell us about your company</h2>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Company Name *</label>
                  <input type="text" value={form.companyName} onChange={e => updateForm({ companyName: e.target.value })}
                    className="input-dark" placeholder="Acme Logistics" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Industry *</label>
                  <select value={form.industry} onChange={e => updateForm({ industry: e.target.value })}
                    className="input-dark" style={{ cursor: 'pointer' }}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Company Logo (optional)</label>
                  <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                    <input type="file" accept=".png,.jpg,.svg" onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    {form.logoUrl ? (
                      <div className="flex items-center justify-center gap-3">
                        <Image src={form.logoUrl} alt="Logo preview" width={48} height={48} className="rounded-lg object-contain" unoptimized />
                        <span className="text-sm" style={{ color: 'var(--accent-success)' }}>✓ Logo uploaded</span>
                      </div>
                    ) : logoUploading ? (
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Uploading...</div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2">🖼️</div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Drop PNG, JPG or SVG here</p>
                      </div>
                    )}
                  </div>
                  {logoWarning && (
                    <p className="mt-2 text-xs px-1" style={{ color: 'var(--accent-warning)' }}>
                      ⚠️ {logoWarning}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Operations */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">Configure your shipping operations</h2>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Warehouse Size *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {WAREHOUSE_SIZES.map(ws => (
                      <button key={ws.value} type="button" onClick={() => updateForm({ warehouseSize: ws.value })}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          background: form.warehouseSize === ws.value ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)',
                          border: `2px solid ${form.warehouseSize === ws.value ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        }}>
                        <div className="text-2xl mb-1">{ws.icon}</div>
                        <div className="font-semibold text-sm text-white">{ws.label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ws.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Monthly Shipment Volume *</label>
                  <div className="grid grid-cols-4 gap-3">
                    {VOLUME_OPTIONS.map(vol => (
                      <button key={vol} type="button" onClick={() => updateForm({ volume: vol })}
                        className="py-3 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: form.volume === vol ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)',
                          border: `2px solid ${form.volume === vol ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          color: form.volume === vol ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}>
                        {vol}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Default Shipping Regions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REGIONS.map(region => (
                      <label key={region} className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors"
                        style={{ background: form.regions.includes(region) ? 'rgba(37,99,235,0.08)' : 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <input type="checkbox" checked={form.regions.includes(region)} onChange={() => toggleArrayItem('regions', region)}
                          style={{ accentColor: 'var(--accent-primary)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{region}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Goals */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-syne text-2xl font-bold text-white">What are your primary goals?</h2>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Packaging Goals *</label>
                  <div className="flex flex-wrap gap-2">
                    {PACKAGING_GOALS.map(goal => (
                      <MultiSelectChip key={goal} label={goal} selected={form.packagingGoals.includes(goal)} onClick={() => toggleArrayItem('packagingGoals', goal)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Sustainability Goals</label>
                  <div className="flex flex-wrap gap-2">
                    {SUSTAINABILITY_GOALS.map(goal => (
                      <MultiSelectChip key={goal} label={goal} selected={form.sustainabilityGoals.includes(goal)} onClick={() => toggleArrayItem('sustainabilityGoals', goal)} />
                    ))}
                  </div>
                </div>

                {/* Summary Review */}
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Setup Summary</p>
                  <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Company:</span> {form.companyName}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Industry:</span> {form.industry}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Warehouse:</span> {form.warehouseSize}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Volume:</span> {form.volume}/mo</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
                className="btn-ghost" style={{ opacity: step === 0 ? 0.3 : 1 }}>
                ← Back
              </button>
              {step < 2 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance[step]} className="btn-primary"
                  style={{ opacity: canAdvance[step] ? 1 : 0.5, cursor: canAdvance[step] ? 'pointer' : 'not-allowed' }}>
                  Next →
                </button>
              ) : (
                <button onClick={handleComplete} disabled={loading || form.packagingGoals.length === 0} className="btn-primary">
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Complete Setup 🎉'}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
