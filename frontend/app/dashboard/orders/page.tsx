'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { X, Eye, Box, Download, Search, RefreshCw } from 'lucide-react'
import type { OptimizedOrderRow, CatalogBox } from '@/lib/types'

const BoxViewer3D = dynamic(() => import('@/components/BoxViewer3D'), { ssr: false })

// ── Extend the row with the joined box ──────────────────────────
interface OrderWithBox extends OptimizedOrderRow {
  recommended_box_data: CatalogBox | null
}

type ViewMode = 'solid' | 'wireframe' | 'exploded'
type FitFilter = 'all' | 'optimized' | 'same_box' | 'no_fit'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, string> = {
    pending: 'badge-pending', optimized: 'badge-optimized',
    packed: 'badge-packed', shipped: 'badge-shipped', delivered: 'badge-delivered',
    same_box: 'badge-optimized', no_fit: 'badge-pending',
  }
  const label = status ?? 'pending'
  return <span className={`status-badge ${map[label] ?? 'badge-pending'}`}>{label.replace('_', ' ')}</span>
}

function FitBadge({ fitStatus }: { fitStatus?: string | null }) {
  const map: Record<string, { cls: string; label: string }> = {
    optimized: { cls: 'badge-delivered', label: '✓ Optimized' },
    same_box:  { cls: 'badge-optimized', label: '= Same Box' },
    no_fit:    { cls: 'badge-pending',   label: '✗ No Fit' },
    error:     { cls: 'badge-pending',   label: '! Error' },
  }
  const cfg = map[fitStatus ?? ''] ?? { cls: 'badge-pending', label: fitStatus ?? '—' }
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
}

export default function OrdersPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [orders, setOrders] = useState<OrderWithBox[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fitFilter, setFitFilter] = useState<FitFilter>('all')
  const [selected, setSelected] = useState<OrderWithBox | null>(null)
  const [viewer3D, setViewer3D] = useState<OrderWithBox | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('solid')
  const [autoRotate, setAutoRotate] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const fetchOrders = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('optimized_orders')
        .select(`
          *,
          recommended_box_data:box_catalog!recommended_box_id (
            id, box_name, length_cm, width_cm, height_cm,
            max_weight_kg, cost_per_box_usd, sustainability_score, material_type, is_active, company_id
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) console.error("Orders fetch error:", error)
      if (!error) {
        setOrders((data as OrderWithBox[]) ?? [])
      }
    } catch (err) {
      console.error("Orders fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="glass-card h-16 skeleton" />)}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>We couldn't find your company data. Please try signing out and signing back in.</p>
    </div>
  )

  // Filtered + searched + paginated
  const filtered = orders.filter(o => {
    const matchSearch = !search || o.product_name?.toLowerCase().includes(search.toLowerCase())
    const matchFit = fitFilter === 'all' || o.fit_status === fitFilter
    return matchSearch && matchFit
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const exportToCSV = () => {
    const header = [
      'product_name','original_box_dimensions','optimized_box_dimensions',
      'original_box_price','optimized_box_price','shipping_zone',
      'savings','fit_status','optimization_reason',
    ].join(',')
    const rows = filtered.map(o => [
      `"${o.product_name}"`,
      `"${o.used_box_length_cm ?? ''}×${o.used_box_width_cm ?? ''}×${o.used_box_height_cm ?? ''}cm"`,
      `"${o.recommended_box_data ? `${o.recommended_box_data.length_cm}×${o.recommended_box_data.width_cm}×${o.recommended_box_data.height_cm}cm` : '—'}"`,
      (o.original_box_price_usd ?? o.used_box_price_usd ?? 0).toFixed(2),
      (o.optimized_box_price_usd ?? 0).toFixed(2),
      `"${o.shipping_zone ?? ''}"`,
      (o.savings_usd ?? 0).toFixed(2),
      o.fit_status ?? '',
      `"${(o.optimization_reason ?? '').replace(/"/g, "'")}"`,
    ].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shipzi-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const voidSpace = (order: OrderWithBox): number => {
    const box = order.recommended_box_data
    if (!box) return 0
    const boxVol = box.length_cm * box.width_cm * box.height_cm
    const prodVol = (order.product_length_cm ?? 0) * (order.product_width_cm ?? 0) * (order.product_height_cm ?? 0)
    return Math.round(Math.max(0, boxVol - prodVol))
  }

  const FIT_FILTERS: { key: FitFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'optimized', label: 'Optimized' },
    { key: 'same_box', label: 'Same Box' },
    { key: 'no_fit', label: 'No Fit' },
  ]

  const totalSavings = filtered.reduce((s, o) => s + (o.savings_usd ?? 0), 0)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-full">
      {/* Toolbar */}
      <motion.div variants={itemVariant} className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="input-dark"
            style={{ paddingLeft: 36, padding: '9px 12px 9px 36px', fontSize: 13 }}
            placeholder="Search products..."
          />
        </div>

        {/* Fit filter tabs */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {FIT_FILTERS.map(f => (
            <button key={f.key} onClick={() => { setFitFilter(f.key); setPage(0) }}
              className="px-3 py-2 text-xs font-medium transition-all"
              style={{ background: fitFilter === f.key ? 'var(--accent-primary)' : 'transparent', color: fitFilter === f.key ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {totalSavings > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16,185,129,0.2)' }}>
              Total savings: ${totalSavings.toFixed(2)}
            </span>
          )}
          <button onClick={fetchOrders} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={exportToCSV} className="btn-ghost flex items-center gap-1.5" style={{ fontSize: 12, padding: '8px 14px' }}>
            <Download size={13} /> Export
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariant} className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
            Loading orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-white mb-1">No orders found</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {orders.length === 0 ? 'Run an optimization in the Optimize tab to populate orders.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Product', 'Original Box', 'Optimized Box', 'Savings', 'Utilization', 'Fit', 'Zone', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(order => {
                    const box = order.recommended_box_data
                    return (
                      <tr key={order.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                        <td className="py-3 px-4" style={{ minWidth: 140 }}>
                          <div className="font-medium truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{order.product_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {order.product_length_cm}×{order.product_width_cm}×{order.product_height_cm}cm
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>{order.used_box_length_cm ?? '—'}×{order.used_box_width_cm ?? '—'}×{order.used_box_height_cm ?? '—'}cm</div>
                          <div style={{ color: 'var(--text-muted)' }}>${(order.original_box_price_usd ?? order.used_box_price_usd ?? 0).toFixed(2)}</div>
                        </td>

                        <td className="py-3 px-4 text-xs" style={{ whiteSpace: 'nowrap' }}>
                          {box ? (
                            <>
                              <div style={{ color: order.fit_status === 'optimized' ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                {box.length_cm}×{box.width_cm}×{box.height_cm}cm
                              </div>
                              <div style={{ color: 'var(--text-muted)' }}>{box.box_name}</div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-semibold text-sm whitespace-nowrap"
                          style={{ color: (order.savings_usd ?? 0) > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                          {(order.savings_usd ?? 0) > 0 ? `+$${(order.savings_usd ?? 0).toFixed(2)}` : '—'}
                        </td>

                        <td className="py-3 px-4" style={{ minWidth: 100 }}>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${order.utilization_pct ?? 0}%`, background: 'var(--accent-primary)' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{Math.round(order.utilization_pct ?? 0)}%</span>
                          </div>
                        </td>

                        <td className="py-3 px-4"><FitBadge fitStatus={order.fit_status} /></td>

                        <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {order.shipping_zone ?? '—'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(order)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                              title="View details">
                              <Eye size={13} />
                            </button>
                            {box && (
                              <button
                                onClick={() => { setViewer3D(order); setViewMode('solid') }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                                title="3D view">
                                <Box size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>
                    ← Prev
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                    className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── 3D Viewer Modal ── */}
      <AnimatePresence>
        {viewer3D?.recommended_box_data && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-3xl rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>

              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h2 className="font-syne font-bold text-white">3D Box Visualization</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {viewer3D.recommended_box_data.box_name} — {viewer3D.recommended_box_data.length_cm}×{viewer3D.recommended_box_data.width_cm}×{viewer3D.recommended_box_data.height_cm}cm
                  </p>
                </div>
                <button onClick={() => setViewer3D(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ height: 300 }}>
                <BoxViewer3D
                  box={viewer3D.recommended_box_data}
                  product={{
                    length_cm: viewer3D.product_length_cm ?? 10,
                    width_cm: viewer3D.product_width_cm ?? 8,
                    height_cm: viewer3D.product_height_cm ?? 6,
                  }}
                  mode={viewMode}
                  autoRotate={autoRotate}
                />
              </div>

              <div className="grid grid-cols-4 gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {[
                  ['Utilization', `${Math.round(viewer3D.utilization_pct ?? 0)}%`],
                  ['DIM Weight', `${viewer3D.dimensional_weight_kg ?? 0}kg`],
                  ['Savings', `$${(viewer3D.savings_usd ?? 0).toFixed(2)}`],
                  ['Void Space', `${voidSpace(viewer3D)} cm³`],
                ].map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className="text-sm font-semibold text-white">{v}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{k}</div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  {(['solid', 'wireframe', 'exploded'] as ViewMode[]).map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                      className="px-3 py-1.5 text-xs font-medium capitalize transition-colors"
                      style={{ background: viewMode === m ? 'var(--accent-primary)' : 'transparent', color: viewMode === m ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                      {m}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAutoRotate(!autoRotate)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: autoRotate ? 'rgba(37,99,235,0.15)' : 'var(--bg-elevated)', color: autoRotate ? 'var(--accent-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                  {autoRotate ? '⏸ Pause' : '▶ Auto-rotate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Side Detail Panel ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" style={{ background: 'black' }}
              onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-40 w-[380px] overflow-y-auto"
              style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-syne font-bold text-white">Order Details</h3>
                  <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Product */}
                <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Product</p>
                  <p className="font-semibold text-white">{selected.product_name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {selected.product_length_cm}×{selected.product_width_cm}×{selected.product_height_cm}cm · {selected.product_weight_kg ?? '?'}kg
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Fragility score: {selected.fragility_score ?? selected.fragility ?? '—'} · Zone: {selected.shipping_zone}
                  </p>
                </div>

                {/* Box comparison */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-xs uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Original Box</p>
                    <p className="text-sm font-semibold text-white">
                      {selected.used_box_length_cm}×{selected.used_box_width_cm}×{selected.used_box_height_cm}cm
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>${(selected.original_box_price_usd ?? selected.used_box_price_usd ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: selected.fit_status === 'optimized' ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)', border: `1px solid ${selected.fit_status === 'optimized' ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}` }}>
                    <p className="text-xs uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Optimized Box</p>
                    {selected.recommended_box_data ? (
                      <>
                        <p className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>
                          {selected.recommended_box_data.length_cm}×{selected.recommended_box_data.width_cm}×{selected.recommended_box_data.height_cm}cm
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{selected.recommended_box_data.box_name}</p>
                      </>
                    ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No fit</span>}
                  </div>
                </div>

                {/* Savings */}
                {(selected.savings_usd ?? 0) > 0 && (
                  <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Per Shipment Savings</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--accent-success)' }}>
                        +${(selected.savings_usd ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Fit status + reason */}
                <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Optimization Result</p>
                    <FitBadge fitStatus={selected.fit_status} />
                  </div>
                  {selected.optimization_reason && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {selected.optimization_reason}
                    </p>
                  )}
                </div>

                {/* Sustainability */}
                <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Sustainability Score</p>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-syne font-bold"
                      style={{ color: (selected.sustainability_score ?? 0) > 70 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                      {selected.sustainability_score ?? 0}/100
                    </div>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${selected.sustainability_score ?? 0}%`, background: (selected.sustainability_score ?? 0) > 70 ? 'var(--accent-success)' : 'var(--accent-warning)' }} />
                    </div>
                  </div>
                </div>

                {/* AI explanation */}
                {selected.ai_explanation && (
                  <blockquote className="p-4 rounded-xl italic text-sm mb-4"
                    style={{ background: 'rgba(6,182,212,0.06)', borderLeft: '3px solid var(--accent-secondary)', color: 'var(--text-secondary)' }}>
                    {selected.ai_explanation}
                  </blockquote>
                )}

                <div className="flex items-center justify-between">
                  <StatusBadge status={selected.fit_status} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(selected.created_at).toLocaleDateString()}
                  </span>
                </div>

                {selected.recommended_box_data && (
                  <button
                    onClick={() => { setViewer3D(selected); setViewMode('solid') }}
                    className="btn-ghost w-full mt-4 justify-center flex items-center gap-2"
                    style={{ fontSize: 13 }}>
                    <Box size={14} /> View in 3D
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
