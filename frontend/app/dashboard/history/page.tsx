'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { ChevronDown, ChevronUp, Package, Calendar, DollarSign, TrendingUp } from 'lucide-react'

interface OptimizationRun {
  id: string
  run_name: string | null
  total_products: number | null
  total_savings_usd: number | null
  avg_utilization_pct: number | null
  status: string
  created_at: string
}

interface RunOrder {
  id: string
  product_name: string
  savings_usd: number | null
  utilization_pct: number | null
  fit_status: string | null
  recommended_box_id: string | null
  used_box_length_cm: number | null
  used_box_width_cm: number | null
  used_box_height_cm: number | null
  product_length_cm: number | null
  product_width_cm: number | null
  product_height_cm: number | null
  created_at: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function HistoryPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [runs, setRuns] = useState<OptimizationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [runOrders, setRunOrders] = useState<Record<string, RunOrder[]>>({})
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('optimization_runs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      if (error) console.error("History fetch error:", error)
      setRuns((data as OptimizationRun[]) ?? [])
    } catch (err) {
      console.error("History fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  const fetchRunOrders = async (runId: string) => {
    if (runOrders[runId]) return // Already loaded
    setLoadingOrders(runId)
    try {
      const { data, error } = await supabase
        .from('optimized_orders')
        .select('id, product_name, savings_usd, utilization_pct, fit_status, recommended_box_id, used_box_length_cm, used_box_width_cm, used_box_height_cm, product_length_cm, product_width_cm, product_height_cm, created_at')
        .eq('run_id', runId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
      
      if (error) console.error("Run orders fetch error:", error)
      setRunOrders(prev => ({ ...prev, [runId]: (data as RunOrder[]) ?? [] }))
    } catch (err) {
      console.error("Run orders fetch exception:", err)
    } finally {
      setLoadingOrders(null)
    }
  }

  const toggleRun = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null)
    } else {
      setExpandedRunId(runId)
      await fetchRunOrders(runId)
    }
  }

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="glass-card h-20 skeleton" />)}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>Please complete your company setup.</p>
      <a href="/dashboard/settings"
        className="inline-block mt-4 px-6 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-80"
        style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
        Go to Settings
      </a>
    </div>
  )

  const totalSavings = runs.reduce((s, r) => s + (r.total_savings_usd ?? 0), 0)
  const totalProducts = runs.reduce((s, r) => s + (r.total_products ?? 0), 0)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-5">

      {/* Summary */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Runs', value: runs.length.toString(), icon: Package, color: 'var(--accent-primary)' },
          { label: 'Total Products', value: totalProducts.toLocaleString(), icon: TrendingUp, color: 'var(--accent-secondary)' },
          { label: 'Total Savings', value: `$${totalSavings.toFixed(2)}`, icon: DollarSign, color: 'var(--accent-success)' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 0%, ${s.color}22, transparent 70%)` }} />
            <s.icon size={18} color={s.color} className="mx-auto mb-2 relative" />
            <div className="font-syne font-bold text-xl text-white relative">{s.value}</div>
            <div className="text-xs mt-1 relative" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Runs List */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <h3 className="font-syne font-semibold text-white">Optimization History</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {runs.length} optimization run{runs.length !== 1 ? 's' : ''} — click to expand details
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📜</div>
            <p className="font-semibold text-white mb-1">No optimization history yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Run your first optimization to see history here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Run', 'Products', 'Savings', 'Avg Utilization', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isExpanded = expandedRunId === run.id
                  const orders = runOrders[run.id] ?? []
                  const isLoadingThis = loadingOrders === run.id

                  return (
                    <>
                      <tr key={run.id}
                        onClick={() => toggleRun(run.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isExpanded ? 'rgba(37,99,235,0.04)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}>
                        <td className="py-3 px-4">
                          <div className="font-medium max-w-[200px] truncate" style={{ color: 'var(--text-primary)' }}>
                            {run.run_name ?? `Run ${run.id.slice(0, 8)}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {(run.total_products ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-xs"
                          style={{ color: (run.total_savings_usd ?? 0) > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                          ${(run.total_savings_usd ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {Math.round(run.avg_utilization_pct ?? 0)}%
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${run.status === 'complete' ? 'badge-delivered' : run.status === 'failed' ? 'badge-pending' : 'badge-optimized'}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(run.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                        </td>
                      </tr>

                      <AnimatePresence>
                        {isExpanded && (
                          <tr key={`exp-${run.id}`}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden', background: 'rgba(37,99,235,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div className="px-6 py-4">
                                  {isLoadingThis ? (
                                    <div className="text-center py-6">
                                      <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2"
                                        style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
                                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading orders...</span>
                                    </div>
                                  ) : orders.length === 0 ? (
                                    <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                                      <p className="text-xs">No orders found for this run.</p>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                                        {orders.length} orders in this run
                                      </p>
                                      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                                              {['Product', 'Original Box', 'Savings', 'Utilization', 'Fit Status'].map(h => (
                                                <th key={h} className="text-left py-2 px-3" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {orders.map(order => (
                                              <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                                                  {order.product_name}
                                                </td>
                                                <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                                                  {order.used_box_length_cm}×{order.used_box_width_cm}×{order.used_box_height_cm}cm
                                                </td>
                                                <td className="py-2 px-3 font-semibold"
                                                  style={{ color: (order.savings_usd ?? 0) > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                                                  {(order.savings_usd ?? 0) > 0 ? `+$${(order.savings_usd ?? 0).toFixed(2)}` : '—'}
                                                </td>
                                                <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                                                  {Math.round(order.utilization_pct ?? 0)}%
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className={`status-badge ${(order.fit_status ?? '') === 'optimized' ? 'badge-delivered' : (order.fit_status ?? '') === 'same_box' ? 'badge-optimized' : 'badge-pending'}`}>
                                                    {(order.fit_status ?? 'pending').replace('_', ' ')}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
