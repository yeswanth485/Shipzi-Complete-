'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { Plus, X, Check, Box, Eye } from 'lucide-react'

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

const MATERIAL_ICONS: Record<string, string> = {
  corrugated: '📦',
  kraft: 'brown_box',
  rigid: 'gift',
  poly_mailer: '💌',
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

function BoxCard({ box, onClick, isSelected }: { box: BoxItem; onClick: () => void; isSelected: boolean }) {
  const volume = box.length_cm * box.width_cm * box.height_cm
  const matColor = MATERIAL_COLORS[box.material_type] ?? '#6B7280'
  return (
    <motion.div
      variants={itemVariant}
      onClick={onClick}
      className="glass-card p-4 cursor-pointer transition-all duration-300 group"
      style={{
        border: isSelected ? `2px solid var(--accent-primary)` : '2px solid transparent',
        background: isSelected ? 'rgba(37,99,235,0.06)' : undefined,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'transparent' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: `${matColor}20`, border: `1px solid ${matColor}40` }}>
            📦
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{box.box_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{box.material_type.replace('_', ' ')}</p>
          </div>
        </div>
        <span className={`status-badge ${box.is_active ? 'badge-delivered' : 'badge-pending'}`}>
          {box.is_active ? 'Active' : 'Off'}
        </span>
      </div>

      {/* Dimension bars */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs w-8" style={{ color: 'var(--text-muted)' }}>L</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (box.length_cm / 60) * 100)}%`, background: '#2563EB' }} />
          </div>
          <span className="text-xs w-12 text-right" style={{ color: 'var(--text-secondary)' }}>{box.length_cm}cm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8" style={{ color: 'var(--text-muted)' }}>W</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (box.width_cm / 45) * 100)}%`, background: '#06B6D4' }} />
          </div>
          <span className="text-xs w-12 text-right" style={{ color: 'var(--text-secondary)' }}>{box.width_cm}cm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8" style={{ color: 'var(--text-muted)' }}>H</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (box.height_cm / 35) * 100)}%`, background: '#10B981' }} />
          </div>
          <span className="text-xs w-12 text-right" style={{ color: 'var(--text-secondary)' }}>{box.height_cm}cm</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-muted)' }}>{volume.toLocaleString()} cm³</span>
        <span className="font-semibold" style={{ color: 'var(--accent-success)' }}>${box.cost_per_box_usd}</span>
      </div>
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
  const [filterMaterial, setFilterMaterial] = useState<string>('all')
  const [newBox, setNewBox] = useState({
    box_name: '', length_cm: '', width_cm: '', height_cm: '',
    max_weight_kg: '', material_type: 'corrugated', cost_per_box_usd: '', sustainability_score: '70',
  })

  const DEFAULT_BOXES = [
    { box_name: 'XS Corrugated Mailer', length_cm: 15, width_cm: 10, height_cm: 5, max_weight_kg: 1, material_type: 'corrugated', cost_per_box_usd: 0.45, sustainability_score: 75 },
    { box_name: 'Small Corrugated Shipper', length_cm: 20, width_cm: 15, height_cm: 10, max_weight_kg: 3, material_type: 'corrugated', cost_per_box_usd: 0.65, sustainability_score: 72 },
    { box_name: 'Medium Corrugated Box', length_cm: 30, width_cm: 22, height_cm: 15, max_weight_kg: 7, material_type: 'corrugated', cost_per_box_usd: 0.95, sustainability_score: 70 },
    { box_name: 'Standard Shipping Box', length_cm: 35, width_cm: 25, height_cm: 20, max_weight_kg: 10, material_type: 'corrugated', cost_per_box_usd: 1.20, sustainability_score: 68 },
    { box_name: 'Large Corrugated Box', length_cm: 45, width_cm: 35, height_cm: 25, max_weight_kg: 15, material_type: 'corrugated', cost_per_box_usd: 1.80, sustainability_score: 65 },
    { box_name: 'XL Corrugated Container', length_cm: 55, width_cm: 40, height_cm: 30, max_weight_kg: 20, material_type: 'corrugated', cost_per_box_usd: 2.40, sustainability_score: 62 },
    { box_name: 'Flat Corrugated Mailer', length_cm: 35, width_cm: 25, height_cm: 5, max_weight_kg: 2, material_type: 'corrugated', cost_per_box_usd: 0.55, sustainability_score: 78 },
    { box_name: 'Book Mailer Box', length_cm: 28, width_cm: 20, height_cm: 8, max_weight_kg: 3, material_type: 'corrugated', cost_per_box_usd: 0.70, sustainability_score: 74 },
    { box_name: 'Cubic Shipping Box', length_cm: 25, width_cm: 25, height_cm: 25, max_weight_kg: 12, material_type: 'corrugated', cost_per_box_usd: 1.35, sustainability_score: 66 },
    { box_name: 'Long Corrugated Box', length_cm: 60, width_cm: 15, height_cm: 10, max_weight_kg: 5, material_type: 'corrugated', cost_per_box_usd: 1.10, sustainability_score: 69 },
    { box_name: 'Heavy Duty Corrugated', length_cm: 40, width_cm: 30, height_cm: 30, max_weight_kg: 25, material_type: 'corrugated', cost_per_box_usd: 2.80, sustainability_score: 60 },
    { box_name: 'Mini Corrugated Cube', length_cm: 12, width_cm: 12, height_cm: 12, max_weight_kg: 2, material_type: 'corrugated', cost_per_box_usd: 0.40, sustainability_score: 80 },
    { box_name: 'Small Kraft Mailer', length_cm: 18, width_cm: 13, height_cm: 8, max_weight_kg: 2, material_type: 'kraft', cost_per_box_usd: 0.55, sustainability_score: 85 },
    { box_name: 'Medium Kraft Box', length_cm: 30, width_cm: 22, height_cm: 15, max_weight_kg: 6, material_type: 'kraft', cost_per_box_usd: 1.00, sustainability_score: 82 },
    { box_name: 'Large Kraft Shipper', length_cm: 45, width_cm: 35, height_cm: 25, max_weight_kg: 12, material_type: 'kraft', cost_per_box_usd: 1.75, sustainability_score: 80 },
    { box_name: 'Kraft Pizza Box', length_cm: 35, width_cm: 35, height_cm: 5, max_weight_kg: 2, material_type: 'kraft', cost_per_box_usd: 0.80, sustainability_score: 88 },
    { box_name: 'Kraft Gift Box', length_cm: 25, width_cm: 18, height_cm: 10, max_weight_kg: 3, material_type: 'kraft', cost_per_box_usd: 1.25, sustainability_score: 84 },
    { box_name: 'XL Kraft Container', length_cm: 50, width_cm: 40, height_cm: 35, max_weight_kg: 18, material_type: 'kraft', cost_per_box_usd: 2.50, sustainability_score: 78 },
    { box_name: 'Poly Mailer XS', length_cm: 20, width_cm: 25, height_cm: 2, max_weight_kg: 0.5, material_type: 'poly_mailer', cost_per_box_usd: 0.15, sustainability_score: 35 },
    { box_name: 'Poly Mailer Small', length_cm: 25, width_cm: 35, height_cm: 2, max_weight_kg: 1, material_type: 'poly_mailer', cost_per_box_usd: 0.22, sustainability_score: 38 },
    { box_name: 'Poly Mailer Medium', length_cm: 30, width_cm: 42, height_cm: 2, max_weight_kg: 2, material_type: 'poly_mailer', cost_per_box_usd: 0.30, sustainability_score: 40 },
    { box_name: 'Poly Mailer Large', length_cm: 38, width_cm: 52, height_cm: 2, max_weight_kg: 3, material_type: 'poly_mailer', cost_per_box_usd: 0.42, sustainability_score: 42 },
    { box_name: 'Bubble Poly Mailer', length_cm: 30, width_cm: 40, height_cm: 3, max_weight_kg: 2, material_type: 'poly_mailer', cost_per_box_usd: 0.55, sustainability_score: 32 },
    { box_name: 'Poly Mailer XL', length_cm: 45, width_cm: 60, height_cm: 2, max_weight_kg: 5, material_type: 'poly_mailer', cost_per_box_usd: 0.60, sustainability_score: 36 },
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
      setToast('Box added to catalog')
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

  const filteredBoxes = filterMaterial === 'all' ? boxes : boxes.filter(b => b.material_type === filterMaterial)

  const materials = ['all', ...new Set(boxes.map(b => b.material_type))]

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="glass-card h-16 skeleton" />)}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>Please try signing out and signing back in.</p>
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemVariant} className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {boxes.length} boxes in catalog — click any box to preview in 3D
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2" style={{ padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> Add Box
        </button>
      </motion.div>

      {/* Material filter tabs */}
      <motion.div variants={itemVariant} className="flex gap-2 mb-5">
        {materials.map(m => (
          <button key={m} onClick={() => setFilterMaterial(m)}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-all"
            style={{
              background: filterMaterial === m ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: filterMaterial === m ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filterMaterial === m ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}>
            {m === 'all' ? 'All' : m.replace('_', ' ')}
          </button>
        ))}
      </motion.div>

      <div className="flex gap-6">
        {/* Left: Box Grid */}
        <div className="flex-1 min-w-0">
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
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Sustainability (1-100)</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBoxes.map(box => (
              <BoxCard key={box.id} box={box} isSelected={selected?.id === box.id} onClick={() => setSelected(box)} />
            ))}
          </div>
        </div>

        {/* Right: 3D Preview Panel */}
        {selected && (
          <div className="w-96 flex-shrink-0">
            <div className="glass-card p-4 sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-syne font-semibold text-white text-sm">{selected.box_name}</h3>
                <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>

              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-subtle)', height: 300, background: 'rgba(10,13,18,0.5)' }}>
                <BoxViewer3D
                  box={selected}
                  product={{
                    length_cm: selected.length_cm * 0.5,
                    width_cm: selected.width_cm * 0.5,
                    height_cm: selected.height_cm * 0.4,
                  }}
                  mode="solid"
                  autoRotate
                  showLabels
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Length', value: `${selected.length_cm}cm`, color: '#2563EB' },
                    { label: 'Width', value: `${selected.width_cm}cm`, color: '#06B6D4' },
                    { label: 'Height', value: `${selected.height_cm}cm`, color: '#10B981' },
                    { label: 'Volume', value: `${(selected.length_cm * selected.width_cm * selected.height_cm).toLocaleString()} cm³`, color: '#F59E0B' },
                  ].map(d => (
                    <div key={d.label} className="p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.label}</p>
                      <p className="text-sm font-semibold" style={{ color: d.color }}>{d.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    ['Max Weight', `${selected.max_weight_kg}kg`],
                    ['Material', selected.material_type.replace('_', ' ')],
                    ['Cost', `$${selected.cost_per_box_usd}/box`],
                    ['Eco Score', `${selected.sustainability_score}/100`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => toggleActive(selected)}
                  className="w-full text-xs px-3 py-2 rounded-lg transition-all mt-2"
                  style={{
                    background: selected.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: selected.is_active ? 'var(--accent-danger)' : 'var(--accent-success)',
                    border: `1px solid ${selected.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    cursor: 'pointer',
                  }}>
                  {selected.is_active ? 'Deactivate Box' : 'Activate Box'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </motion.div>
  )
}
