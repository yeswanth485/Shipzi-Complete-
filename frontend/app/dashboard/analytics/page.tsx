'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import type { AnalyticsSnapshotRow } from '@/lib/supabase'
import type { OptimizedOrderRow } from '@/lib/types'

const COLORS = ['#2563EB','#06B6D4','#10B981','#F59E0B','#8B5CF6']
const RANGES = ['7D','30D','90D','All'] as const
type Range = typeof RANGES[number]

interface OrderForAnalytics extends Pick<OptimizedOrderRow,
  'savings_usd'|'utilization_pct'|'sustainability_score'|'created_at'|'fit_status'> {
  recommended_box_material: string | null
}

const Tip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'var(--accent-primary)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshotRow[]>([])
  const [orders,    setOrders]    = useState<OrderForAnalytics[]>([])
  const [range,     setRange]     = useState<Range>('30D')
  const [loading,   setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [{ data: snaps, error: snapErr }, { data: ords, error: ordErr }] = await Promise.all([
        supabase.from('analytics_snapshots')
          .select('*').eq('company_id', companyId)
          .order('snapshot_date', { ascending: true }),
        supabase.from('optimized_orders')
          .select('savings_usd,utilization_pct,sustainability_score,created_at,fit_status,recommended_box_id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true })
          .limit(2000),
      ])
      
      if (snapErr) console.error("Analytics fetch error:", snapErr)
      if (ordErr) console.error("Orders fetch error:", ordErr)

      setSnapshots((snaps as AnalyticsSnapshotRow[]) ?? [])
      setOrders(((ords as OptimizedOrderRow[]) ?? []).map(o => ({
        savings_usd:                o.savings_usd,
        utilization_pct:            o.utilization_pct,
        sustainability_score:       o.sustainability_score,
        created_at:                 o.created_at,
        fit_status:                 o.fit_status,
        recommended_box_material:   null,
      })))
    } catch (err) {
      console.error("Analytics fetch exception:", err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchData() }, [fetchData])

  function cut(days: number): Date { const d = new Date(); d.setDate(d.getDate() - days); return d }
  function filterSnaps(items: AnalyticsSnapshotRow[]) {
    if (range === 'All') return items
    const d = cut(range === '7D' ? 7 : range === '30D' ? 30 : 90)
    return items.filter(s => new Date(s.snapshot_date) >= d)
  }
  function filterOrders(items: OrderForAnalytics[]) {
    if (range === 'All') return items
    const d = cut(range === '7D' ? 7 : range === '30D' ? 30 : 90)
    return items.filter(o => new Date(o.created_at) >= d)
  }

  const fSnaps  = filterSnaps(snapshots)
  const fOrders = filterOrders(orders)

  const totalSavings = fOrders.reduce((s, o) => s + (o.savings_usd ?? 0), 0)
  const avgUtil      = fOrders.length
    ? fOrders.reduce((s, o) => s + (o.utilization_pct ?? 0), 0) / fOrders.length
    : 0
  const avgSustain   = fOrders.length
    ? fOrders.reduce((s, o) => s + (o.sustainability_score ?? 0), 0) / fOrders.length
    : 0

  const savingsLine = fSnaps.map(s => ({
    date:      s.snapshot_date?.slice(5) ?? '',
    savings:   Math.round(s.total_savings_usd ?? 0),
    shipments: s.total_shipments ?? 0,
  }))

  const utilArea = fOrders.slice(-60).map((o, i) => ({
    i,
    util: Math.round(o.utilization_pct ?? 0),
  }))

  const fitBreakdown = [
    { name: 'Optimized', value: fOrders.filter(o => o.fit_status === 'optimized').length },
    { name: 'Same Box',  value: fOrders.filter(o => o.fit_status === 'same_box').length  },
    { name: 'No Fit',    value: fOrders.filter(o => o.fit_status === 'no_fit').length    },
  ].filter(d => d.value > 0)

  const rateBar = fSnaps.slice(-14).map(s => ({
    date: s.snapshot_date?.slice(5) ?? '',
    rate: Math.round(s.optimization_rate_pct ?? 0),
  }))

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="glass-card h-56 skeleton" />)}
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

      {/* Range picker */}
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Range:</span>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: range === r ? 'var(--accent-primary)' : 'transparent',
                color:      range === r ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Savings',  value: `$${totalSavings.toFixed(0)}`,      color: 'var(--accent-success)' },
          { label: 'Avg Utilization', value: `${avgUtil.toFixed(1)}%`,          color: 'var(--accent-primary)' },
          { label: 'Avg Eco Score',  value: `${avgSustain.toFixed(0)}/100`,     color: 'var(--accent-secondary)' },
        ].map(k => (
          <div key={k.label} className="glass-card p-5 text-center">
            <div className="font-syne font-bold text-3xl mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Savings trend */}
      <div className="glass-card p-6">
        <h3 className="font-syne font-semibold text-white mb-5">Savings vs Shipment Volume</h3>
        {savingsLine.length === 0 ? (
          <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            No analytics data yet — run optimizations to populate.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={savingsLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
              <XAxis dataKey="date"     tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis yAxisId="l"        tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<Tip />} />
              <Line yAxisId="l" type="monotone" dataKey="savings"   stroke="#2563EB" strokeWidth={2} dot={false} name="savings ($)" isAnimationActive />
              <Line yAxisId="r" type="monotone" dataKey="shipments" stroke="#06B6D4" strokeWidth={2} dot={false} name="shipments"   isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Utilization + Fit breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Box Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
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
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="util" name="utilization (%)"
                stroke="#10B981" fill="url(#ug)" strokeWidth={2} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Fit Status Distribution</h3>
          {fitBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={fitBreakdown} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                  dataKey="value" isAnimationActive>
                  {fitBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Optimization rate bar */}
      <div className="glass-card p-6">
        <h3 className="font-syne font-semibold text-white mb-5">Daily Optimization Rate (%)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rateBar}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
            <YAxis domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="rate" name="rate (%)" fill="#2563EB" radius={[4,4,0,0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
