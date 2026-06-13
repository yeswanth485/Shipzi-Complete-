'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { Plus, X, Check } from 'lucide-react'

const BoxViewer3D = dynamic(() => import('@/components/BoxViewer3D'), { ssr: false })

interface BoxItem {
  id: string
  box_name: string
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
  material_type: string
  cost_per_box_usd: number
  sustainability_score: number
  is_active: boolean
  created_at: string
}

const MATERIAL_COLORS: Record<string, string> = {
  corrugated: '#D4A437',
  kraft: '#A0783C',
  rigid: '#6B7280',
  poly_mailer: '#8B5CF6',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '2px solid var(--accent-success)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <Check size={16} color="var(--accent-success)" />
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{message}</span>
    </motion.div>
  )
}

export default function BoxCatalogPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BoxItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [newBox, setNewBox] = useState({
    box_name: '', length_cm: '', width_cm: '', height_cm: '',
    max_weight_kg: '', material_type: 'corrugated', cost_per_box_usd: '', sustainability_score: '70',
  })

  const DEFAULT_BOXES = [
    // ── Corrugated Boxes (12) ──────────────────────────
    { box_name: 'XS Corrugated Mailer', length_cm: 15, width_cm: 10, height_cm: 5, max_weight_kg: 1, material_type: 'corrugated', cost_per_box_usd: 0.45, sustainability_score: 75 },
    { box_name: 'Small Corrugated Shipper', length_cm: 20, width_cm: 15, height_cm: 10, max_weight_kg: 3, material_type: 'corrugated', cost_per_box_usd: 0.65, sustainability_score: 72 },
    { box_name: 'Medium Corrugated Box', length_cm: 30, width_cm: 22, height_cm: 15, max_weight_kg: 7, material_type: 'corrugated', cost_per_box_usd: 0.95, sustainability_score: 70 },
    { box_name: 'Standard Shipping Box', length_cm: 35, width_cm: 25, height_cm: 20, max_weight_kg: 10, material_type: 'corrugated', cost_per_box_usd: 1.20, sustainability_score: 68 },
    { box_name: 'Large Corrugated Box', length_cm: 45, width_cm: 35, height_cm: 25, max_weight_kg: 15, material_type: 'corrugated', cost_per_box_usd: 1.80, sustainability_score: 65 },
    { box_name: 'XL Corrugated Container', length_cm: 55, width_cm: 40, height_cm: 30, max_weight_kg: 20, material_type: 'corrugated', cost_per_box_usd: 2.40, sustainability_score: 62 },
    { box_name: 'Flat CorrugatedMailer', length_cm: 35, width_cm: 25, height_cm: 5, max_weight_kg: 2, material_type: 'corrugated', cost_per_box_usd: 0.55, sustainability_score: 78 },
    { box_name: 'Book Mailer Box', length_cm: 28, width_cm: 20, height_cm: 8, max_weight_kg: 3, material_type: 'corrugated', cost_per_box_usd: 0.70, sustainability_score: 74 },
    { box_name: 'Cubic Shipping Box', length_cm: 25, width_cm: 25, height_cm: 25, max_weight_kg: 12, material_type: 'corrugated', cost_per_box_usd: 1.35, sustainability_score: 66 },
    { box_name: 'Long Corrugated Box', length_cm: 60, width_cm: 15, height_cm: 10, max_weight_kg: 5, material_type: 'corrugated', cost_per_box_usd: 1.10, sustainability_score: 69 },
    { box_name: 'Heavy Duty Corrugated', length_cm: 40, width_cm: 30, height_cm: 30, max_weight_kg: 25, material_type: 'corrugated', cost_per_box_usd: 2.80, sustainability_score: 60 },
    { box_name: 'Mini Corrugated Cube', length_cm: 12, width_cm: 12, height_cm: 12, max_weight_kg: 2, material_type: 'corrugated', cost_per_box_usd: 0.40, sustainability_score: 80 },
    // ── Kraft Boxes (6) ────────────────────────────────
    { box_name: 'Small Kraft Mailer', length_cm: 18, width_cm: 13, height_cm: 8, max_weight_kg: 2, material_type: 'kraft', cost_per_box_usd: 0.55, sustainability_score: 85 },
    { box_name: 'Medium Kraft Box', length_cm: 30, width_cm: 22, height_cm: 15, max_weight_kg: 6, material_type: 'kraft', cost_per_box_usd: 1.00, sustainability_score: 82 },
    { box_name: 'Large Kraft Shipper', length_cm: 45, width_cm: 35, height_cm: 25, max_weight_kg: 12, material_type: 'kraft', cost_per_box_usd: 1.75, sustainability_score: 80 },
    { box_name: 'Kraft Pizza Box', length_cm: 35, width_cm: 35, height_cm: 5, max_weight_kg: 2, material_type: 'kraft', cost_per_box_usd: 0.80, sustainability_score: 88 },
    { box_name: 'Kraft Gift Box', length_cm: 25, width_cm: 18, height_cm: 10, max_weight_kg: 3, material_type: 'kraft', cost_per_box_usd: 1.25, sustainability_score: 84 },
    { box_name: 'XL Kraft Container', length_cm: 50, width_cm: 40, height_cm: 35, max_weight_kg: 18, material_type: 'kraft', cost_per_box_usd: 2.50, sustainability_score: 78 },
    // ── Poly Mailers (6) ───────────────────────────────
    { box_name: 'Poly Mailer XS', length_cm: 20, width_cm: 25, height_cm: 2, max_weight_kg: 0.5, material_type: 'poly_mailer', cost_per_box_usd: 0.15, sustainability_score: 35 },
    { box_name: 'Poly Mailer Small', length_cm: 25, width_cm: 35, height_cm: 2, max_weight_kg: 1, material_type: 'poly_mailer', cost_per_box_usd: 0.22, sustainability_score: 38 },
    { box_name: 'Poly Mailer Medium', length_cm: 30, width_cm: 42, height_cm: 2, max_weight_kg: 2, material_type: 'poly_mailer', cost_per_box_usd: 0.30, sustainability_score: 40 },
    { box_name: 'Poly Mailer Large', length_cm: 38, width_cm: 52, height_cm: 2, max_weight_kg: 3, material_type: 'poly_mailer', cost_per_box_usd: 0.42, sustainability_score: 42 },
    { box_name: 'Bubble Poly Mailer', length_cm: 30, width_cm: 40, height_cm: 3, max_weight_kg: 2, material_type: 'poly_mailer', cost_per_box_usd: 0.55, sustainability_score: 32 },
    { box_name: 'Poly Mailer XL', length_cm: 45, width_cm: 60, height_cm: 2, max_weight_kg: 5, material_type: 'poly_mailer', cost_per_box_usd: 0.60, sustainability_score: 36 },
    // ── Rigid Boxes (6) ────────────────────────────────
    { box_name: 'Small Rigid Gift Box', length_cm: 15, width_cm: 10, height_cm: 8, max_weight_kg: 2, material_type: 'rigid', cost_per_box_usd: 2.80, sustainability_score: 55 },
    { box_name: 'Medium Rigid Box', length_cm: 25, width_cm: 18, height_cm: 10, max_weight_kg: 4, material_type: 'rigid', cost_per_box_usd: 3.50, sustainability_score: 52 },
    { box_name: 'Large Rigid Gift Box', length_cm: 35, width_cm: 25, height_cm: 15, max_weight_kg: 8, material_type: 'rigid', cost_per_box_usd: 5.20, sustainability_score: 48 },
    { box_name: 'Premium Rigid Display Box', length_cm: 30, width_cm: 20, height_cm: 20, max_weight_kg: 6, material_type: 'rigid', cost_per_box_usd: 6.50, sustainability_score: 45 },
    { box_name: 'Rigid Jewelry Box', length_cm: 12, width_cm: 10, height_cm: 5, max_weight_kg: 1, material_type: 'rigid', cost_per_box_usd: 2.20, sustainability_score: 50 },
    { box_name: 'XL Rigid Presentation Box', length_cm: 45, width_cm: 35, height_cm: 20, max_weight_kg: 12, material_type: 'rigid', cost_per_box_usd: 8.50, sustainability_score: 42 },
  ]

  const fetchBoxes = async () => {
    if (!companyId) return
    try {
      const { data, error } = await supabase.from('box_catalog').select('*').eq('company_id', companyId).order('created_at')
      if (error) console.error("Box catalog fetch error:", error)
      let boxesData = (data as BoxItem[]) ?? []

      // If no boxes exist for this company, seed default boxes
      if (boxesData.length === 0) {
        const toInsert = DEFAULT_BOXES.map(b => ({ ...b, company_id: companyId, is_active: true }))
        const { error: seedErr } = await supabase.from('box_catalog').insert(toInsert)
        if (!seedErr) {
          const { data: refetched } = await supabase.from('box_catalog').select('*').eq('company_id', companyId).order('created_at')
          boxesData = (refetched as BoxItem[]) ?? []
        }
      }

      setBoxes(boxesData)
    } catch (err) {
      console.error("Box catalog fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoxes() }, [companyId])

  const handleAdd = async () => {
    if (!companyId) return
    setSaving(true)
    const { error } = await supabase.from('box_catalog').insert({
      company_id: companyId,
      box_name: newBox.box_name,
      length_cm: parseFloat(newBox.length_cm),
      width_cm: parseFloat(newBox.width_cm),
      height_cm: parseFloat(newBox.height_cm),
      max_weight_kg: parseFloat(newBox.max_weight_kg),
      material_type: newBox.material_type,
      cost_per_box_usd: parseFloat(newBox.cost_per_box_usd),
      sustainability_score: parseInt(newBox.sustainability_score),
      is_active: true,
    })
    if (!error) {
      await fetchBoxes()
      setShowAdd(false)
      setToast('Box added to catalog ✓')
      setNewBox({ box_name: '', length_cm: '', width_cm: '', height_cm: '', max_weight_kg: '', material_type: 'corrugated', cost_per_box_usd: '', sustainability_score: '70' })
    }
    setSaving(false)
  }

  const toggleActive = async (box: BoxItem) => {
    await supabase.from('box_catalog').update({ is_active: !box.is_active }).eq('id', box.id)
    setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, is_active: !b.is_active } : b))
    if (selected?.id === box.id) setSelected({ ...box, is_active: !box.is_active })
    setToast(`Box ${!box.is_active ? 'activated' : 'deactivated'}`)
  }

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="glass-card h-16 skeleton" />)}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>We couldn't find your company data. Please try signing out and signing back in.</p>
    </div>
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Left: Table */}
        <div className="flex-1 min-w-0">
          <motion.div variants={itemVariant} className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{boxes.length} boxes in catalog</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2" style={{ padding: '8px 16px', fontSize: 13 }}>
              <Plus size={14} /> Add Box
            </button>
          </motion.div>

          {/* Add Box Form */}
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-syne font-semibold text-white">Add New Box</h3>
                <button onClick={() => setShowAdd(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Box Name', key: 'box_name', placeholder: 'e.g. Medium Mailer' },
                  { label: 'Length (cm)', key: 'length_cm', placeholder: '30' },
                  { label: 'Width (cm)', key: 'width_cm', placeholder: '20' },
                  { label: 'Height (cm)', key: 'height_cm', placeholder: '15' },
                  { label: 'Max Weight (kg)', key: 'max_weight_kg', placeholder: '5' },
                  { label: 'Cost per Box ($)', key: 'cost_per_box_usd', placeholder: '1.20' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                    <input value={newBox[f.key as keyof typeof newBox]} onChange={e => setNewBox(n => ({ ...n, [f.key]: e.target.value }))}
                      className="input-dark" placeholder={f.placeholder} style={{ padding: '8px 12px', fontSize: 13 }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Material</label>
                  <select value={newBox.material_type} onChange={e => setNewBox(n => ({ ...n, material_type: e.target.value }))}
                    className="input-dark" style={{ padding: '8px 12px', fontSize: 13 }}>
                    {['corrugated', 'kraft', 'rigid', 'poly_mailer'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Sustainability (1–100)</label>
                  <input type="number" min="1" max="100" value={newBox.sustainability_score}
                    onChange={e => setNewBox(n => ({ ...n, sustainability_score: e.target.value }))}
                    className="input-dark" style={{ padding: '8px 12px', fontSize: 13 }} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
                <button onClick={handleAdd} disabled={saving || !newBox.box_name} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  {saving ? 'Saving...' : 'Add Box'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading catalog...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Name', 'Dimensions', 'Max Weight', 'Material', 'Cost', 'Sustainability', 'Status', ''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map(box => (
                      <tr key={box.id}
                        onClick={() => setSelected(box)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border-subtle)', background: selected?.id === box.id ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                        onMouseEnter={e => { if (selected?.id !== box.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={e => { if (selected?.id !== box.id) e.currentTarget.style.background = 'transparent' }}>
                        <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{box.box_name}</td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {box.length_cm}×{box.width_cm}×{box.height_cm}cm
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{box.max_weight_kg}kg</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{ background: `${MATERIAL_COLORS[box.material_type]}20`, color: MATERIAL_COLORS[box.material_type] ?? 'var(--text-secondary)' }}>
                            {box.material_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>${box.cost_per_box_usd}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${box.sustainability_score}%`, background: box.sustainability_score > 70 ? 'var(--accent-success)' : box.sustainability_score > 40 ? 'var(--accent-warning)' : 'var(--accent-danger)' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{box.sustainability_score}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${box.is_active ? 'badge-delivered' : 'badge-pending'}`}>
                            {box.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={e => { e.stopPropagation(); toggleActive(box) }}
                            className="text-xs px-2 py-1 rounded transition-all"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                            {box.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: 3D Preview Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <div className="glass-card p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-syne font-semibold text-white text-sm">{selected.box_name}</h3>
                <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              <div style={{ height: 240 }}>
                <BoxViewer3D
                  box={selected}
                  product={{ length_cm: selected.length_cm * 0.5, width_cm: selected.width_cm * 0.5, height_cm: selected.height_cm * 0.4 }}
                  mode="solid"
                  autoRotate
                />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ['Dimensions', `${selected.length_cm}×${selected.width_cm}×${selected.height_cm}cm`],
                  ['Max Weight', `${selected.max_weight_kg}kg`],
                  ['Material', selected.material_type],
                  ['Cost', `$${selected.cost_per_box_usd}/box`],
                  ['Eco Score', `${selected.sustainability_score}/100`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </motion.div>
  )
}
