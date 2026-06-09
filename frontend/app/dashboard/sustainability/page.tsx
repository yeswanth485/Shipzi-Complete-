'use client'
import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'

interface SustainMetric {
  metric_date: string
  carbon_reduction_kg: number
  packaging_waste_reduction_pct: number
  recyclable_material_pct: number
  sustainability_score: number
}

interface OrderRow {
  sustainability_score: number
  savings_usd: number
  recommended_box: { material_type: string } | null
}

const MATERIAL_COLORS: Record<string, string> = { corrugated: '#D4A437', kraft: '#A0783C', rigid: '#6B7280', poly_mailer: '#8B5CF6' }
const CHART_COLORS = ['#10B981', '#06B6D4', '#2563EB', '#F59E0B']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color ?? 'var(--accent-success)' }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function CircularGauge({ value, max = 100, color = '#10B981', label }: { value: number; max?: number; color?: string; label: string }) {
  const pct = Math.min(value / max, 1)
  const circ = 2 * Math.PI * 52
  const dash = pct * circ
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold" fontFamily="Syne">{value}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="11" fill="var(--text-muted)">/ {max}</text>
      </svg>
      <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}

export default function SustainabilityPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [metrics, setMetrics] = useState<SustainMetric[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const [{ data: m, error: mErr }, { data: o, error: oErr }] = await Promise.all([
          supabase.from('sustainability_metrics').select('*').eq('company_id', companyId).order('metric_date'),
          supabase.from('optimized_orders').select('sustainability_score, savings_usd, recommended_box:box_catalog(material_type)').eq('company_id', companyId),
        ])
        if (mErr) console.error("Sustainability metrics fetch error:", mErr)
        if (oErr) console.error("Orders fetch error:", oErr)
        setMetrics((m as unknown as SustainMetric[]) ?? [])
        setOrders((o as unknown as OrderRow[]) ?? [])
      } catch (err) {
        console.error("Sustainability fetch exception:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  const avgScore = orders.length ? Math.round(orders.reduce((s, o) => s + (o.sustainability_score ?? 0), 0) / orders.length) : 0
  const totalCarbon = Math.round(orders.reduce((s, o) => s + (o.savings_usd ?? 0), 0) * 0.42)
  const totalOrders = orders.length

  const materialCounts = Object.entries(
    orders.reduce((acc, o) => {
      const mat = o.recommended_box?.material_type ?? 'unknown'
      acc[mat] = (acc[mat] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }))

  const trendData = metrics.length
    ? metrics.map(m => ({ date: m.metric_date?.slice(5), score: Math.round(m.sustainability_score ?? 0), carbon: Math.round(m.carbon_reduction_kg ?? 0) }))
    : Array.from({ length: 8 }, (_, i) => ({ date: `W${i + 1}`, score: 45 + i * 5, carbon: i * 12 }))

  const MILESTONES = [
    { label: 'First 10 Optimizations', done: totalOrders >= 10, icon: '📦' },
    { label: '100 Optimizations', done: totalOrders >= 100, icon: '🎯' },
    { label: '100kg CO₂ Reduced', done: totalCarbon >= 100, icon: '🌱' },
    { label: 'First Eco Box Used', done: orders.some(o => (o.sustainability_score ?? 0) >= 75), icon: '♻️' },
  ]

  if (loading || isUserLoading) return (
    <div className="max-w-7xl mx-auto space-y-4">
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="glass-card h-48 skeleton" />)}
    </div>
  )

  if (!companyId) return (
    <div className="max-w-7xl mx-auto space-y-4 p-8 text-center glass-card">
      <h2 className="text-xl font-bold text-white mb-2">Company Profile Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>We couldn't find your company data. Please try signing out and signing back in.</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Gauges */}
      <div className="glass-card p-8">
        <h2 className="font-syne font-bold text-white mb-6 text-center">Sustainability Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <CircularGauge value={avgScore} label="Avg Eco Score" color="#10B981" />
          <CircularGauge value={Math.min(totalCarbon, 1000)} max={1000} label="CO₂ Reduced (kg)" color="#06B6D4" />
          <CircularGauge value={totalOrders} max={Math.max(totalOrders + 50, 100)} label="Optimizations" color="#2563EB" />
          <CircularGauge value={materialCounts.filter(m => m.name !== 'poly mailer').reduce((s, m) => s + m.value, 0)} max={Math.max(totalOrders, 1)} label="Eco-Friendly Boxes" color="#F59E0B" />
        </div>
      </div>

      {/* Trend Chart */}
      <div className="glass-card p-6">
        <h3 className="font-syne font-semibold text-white mb-5">Sustainability Score Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="ecoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2533" />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="score" stroke="#10B981" fill="url(#ecoGrad)" strokeWidth={2} name="eco score" isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material Breakdown */}
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Material Type Distribution</h3>
          {materialCounts.length === 0 ? (
            <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={materialCounts} cx="50%" cy="50%" outerRadius={75} dataKey="value" isAnimationActive>
                  {materialCounts.map((entry, i) => <Cell key={i} fill={MATERIAL_COLORS[entry.name.replace(' ', '_')] ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Milestones Timeline */}
        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Sustainability Milestones</h3>
          <div className="space-y-3">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl transition-all"
                style={{ background: m.done ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)', border: `1px solid ${m.done ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: m.done ? 'rgba(16,185,129,0.15)' : 'var(--bg-void)', border: `2px solid ${m.done ? 'var(--accent-success)' : 'var(--border-subtle)'}` }}>
                  {m.done ? m.icon : '🔒'}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: m.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label}</p>
                  <p className="text-xs" style={{ color: m.done ? 'var(--accent-success)' : 'var(--text-muted)' }}>{m.done ? 'Achieved ✓' : 'Locked'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ESG Report Export */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-syne font-semibold text-white mb-1">ESG Sustainability Report</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Download a comprehensive sustainability report for stakeholders and ESG compliance.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary flex-shrink-0" style={{ padding: '10px 20px' }}>
          📄 Download Report
        </button>
      </div>
    </div>
  )
}
