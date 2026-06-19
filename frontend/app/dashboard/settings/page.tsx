'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, Copy, Crown } from 'lucide-react'
import { PaymentModal } from '@/components/payment/PaymentModal'

const TABS = ['Profile', 'Company', 'Notifications', 'Billing']
const INDUSTRIES = ['E-Commerce', 'Retail', 'Manufacturing', 'Healthcare', 'Food & Beverage', 'Electronics', 'Fashion', 'Other']
const PACKAGING_GOALS = ['Reduce Shipping Costs', 'Minimize Void Fill', 'Right-Size All Packages', 'Eliminate Oversized Boxes', 'Standardize Box Inventory', 'Reduce Returns Due to Damage']
const SUSTAINABILITY_GOALS = ['Reduce Carbon Footprint', 'Use Recyclable Materials', 'Achieve Carbon Neutral Shipping', 'Minimize Packaging Waste', 'ESG Compliance Reporting']
const NOTIFICATION_KEYS = ['optimization_complete', 'weekly_report', 'sustainability_milestone', 'billing_alerts']
const NOTIFICATION_LABELS = ['New optimization complete', 'Weekly analytics report', 'Sustainability milestone reached', 'Billing alerts']

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '2px solid var(--accent-success)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <Check size={16} color="var(--accent-success)" />
      <span className="text-sm text-white">{message}</span>
    </motion.div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
      style={{ background: checked ? 'var(--accent-primary)' : 'var(--border-subtle)' }}>
      <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

export default function SettingsPage() {
  const { userData, firebaseUser, refreshUser } = useUser()
  const { subscription, isPro, isFree, optimizationsRemaining, refreshSubscription } = useSubscription()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'Billing' ? 'Billing' : 'Profile'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{ planId: string; planName: string; amount: number } | null>(null)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  // Company state
  const [companyData, setCompanyData] = useState({ name: '', industry: '', warehouse_size: '', monthly_shipment_volume: '', packaging_goals: [] as string[], sustainability_goals: [] as string[], shipping_regions: [] as string[] })
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)

  // Notifications state
  const [notifs, setNotifs] = useState<Record<string, boolean>>({})

  const [showPwd, setShowPwd] = useState(false)

  const loadData = useCallback(async () => {
    if (!userData) return
    setFullName(userData.full_name ?? '')
    setAvatarUrl(userData.avatar_url ?? null)
    if (userData.companies) {
      setCompanyData({
        name: userData.companies.name ?? '',
        industry: userData.companies.industry ?? '',
        warehouse_size: userData.companies.warehouse_size ?? '',
        monthly_shipment_volume: String(userData.companies.monthly_shipment_volume ?? ''),
        packaging_goals: userData.companies.packaging_goals ?? [],
        sustainability_goals: userData.companies.sustainability_goals ?? [],
        shipping_regions: userData.companies.shipping_regions ?? [],
      })
      setCompanyLogoUrl(userData.companies.logo_url ?? null)
    } else {
      // No company linked yet — show empty form so user can create one
      setCompanyData({ name: '', industry: '', warehouse_size: '', monthly_shipment_volume: '', packaging_goals: [], sustainability_goals: [], shipping_regions: [] })
      setCompanyLogoUrl(null)
    }
    const savedNotifs = (userData as unknown as Record<string, unknown>).notification_preferences as Record<string, boolean> | null
    setNotifs(savedNotifs ?? Object.fromEntries(NOTIFICATION_KEYS.map(k => [k, false])))
  }, [userData])

  useEffect(() => { loadData() }, [loadData])

  const saveProfile = async () => {
    if (!firebaseUser) return
    setSaving(true)
    await supabase.from('users').update({ full_name: fullName }).eq('id', firebaseUser.uid)
    await refreshUser()
    setSaving(false)
    setToast('Profile saved successfully ✓')
  }

  const handleUpdatePassword = async () => {
    if (!firebaseUser) return
    if (newPwd.length < 8) return setToast('Password must be at least 8 characters')
    if (newPwd !== confirmPwd) return setToast('Passwords do not match')
    
    setSaving(true)
    try {
      // BUG-019 FIX: Use already-imported updatePassword
      const { updatePassword } = await import('firebase/auth')
      await updatePassword(firebaseUser, newPwd)
      setToast('Password updated successfully ✓')
      setShowChangePwd(false)
      setNewPwd('')
      setConfirmPwd('')
    } catch (err: any) {
      setToast('Failed to update password. You may need to log in again.')
    } finally {
      setSaving(false)
    }
  }

  const saveCompany = async () => {
    if (!firebaseUser) return
    setSaving(true)

    try {
      let companyId = userData?.company_id

      // If no company exists yet, create one first
      if (!companyId) {
        const { data: newCompany, error: createErr } = await supabase
          .from('companies')
          .insert({
            name: companyData.name || 'My Company',
            industry: companyData.industry || '',
            warehouse_size: companyData.warehouse_size || '',
            monthly_shipment_volume: parseInt(companyData.monthly_shipment_volume) || 100,
            packaging_goals: companyData.packaging_goals,
            sustainability_goals: companyData.sustainability_goals,
          })
          .select('id')
          .single()

        if (createErr || !newCompany) {
          console.error("[Settings] Failed to create company:", createErr)
          setSaving(false)
          setToast('Failed to create company: ' + (createErr?.message ?? 'Unknown error'))
          return
        }

        companyId = newCompany.id
        console.log("[Settings] Created company:", companyId)

        // Link user to the new company
        const { error: linkErr } = await supabase
          .from('users')
          .update({ company_id: companyId })
          .eq('id', firebaseUser.uid)

        if (linkErr) {
          console.error("[Settings] Failed to link user to company:", linkErr)
        }

        // Refresh so userData.company_id is set
        await refreshUser()
      } else {
        // Company exists — update it
        const { error: updateErr } = await supabase.from('companies').update({
          name: companyData.name,
          industry: companyData.industry,
          warehouse_size: companyData.warehouse_size,
          packaging_goals: companyData.packaging_goals,
          sustainability_goals: companyData.sustainability_goals,
        }).eq('id', companyId)

        if (updateErr) {
          console.error("[Settings] Failed to update company:", updateErr)
          setSaving(false)
          setToast('Failed to save: ' + updateErr.message)
          return
        }

        await refreshUser()
      }

      setSaving(false)
      setToast('Company settings saved ✓')
    } catch (err: unknown) {
      console.error("[Settings] saveCompany exception:", err)
      setSaving(false)
      setToast('Failed to save company settings.')
    }
  }

  const saveNotifications = async () => {
    if (!firebaseUser) return
    setSaving(true)
    await supabase.from('users').update({ notification_preferences: notifs } as Record<string, unknown>).eq('id', firebaseUser.uid)
    setSaving(false)
    setToast('Notification preferences saved ✓')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firebaseUser) return
    const { error } = await supabase.storage.from('company-logos').upload(`avatars/${firebaseUser.uid}.jpg`, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('company-logos').getPublicUrl(`avatars/${firebaseUser.uid}.jpg`)
      await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', firebaseUser.uid)
      setAvatarUrl(data.publicUrl)
      setToast('Avatar updated ✓')
    }
  }

  const toggleGoal = (key: 'packaging_goals' | 'sustainability_goals', val: string) => {
    setCompanyData(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val],
    }))
  }

  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firebaseUser) return
    setSaving(true)

    try {
      let companyId = userData?.company_id

      // If no company exists, create one first
      if (!companyId) {
        const { data: newCompany, error: createErr } = await supabase
          .from('companies')
          .insert({
            name: companyData.name || 'My Company',
            industry: companyData.industry || '',
            warehouse_size: companyData.warehouse_size || '',
          })
          .select('id')
          .single()

        if (createErr || !newCompany) {
          setSaving(false)
          setToast('Failed to create company. Please save company settings first.')
          return
        }

        companyId = newCompany.id
        await supabase.from('users').update({ company_id: companyId }).eq('id', firebaseUser.uid)
        await refreshUser()
      }

      const ext = file.name.split('.').pop() ?? 'png'
      const path = `company/${companyId}/logo.${ext}`
      const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path)
        if (urlData?.publicUrl) {
          await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId)
          setCompanyLogoUrl(urlData.publicUrl)
          await refreshUser()
          setToast('Company logo updated ✓')
        }
      } else {
        setToast('Logo upload failed: ' + error.message)
      }
    } catch (err: any) {
      setToast('Logo upload error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const usagePct = subscription ? Math.round(((subscription.total_optimizations ?? 0) / (subscription.monthly_optimization_limit ?? 10)) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex gap-6">
        {/* Left Tab Nav */}
        <div className="w-44 flex-shrink-0">
          <div className="glass-card p-2">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                style={{ background: activeTab === tab ? 'rgba(37,99,235,0.1)' : 'transparent', color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* PROFILE */}
              {activeTab === 'Profile' && (
                <div className="glass-card p-6 space-y-6">
                  <h2 className="font-syne font-bold text-white">Profile Settings</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                          style={{ background: 'var(--accent-primary)' }}>
                          {fullName.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                      )}
                      <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer text-xs"
                        style={{ background: 'var(--accent-primary)', color: 'white' }}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        +
                      </label>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{fullName || 'Your Name'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userData?.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input value={userData?.email ?? ''} readOnly className="input-dark" title="Contact support to change email"
                      style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                  {!showChangePwd ? (
                    <button onClick={() => setShowChangePwd(true)} className="btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }}>Change Password</button>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="relative">
                        <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                          placeholder="New password" className="input-dark" style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="Confirm password" className="input-dark" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowChangePwd(false)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Cancel</button>
                        <button className="btn-secondary w-full" onClick={handleUpdatePassword} disabled={saving}>
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={saveProfile} disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              )}

              {/* COMPANY */}
              {activeTab === 'Company' && (
                <div className="glass-card p-6 space-y-5">
                  <h2 className="font-syne font-bold text-white">Company Settings</h2>
                  
                  {/* Company Logo Upload */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Company Logo</label>
                    <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                      <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleCompanyLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                      {companyLogoUrl ? (
                        <div className="flex items-center justify-center gap-3">
                          <Image src={companyLogoUrl} alt="Company Logo" width={80} height={40} className="object-contain rounded-lg" unoptimized />
                          <span className="text-sm" style={{ color: 'var(--accent-success)' }}>✓ Logo uploaded</span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-3xl mb-2">🖼️</div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Drop PNG, JPG or SVG here</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Upload your company logo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
                    <input value={companyData.name} onChange={e => setCompanyData(p => ({ ...p, name: e.target.value }))} className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Industry</label>
                    <select value={companyData.industry} onChange={e => setCompanyData(p => ({ ...p, industry: e.target.value }))} className="input-dark">
                      <option value="">Select...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Packaging Goals</label>
                    <div className="flex flex-wrap gap-2">
                      {PACKAGING_GOALS.map(g => (
                        <button key={g} type="button" onClick={() => toggleGoal('packaging_goals', g)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{ background: companyData.packaging_goals.includes(g) ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)', color: companyData.packaging_goals.includes(g) ? 'var(--accent-primary)' : 'var(--text-secondary)', border: `1px solid ${companyData.packaging_goals.includes(g) ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Sustainability Goals</label>
                    <div className="flex flex-wrap gap-2">
                      {SUSTAINABILITY_GOALS.map(g => (
                        <button key={g} type="button" onClick={() => toggleGoal('sustainability_goals', g)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{ background: companyData.sustainability_goals.includes(g) ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)', color: companyData.sustainability_goals.includes(g) ? 'var(--accent-success)' : 'var(--text-secondary)', border: `1px solid ${companyData.sustainability_goals.includes(g) ? 'var(--accent-success)' : 'var(--border-subtle)'}` }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveCompany} disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Company Settings'}
                  </button>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {activeTab === 'Notifications' && (
                <div className="glass-card p-6 space-y-4">
                  <h2 className="font-syne font-bold text-white">Notification Preferences</h2>
                  <div className="space-y-4">
                    {NOTIFICATION_KEYS.map((key, i) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <div>
                          <p className="text-sm font-medium text-white">{NOTIFICATION_LABELS[i]}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Email & in-app notifications</p>
                        </div>
                        <Toggle checked={notifs[key] ?? false} onChange={v => setNotifs(n => ({ ...n, [key]: v }))} />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveNotifications} disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* BILLING */}
              {activeTab === 'Billing' && (
                <div className="space-y-4">
                  {/* Current Plan */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Crown size={20} color={isPro ? 'var(--accent-success)' : 'var(--text-muted)'} />
                      <h2 className="font-syne font-bold text-white">Current Plan</h2>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`status-badge ${isPro ? 'badge-delivered' : 'badge-optimized'} uppercase`}>
                        {subscription?.plan ?? 'Free'}
                      </span>
                      {isFree && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {optimizationsRemaining} of 10 free optimizations remaining
                        </span>
                      )}
                    </div>
                    <div className="mb-2 flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{subscription?.total_optimizations ?? 0} of {subscription?.monthly_optimization_limit ?? 10} optimizations used</span>
                      <span>{usagePct}%</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${usagePct}%`, background: usagePct > 80 ? 'var(--accent-warning)' : 'var(--accent-primary)' }} />
                    </div>
                    {usagePct > 80 && <p className="text-xs mt-2" style={{ color: 'var(--accent-warning)' }}>⚠ Approaching monthly limit — consider upgrading</p>}

                    {isFree && (
                      <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Free plan: 10 optimizations/month, 50 rows/upload. Upgrade to Pro for unlimited.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upgrade Plans */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { plan: 'Pro', planId: 'pro', price: '₹2,499/mo', amount: 249900, features: ['5,000 optimizations/month', '10 users', 'Bulk CSV up to 10,000 rows', 'Advanced analytics dashboard', 'AI insights + reasons', 'Priority email support'], highlighted: isPro },
                      { plan: 'Max', planId: 'enterprise', price: '₹9,999/mo', amount: 999900, features: ['Unlimited optimizations', 'Unlimited users', 'Bulk CSV: no row limit', 'SSO (SAML/OIDC)', 'REST API access', 'Dedicated account manager'], highlighted: false },
                    ].map(p => (
                      <div key={p.plan} className="glass-card p-5 relative overflow-hidden"
                        style={p.highlighted ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.04)' } : {}}>
                        {p.highlighted && (
                          <div className="absolute top-0 right-0 px-2 py-0.5 text-xs font-medium rounded-bl-lg"
                            style={{ background: 'var(--accent-success)', color: 'white' }}>
                            Current
                          </div>
                        )}
                        <h3 className="font-syne font-bold text-white mb-1">{p.plan}</h3>
                        <p className="font-bold text-xl mb-3" style={{ color: 'var(--accent-primary)' }}>{p.price}</p>
                        <ul className="space-y-1.5 mb-4">
                          {p.features.map(f => <li key={f} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--accent-success)' }}>✓</span>{f}</li>)}
                        </ul>
                        <button onClick={() => {
                            if (p.highlighted) {
                              setToast('You are on this plan')
                            } else {
                              setUpgradeModal({ planId: p.planId, planName: p.plan + ' Plan', amount: p.amount })
                            }
                          }}
                          className={`${p.highlighted ? 'btn-ghost' : 'btn-ghost'} w-full text-sm`}
                          style={{ padding: '8px' }}
                          disabled={p.highlighted}>
                          {p.highlighted ? 'Current Plan' : 'Upgrade'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Plan Comparison */}
                  <div className="glass-card p-6">
                    <h3 className="font-syne font-semibold text-white mb-4">Plan Comparison</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {['Feature', 'Free', 'Pro', 'Enterprise'].map(h => (
                            <th key={h} className="text-left py-2 pr-4 text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Optimizations/month', '10', 'Unlimited', 'Unlimited'],
                          ['Rows per upload', '50', '10,000', 'Unlimited'],
                          ['AI Optimization', 'Basic', 'Advanced', 'Advanced + Custom'],
                          ['Analytics', 'Basic', 'Advanced', 'Advanced + Export'],
                          ['Sustainability Reports', '—', '✓', '✓ + Custom ESG'],
                          ['Support', 'Community', 'Priority', 'Dedicated'],
                        ].map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {row.map((cell, j) => (
                              <td key={j} className="py-3 pr-4 text-xs"
                                style={{ color: j === 0 ? 'var(--text-primary)' : cell === '✓' || cell === '✓ + Custom ESG' ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {upgradeModal && (
        <PaymentModal
          isOpen={!!upgradeModal}
          onClose={() => setUpgradeModal(null)}
          planId={upgradeModal.planId}
          planName={upgradeModal.planName}
          amount={upgradeModal.amount}
          onSuccess={async () => {
            setUpgradeModal(null)
            setToast('Payment successful! Your plan has been activated.')
            await refreshSubscription()
          }}
        />
      )}
    </div>
  )
}
