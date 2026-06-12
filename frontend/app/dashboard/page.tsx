'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useInView } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { Package, TrendingUp, DollarSign, Leaf, Wind, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import type { AnalyticsSnapshotRow, ShipmentRow } from '@/lib/supabase'
import type { OptimizedOrderRow, CatalogBox } from '@/lib/types'

const COLORS = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6']

// ── Animated counter ──────────────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '' }: {
  value: number; prefix?: string; suffix?: string
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 1600
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * value))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, prefix, suffix, trend, color }: {
  icon: React.ComponentType<{ size?: number | string; color?: string }>
  label: string; value: number
  prefix?: string; suffix?: string
  trend?: string; color: string
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          <Icon size={18} color={color} />
        </div>
        {trend && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)' }}>
            ↑ {trend}
          </span>
        )}
      </div>
      <div className="font-syne font-bold text-2xl text-white mb-1">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold mt-1" style={{ color: 'var(--accent-primary)' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [orders,    setOrders]    = useState<OptimizedOrderRow[]>([])
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshotRow[]>([])
  const [boxCatalog, setBoxCatalog] = useState<CatalogBox[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const [{ data: ord, error: ordErr }, { data: ship, error: shipErr }, { data: snap, error: snapErr }, { data: boxes, error: boxErr }] = await Promise.all([
          supabase.from('optimized_orders')
            .select('savings_usd,utilization_pct,sustainability_score,created_at,product_name,fit_status,recommended_box_id')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('shipments')
            .select('status,created_at')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('analytics_snapshots')
            .select('*')
            .eq('company_id', companyId)
            .order('snapshot_date', { ascending: true })
            .limit(30),
          supabase.from('box_catalog')
            .select('id, box_name')
            .eq('company_id', companyId),
        ])
        
        if (ordErr) console.error("Orders fetch error:", ordErr)
        if (shipErr) console.error("Shipments fetch error:", shipErr)
        if (snapErr) console.error("Snapshots fetch error:", snapErr)
        if (boxErr) console.error("Box catalog fetch error:", boxErr)

        setOrders((ord as OptimizedOrderRow[]) ?? [])
        setShipments((ship as ShipmentRow[]) ?? [])
        setSnapshots((snap as AnalyticsSnapshotRow[]) ?? [])
        setBoxCatalog((boxes as CatalogBox[]) ?? [])
      } catch (err) {
        console.error("Dashboard fetch exception:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  // KPIs
  const totalSavings   = orders.reduce((s, o) => s + (o.savings_usd ?? 0), 0)
  const optimizedCount = orders.filter(o => o.fit_status === 'optimized').length
  const avgUtil = orders.length
    ? Math.round(orders.reduce((s, o) => s + (o.utilization_pct ?? 0), 0) / orders.length)
    : 0
  const avgSustain = orders.length
    ? Math.round(orders.reduce((s, o) => s + (o.sustainability_score ?? 0), 0) / orders.length)
    : 0
  const carbonKg = Math.round(totalSavings * 0.42)

  // Build a lookup map: box_id → box_name (useMemo ensures it updates on same render)
  const boxNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    boxCatalog.forEach(b => { map[b.id] = b.box_name })
    return map
  }, [boxCatalog])

  // Chart data
  const savingsData = (snapshots || []).map(s => ({
    date: s.snapshot_date?.slice(5) ?? '',
    savings: Math.round(s.total_savings_usd ?? 0),
    shipments: s.total_shipments ?? 0,
  }))

  // Shipments last 7 days — combine shipments table + orders as fallback
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    // Count from shipments table (populated by backend)
    const shipCount = shipments.filter(s => s.created_at?.slice(0, 10) === key).length
    // Fallback: also count orders created on this date
    const orderCount = orders.filter(o => o.created_at?.slice(0, 10) === key).length
    return { label, count: Math.max(shipCount, orderCount) }
  })

  // Box Usage Mix — resolve box names from recommended_box_id via catalog lookup
  const boxUsage = (() => {
    const counts: Record<string, number> = {}
    orders.forEach(o => {
      // Try the joined box catalog first, then the local lookup map, then fallback names
      const boxId = o.recommended_box_id
      const name = boxId ? (boxNameMap[boxId] ?? 'Unknown Box') : 'Unknown Box'
      if (name && name !== 'No fit found' && name !== 'Same Box' && name !== 'Unknown Box') {
        counts[name] = (counts[name] ?? 0) + 1
      }
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (sorted.length === 0) {
      // Fallback: show fit_status distribution instead
      const statusCounts: Record<string, number> = {}
      orders.forEach(o => {
        const status = (o.fit_status ?? 'pending').replace('_', ' ')
        statusCounts[status] = (statusCounts[status] ?? 0) + 1
      })
      const sortedStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (sortedStatus.length === 0) return [{ name: 'No data yet', value: 1 }]
      return sortedStatus.map(([name, value]) => ({ name, value }))
    }
    return sorted.map(([name, value]) => ({ name, value }))
  })()

  const recent5 = orders.slice(0, 5)

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="glass-card h-24 skeleton" />
      ))}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>We couldn't find your company data. Please try signing out and signing back in.</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Empty-state nudge */}
      {orders.length === 0 && (
        <div className="p-5 rounded-xl flex items-center gap-4"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <span className="text-3xl">📦</span>
          <div>
            <p className="font-semibold text-white text-sm">
              The average business wastes 23% of shipping spend on oversized packaging.
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Upload your first CSV to see how much you could save.
            </p>
          </div>
          <Link href="/dashboard/optimize" className="btn-primary ml-auto flex-shrink-0"
            style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>
            Start Optimizing →
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Package}   label="Total Orders"       value={orders.length}       color="#2563EB" trend="vs last month" />
        <StatCard icon={TrendingUp} label="Optimized Rows"    value={optimizedCount}      color="#06B6D4" />
        <StatCard icon={DollarSign} label="Total Savings"     value={Math.round(totalSavings)} prefix="$" color="#10B981" trend="15%" />
        <StatCard icon={Leaf}       label="Sustainability Avg" value={avgSustain}  suffix="/100" color="#10B981" />
        <StatCard icon={Wind}       label="CO₂ Reduced (kg)"  value={carbonKg}            color="#06B6D4" />
        <StatCard icon={Target}     label="Avg Box Utilization" value={avgUtil}   suffix="%" color="#F59E0B" />
      </div>

      {/* Row 1 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="glass-card p-6 lg:col-span-3">
          <h3 className="font-syne font-semibold text-white mb-5">Savings Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={savingsData.length ? savingsData : [{ date: 'Now', savings: 0, shipments: 0 }]}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="date"    tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis                   tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="savings" name="savings ($)"
                stroke="#2563EB" fill="url(#sg)" strokeWidth={2} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-syne font-semibold text-white mb-5">Box Usage Mix</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={boxUsage} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                dataKey="value" isAnimationActive>
                {boxUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{v}</span>} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Shipments — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis                 tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="shipments" fill="#2563EB" radius={[4,4,0,0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Optimization Rate</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={snapshots.slice(-14).map(s => ({
              date: s.snapshot_date?.slice(5) ?? '',
              rate: Math.round(s.optimization_rate_pct ?? 0),
            }))}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" name="rate (%)"
                stroke="#10B981" fill="url(#rg)" strokeWidth={2} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent optimizations table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-syne font-semibold text-white">Recent Optimizations</h3>
          <Link href="/dashboard/orders" className="text-xs" style={{ color: 'var(--accent-secondary)' }}>
            View All →
          </Link>
        </div>

        {recent5.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">📋</p>
            <p style={{ color: 'var(--text-muted)' }}>
              No optimizations yet.{' '}
              <Link href="/dashboard/optimize" style={{ color: 'var(--accent-primary)' }}>
                Run your first one →
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Product','Savings','Utilization','Fit Status','Date'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-xs uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent5.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="py-3 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {o.product_name}
                    </td>
                    <td className="py-3 pr-4 font-semibold" style={{ color: 'var(--accent-success)' }}>
                      {(o.savings_usd ?? 0) > 0 ? `+$${(o.savings_usd ?? 0).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${o.utilization_pct ?? 0}%`, background: 'var(--accent-primary)' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {Math.round(o.utilization_pct ?? 0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`status-badge ${o.fit_status === 'optimized' ? 'badge-delivered' : o.fit_status === 'same_box' ? 'badge-optimized' : 'badge-pending'}`}>
                        {(o.fit_status ?? 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
