'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { Copy, Check, RefreshCw } from 'lucide-react'
import type { ShipmentRow } from '@/lib/supabase'

interface ShipmentWithOrder extends ShipmentRow {
  optimized_order: {
    product_name: string
    savings_usd: number | null
    utilization_pct: number | null
    recommended_box: {
      box_name: string
      length_cm: number
      width_cm: number
      height_cm: number
    } | null
  } | null
}

const STATUS_STEPS = ['pending','optimized','packed','shipped','delivered'] as const
type StepStatus = typeof STATUS_STEPS[number]

const STATUS_TABS = ['All','Pending','Optimized','Packed','Shipped','Delivered'] as const

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,string> = {
    pending:'badge-pending', optimized:'badge-optimized',
    packed:'badge-packed',   shipped:'badge-shipped', delivered:'badge-delivered',
  }
  return <span className={`status-badge ${map[status] ?? 'badge-pending'}`}>{status}</span>
}

function CopyTracking({ number }: { number: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!number) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const copy = () => {
    navigator.clipboard.writeText(number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 group"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <span className="font-mono text-xs" style={{ color: 'var(--accent-secondary)' }}>{number}</span>
      {copied
        ? <Check size={11} color="var(--accent-success)" />
        : <Copy size={11} color="var(--text-muted)" className="opacity-0 group-hover:opacity-100" />}
    </button>
  )
}

function ProgressTracker({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current as StepStatus)
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center min-w-[56px]">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
              style={{
                background: i <= idx ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                border: `2px solid ${i <= idx ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                color: i <= idx ? 'white' : 'var(--text-muted)',
                fontSize: 10,
              }}>
              {i < idx ? '✓' : i === idx ? '●' : ''}
            </div>
            <span className="text-xs mt-1 capitalize whitespace-nowrap"
              style={{ color: i <= idx ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 10 }}>
              {step}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className="h-0.5 w-6 mx-0.5 mb-4 flex-shrink-0 transition-all"
              style={{ background: i < idx ? 'var(--accent-primary)' : 'var(--border-subtle)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function ShipmentsPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [shipments,   setShipments]   = useState<ShipmentWithOrder[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<string>('All')
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  const fetchShipments = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          optimized_order:optimized_orders!order_id (
            product_name, savings_usd, utilization_pct,
            recommended_box:box_catalog!recommended_box_id (box_name, length_cm, width_cm, height_cm)
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) console.error("Shipments fetch error:", error)
      if (!error) {
        setShipments((data as ShipmentWithOrder[]) ?? [])
      }
    } catch (err) {
      console.error("Shipments fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchShipments() }, [fetchShipments])

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') fetchShipments() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchShipments])

  const tabCounts = STATUS_TABS.reduce<Record<string,number>>((acc, tab) => {
    acc[tab] = tab === 'All'
      ? shipments.length
      : shipments.filter(s => s.status === tab.toLowerCase()).length
    return acc
  }, {})

  const filtered = activeTab === 'All'
    ? shipments
    : shipments.filter(s => s.status === activeTab.toLowerCase())

  function daysLabel(dateStr: string | null): React.ReactNode {
    if (!dateStr) return null
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
    if (days < 0) return <span style={{ color: 'var(--accent-danger)' }}>Overdue</span>
    if (days <= 3) return <span style={{ color: 'var(--accent-warning)' }}>{days}d left</span>
    return <span style={{ color: 'var(--accent-success)' }}>{days}d left</span>
  }

  if (isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="glass-card h-16 skeleton" />)}
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
      {/* Tab bar */}
      <motion.div variants={item} className="flex gap-2 mb-5 flex-wrap items-center">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color:      activeTab === tab ? 'white' : 'var(--text-secondary)',
              border:    `1px solid ${activeTab === tab ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}>
            {tab}
            <span className="ml-1.5 text-xs opacity-70">({tabCounts[tab] ?? 0})</span>
          </button>
        ))}
        <button onClick={fetchShipments} className="ml-auto p-2 rounded-lg"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          <RefreshCw size={14} />
        </button>
      </motion.div>

      <motion.div variants={item} className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading shipments…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🚚</div>
            <p style={{ color: 'var(--text-muted)' }}>No shipments in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Tracking #','Product','Carrier','Status','Est. Delivery','Box Used','Details'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <>
                    <tr key={s.id}
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="py-3 px-4"><CopyTracking number={s.tracking_number} /></td>
                      <td className="py-3 px-4 font-medium max-w-[140px]" style={{ color: 'var(--text-primary)' }}>
                        <div className="truncate">{s.optimized_order?.product_name ?? '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {s.carrier ?? '—'}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      <td className="py-3 px-4 text-xs">
                        {s.estimated_delivery_date
                          ? <div className="flex flex-col gap-0.5">
                              <span style={{ color: 'var(--text-secondary)' }}>{new Date(s.estimated_delivery_date).toLocaleDateString()}</span>
                              {daysLabel(s.estimated_delivery_date)}
                            </div>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {s.optimized_order?.recommended_box?.box_name ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {expandedId === s.id ? '▲' : '▼'}
                      </td>
                    </tr>

                    <AnimatePresence>
                      {expandedId === s.id && (
                        <tr key={`exp-${s.id}`}>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: 'hidden', background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div className="px-6 py-5">
                                <p className="text-xs uppercase tracking-wide mb-4"
                                  style={{ color: 'var(--text-muted)' }}>Shipment Progress</p>
                                <ProgressTracker current={s.status} />
                                <div className="grid grid-cols-3 gap-4 mt-5">
                                  {s.optimized_order?.savings_usd != null && (
                                    <div>
                                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Savings</p>
                                      <p className="font-semibold" style={{ color: 'var(--accent-success)' }}>
                                        ${s.optimized_order.savings_usd.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                  {s.optimized_order?.utilization_pct != null && (
                                    <div>
                                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Utilization</p>
                                      <p className="font-semibold text-white">
                                        {Math.round(s.optimized_order.utilization_pct)}%
                                      </p>
                                    </div>
                                  )}
                                  {s.optimized_order?.recommended_box && (
                                    <div>
                                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Box</p>
                                      <p className="font-semibold text-white" style={{ fontSize: 12 }}>
                                        {s.optimized_order.recommended_box.length_cm}×
                                        {s.optimized_order.recommended_box.width_cm}×
                                        {s.optimized_order.recommended_box.height_cm}cm
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
