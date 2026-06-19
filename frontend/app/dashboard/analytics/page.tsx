'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, Legend, ComposedChart,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import type { OptimizedOrderRow } from '@/lib/types'

const COLORS = ['#2563EB','#06B6D4','#10B981','#F59E0B','#8B5CF6','#EC4899']
const RANGES = ['7D','30D','90D','All'] as const
type Range = typeof RANGES[number]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const Tip = ({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
  formatter?: (v: number) => string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs"
      style={{ background: 'rgba(10,13,18,0.95)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <p className="mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color || 'var(--accent-primary)' }}>
            {formatter ? formatter(p.value) : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [orders, setOrders] = useState<OptimizedOrderRow[]>([])
  const [range, setRange] = useState<Range>('30D')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data: ords, error: ordErr } = await supabase
        .from('optimized_orders')
        .select('savings_usd,utilization_pct,sustainability_score,created_at,fit_status,recommended_box_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(5000)
      if (ordErr) console.error("Orders fetch error:", ordErr)
      setOrders((ords as OptimizedOrderRow[]) ?? [])
    } catch (err) {
      console.error("Analytics fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') fetchData() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchData])

  function cut(days: number): Date { const d = new Date(); d.setDate(d.getDate() - days); return d }
  function filterOrders(items: OptimizedOrderRow[]) {
    if (range === 'All') return items
    const d = cut(range === '7D' ? 7 : range === '30D' ? 30 : 90)
    return items.filter(o => new Date(o.created_at) >= d)
  }

  const fOrders = filterOrders(orders)

  const totalSavings = fOrders.reduce((s, o) => s + (o.savings_usd ?? 0), 0)
  const avgUtil = fOrders.length
    ? fOrders.reduce((s, o) => s + (o.utilization_pct ?? 0), 0) / fOrders.length
    : 0
  const avgSustain = fOrders.length
    ? fOrders.reduce((s, o) => s + (o.sustainability_score ?? 0), 0) / fOrders.length
    : 0

  const savingsLine = useMemo(() => {
    if (fOrders.length === 0) return []
    const byDate: Record<string, { savings: number; shipments: number }> = {}
    fOrders.forEach(o => {
      const dateKey = o.created_at?.slice(0, 10)
      if (!dateKey) return
      if (!byDate[dateKey]) byDate[dateKey] = { savings: 0, shipments: 0 }
      byDate[dateKey].savings += (o.savings_usd ?? 0)
      byDate[dateKey].shipments += 1
    })
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, v]) => ({
        date: date.slice(5),
        savings: Math.round(v.savings),
        shipments: v.shipments,
      }))
  }, [fOrders])

  const utilArea = useMemo(() =>
    fOrders.slice(-60).map((o, i) => ({
      i,
      util: Math.round(o.utilization_pct ?? 0),
    })), [fOrders])

  const fitBreakdown = useMemo(() => [
    { name: 'Optimized', value: fOrders.filter(o => o.fit_status === 'optimized').length, color: '#10B981' },
    { name: 'Same Box',  value: fOrders.filter(o => o.fit_status === 'same_box').length,  color: '#F59E0B' },
    { name: 'No Fit',    value: fOrders.filter(o => o.fit_status === 'no_fit').length,    color: '#EF4444' },
  ].filter(d => d.value > 0), [fOrders])

  const rateBar = useMemo(() => {
    if (fOrders.length === 0) return []
    const byDate: Record<string, { total: number; optimized: number }> = {}
    fOrders.forEach(o => {
      const dateKey = o.created_at?.slice(0, 10)
      if (!dateKey) return
      if (!byDate[dateKey]) byDate[dateKey] = { total: 0, optimized: 0 }
      byDate[dateKey].total += 1
      if (o.fit_status === 'optimized') byDate[dateKey].optimized += 1
    })
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, v]) => ({
        date: date.slice(5),
        rate: v.total > 0 ? Math.round((v.optimized / v.total) * 100) : 0,
        total: v.total,
      }))
  }, [fOrders])

  const savingsVsUtil = useMemo(() => {
    if (fOrders.length === 0) return []
    const byDate: Record<string, { savings: number; util: number; count: number }> = {}
    fOrders.forEach(o => {
      const dateKey = o.created_at?.slice(0, 10)
      if (!dateKey) return
      if (!byDate[dateKey]) byDate[dateKey] = { savings: 0, util: 0, count: 0 }
      byDate[dateKey].savings += (o.savings_usd ?? 0)
      byDate[dateKey].util += (o.utilization_pct ?? 0)
      byDate[dateKey].count += 1
    })
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, v]) => ({
        date: date.slice(5),
        savings: Math.round(v.savings),
        utilization: v.count > 0 ? Math.round(v.util / v.count) : 0,
      }))
  }, [fOrders])

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="glass-card h-56 skeleton" />)}
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-5">

      <motion.div variants={item} className="flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Range:</span>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: range === r ? 'var(--accent-primary)' : 'transparent',
                color: range === r ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
              }}>
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Savings', value: `$${totalSavings.toFixed(0)}`, color: 'var(--accent-success)' },
          { label: 'Avg Utilization', value: `${avgUtil.toFixed(1)}%`, color: 'var(--accent-primary)' },
          { label: 'Avg Eco Score', value: `${avgSustain.toFixed(0)}/100`, color: 'var(--accent-secondary)' },
        ].map(k => (
          <div key={k.label} className="glass-card p-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 0%, ${k.color}22, transparent 70%)` }} />
            <div className="font-syne font-bold text-3xl mb-1 relative" style={{ color: k.color }}>{k.value}</div>
            <div className="text-sm relative" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Savings vs Shipment Volume */}
      <motion.div variants={item} className="glass-card p-6">
        <h3 className="font-syne font-semibold text-white mb-5">Savings vs Shipment Volume</h3>
        {savingsLine.length === 0 ? (
          <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <p className="text-2xl mb-2">📊</p>
              <p>No analytics data yet — run optimizations to populate.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={savingsLine}>
              <defs>
                <linearGradient id="asg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis yAxisId="l" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<Tip formatter={(v) => `$${v.toLocaleString()}`} />} />
              <Area yAxisId="l" type="monotone" dataKey="savings" name="Savings ($)"
                stroke="#2563EB" fill="url(#asg)" strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }} isAnimationActive />
              <Bar yAxisId="r" dataKey="shipments" name="Shipments" fill="#06B6D4" radius={[3,3,0,0]} barSize={16} opacity={0.7} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Utilization Trend + Fit Status */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Box Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={utilArea}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="i" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<Tip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="util" name="Utilization (%)"
                stroke="#10B981" fill="url(#ug)" strokeWidth={2.5}
                dot={{ r: 2, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Fit Status Distribution</h3>
          {fitBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={fitBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" isAnimationActive paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {fitBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Optimization Rate + Savings vs Utilization */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Daily Optimization Rate (%)</h3>
          {rateBar.length === 0 ? (
            <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <p className="text-2xl mb-2">📈</p>
                <p>No optimization rate data yet.</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rateBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip content={<Tip formatter={(v) => `${v}%`} />} />
                <Bar dataKey="rate" name="Rate (%)" radius={[4,4,0,0]} barSize={20} isAnimationActive>
                  {rateBar.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 80 ? '#10B981' : entry.rate >= 50 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Savings vs Avg Utilization</h3>
          {savingsVsUtil.length === 0 ? (
            <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={savingsVsUtil}>
                <defs>
                  <linearGradient id="svg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip content={<Tip />} />
                <Area yAxisId="l" type="monotone" dataKey="savings" name="Savings ($)"
                  stroke="#8B5CF6" fill="url(#svg2)" strokeWidth={2}
                  dot={{ r: 2, fill: '#8B5CF6', strokeWidth: 0 }} isAnimationActive />
                <Line yAxisId="r" type="monotone" dataKey="utilization" name="Utilization (%)"
                  stroke="#F59E0B" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }} isAnimationActive />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
