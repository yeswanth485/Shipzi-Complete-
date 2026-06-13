'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import type { CatalogBox } from '@/lib/types'

interface OrderRow {
  sustainability_score: number
  savings_usd: number
  created_at: string
  recommended_box_id: string | null
}

const MATERIAL_COLORS: Record<string, string> = { corrugated: '#D4A437', kraft: '#A0783C', rigid: '#6B7280', poly_mailer: '#8B5CF6' }
const CHART_COLORS = ['#10B981', '#06B6D4', '#2563EB', '#F59E0B']

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs"
      style={{ background: 'rgba(10,13,18,0.95)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <p className="mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color ?? 'var(--accent-success)' }} className="font-semibold mt-1">{p.name}: {p.value}</p>)}
    </div>
  )
}

function CircularGauge({ value, max = 100, color = '#10B981', label, delay = 0 }: { value: number; max?: number; color?: string; label: string; delay?: number }) {
  const pct = Math.min(value / max, 1)
  const circ = 2 * Math.PI * 52
  const dash = pct * circ
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-subtle)" strokeWidth="8" opacity="0.3" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)', filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fill="white" fontWeight="bold" fontFamily="Syne">{value}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="11" fill="var(--text-muted)">/ {max}</text>
      </svg>
      <p className="text-xs mt-2 text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </motion.div>
  )
}

export default function SustainabilityPage() {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [boxCatalog, setBoxCatalog] = useState<CatalogBox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      try {
        const [{ data: o, error: oErr }, { data: boxes, error: boxErr }] = await Promise.all([
          supabase.from('optimized_orders')
            .select('sustainability_score, savings_usd, created_at, recommended_box_id')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true })
            .limit(5000),
          supabase.from('box_catalog')
            .select('id, material_type')
            .eq('company_id', companyId),
        ])
        if (oErr) console.error("Orders fetch error:", oErr)
        if (boxErr) console.error("Box catalog fetch error:", boxErr)
        setOrders((o as unknown as OrderRow[]) ?? [])
        setBoxCatalog((boxes as unknown as CatalogBox[]) ?? [])
      } catch (err) {
        console.error("Sustainability fetch exception:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  const boxMaterialMap = useMemo(() => {
    const map: Record<string, string> = {}
    boxCatalog.forEach(b => { map[b.id] = b.material_type })
    return map
  }, [boxCatalog])

  const validScores = orders.filter(o => o.sustainability_score != null)
  const avgScore = validScores.length ? Math.round(validScores.reduce((s, o) => s + (o.sustainability_score || 0), 0) / validScores.length) : 0
  const totalCarbon = Math.round(orders.reduce((s, o) => s + (o.savings_usd ?? 0), 0) * 0.42)
  const totalOrders = orders.length

  const materialCounts = useMemo(() => Object.entries(
    orders.reduce((acc, o) => {
      const mat = o.recommended_box_id ? (boxMaterialMap[o.recommended_box_id] ?? 'unknown') : 'unknown'
      acc[mat] = (acc[mat] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value })), [orders, boxMaterialMap])

  // Compute sustainability trend from orders grouped by date
  const trendData = useMemo(() => {
    if (orders.length === 0) return []
    const byDate: Record<string, { totalScore: number; totalCarbon: number; count: number }> = {}
    orders.forEach(o => {
      const dateKey = o.created_at?.slice(0, 10) ?? ''
      if (!dateKey) return
      if (!byDate[dateKey]) byDate[dateKey] = { totalScore: 0, totalCarbon: 0, count: 0 }
      byDate[dateKey].totalScore += (o.sustainability_score ?? 0)
      byDate[dateKey].totalCarbon += (o.savings_usd ?? 0) * 0.15
      byDate[dateKey].count += 1
    })
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date: date.slice(5),
        score: Math.round(v.totalScore / v.count),
        carbon: Math.round(v.totalCarbon),
      }))
  }, [orders])

  const ecoBoxes = useMemo(() =>
    materialCounts.filter(m => m.name !== 'poly mailer').reduce((s, m) => s + m.value, 0),
    [materialCounts])

  const MILESTONES = useMemo(() => [
    { label: 'First 10 Optimizations', done: totalOrders >= 10, icon: '📦' },
    { label: '100 Optimizations', done: totalOrders >= 100, icon: '🎯' },
    { label: '100kg CO₂ Reduced', done: totalCarbon >= 100, icon: '🌱' },
    { label: 'First Eco Box Used', done: orders.some(o => (o.sustainability_score ?? 0) >= 75), icon: '♻️' },
  ], [totalOrders, totalCarbon, orders])

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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-6">

      <motion.div variants={item} className="glass-card p-8">
        <h2 className="font-syne font-bold text-white mb-6 text-center">Sustainability Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <CircularGauge value={avgScore} label="Avg Eco Score" color="#10B981" delay={0} />
          <CircularGauge value={Math.min(totalCarbon, 1000)} max={1000} label="CO₂ Reduced (kg)" color="#06B6D4" delay={0.1} />
          <CircularGauge value={totalOrders} max={Math.max(totalOrders + 50, 100)} label="Optimizations" color="#2563EB" delay={0.2} />
          <CircularGauge value={ecoBoxes} max={Math.max(totalOrders, 1)} label="Eco-Friendly Boxes" color="#F59E0B" delay={0.3} />
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        <h3 className="font-syne font-semibold text-white mb-5">Sustainability Score Trend</h3>
        {trendData.length === 0 ? (
          <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <p className="text-2xl mb-2">🌱</p>
              <p>No sustainability data yet — run optimizations to generate data.</p>
            </div>
          </div>
        ) : (
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
        )}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="glass-card p-6">
          <h3 className="font-syne font-semibold text-white mb-5">Sustainability Milestones</h3>
          <div className="space-y-3">
            {MILESTONES.map((m, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl transition-all"
                style={{ background: m.done ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)', border: `1px solid ${m.done ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: m.done ? 'rgba(16,185,129,0.15)' : 'var(--bg-void)', border: `2px solid ${m.done ? 'var(--accent-success)' : 'var(--border-subtle)'}` }}>
                  {m.done ? m.icon : '🔒'}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: m.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label}</p>
                  <p className="text-xs" style={{ color: m.done ? 'var(--accent-success)' : 'var(--text-muted)' }}>{m.done ? 'Achieved ✓' : 'Locked'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-syne font-semibold text-white mb-1">ESG Sustainability Report</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Download a comprehensive sustainability report for stakeholders and ESG compliance.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary flex-shrink-0" style={{ padding: '10px 20px' }}>
          📄 Download Report
        </button>
      </motion.div>
    </motion.div>
  )
}
