'use client'
import { motion } from 'framer-motion'
import { SectionLabel, ScrollFadeIn, AnimatedCounter } from './utils'

const KPIS = [
  { value: 528, prefix: '₹', suffix: 'L', label: 'Total Saved', color: '#10B981', change: '+8.2%' },
  { value: 12847, suffix: '', label: 'Optimizations', color: '#2563EB', change: '+14.1%' },
  { value: 83, suffix: '%', label: 'Avg Utilization', color: '#06B6D4', change: '+3.4%' },
  { value: 76, suffix: '/100', label: 'Eco Score', color: '#8B5CF6', change: '+5pts' },
  { value: 1060, suffix: 'kg', label: 'CO₂ Reduced', color: '#10B981', change: '↓' },
]

const ZONES = [
  { zone: 'Zone 1', pct: 42 },
  { zone: 'Zone 2', pct: 58 },
  { zone: 'Zone 3', pct: 71 },
  { zone: 'Zone 4', pct: 65 },
  { zone: 'Zone 5', pct: 49 },
]

const insights = [
  { icon: '💡', title: 'Cost', text: 'Your avg savings of ₹341/shipment beats the industry average of ₹218. At 5,000 shipments/mo that\'s ₹61.5L saved.', color: '#2563EB' },
  { icon: '📈', title: 'Efficiency', text: '87.3% optimization rate (>70% utilization). Industry benchmark: 62%. You\'re outperforming by 25.3 points.', color: '#06B6D4' },
  { icon: '🌱', title: 'Sustainability', text: 'Score of 76/100. Switching remaining poly-mailer orders to kraft adds an estimated +12 points.', color: '#10B981' },
]

function AreaChart() {
  const points = [
    { x: 0, y: 85 }, { x: 60, y: 70 }, { x: 120, y: 55 },
    { x: 180, y: 45 }, { x: 240, y: 30 }, { x: 300, y: 15 },
  ]
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L300,100 L0,100 Z`

  return (
    <div className="w-full" style={{ height: 220 }}>
      <svg viewBox="0 0 320 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="310" y2={y} stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
        ))}
        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#areaGrad)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.8 }}
        />
        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {/* Data points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x} cy={p.y} r="3"
            fill="var(--blue)"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.0 + i * 0.1 }}
          />
        ))}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  )
}

function DonutChart() {
  const segments = [
    { pct: 68, color: '#10B981', label: 'Valid' },
    { pct: 18, color: '#F59E0B', label: 'Tight' },
    { pct: 10, color: '#94A3B8', label: 'Already Optimal' },
    { pct: 4, color: '#EF4444', label: 'No Fit' },
  ]

  let cumulative = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
            const offset = cumulative
            cumulative += seg.pct
            const dashLength = (seg.pct / 100) * circumference
            const dashGap = circumference - dashLength
            return (
              <motion.circle
                key={i}
                cx="50" cy="50" r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={-offset * circumference / 100}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.2, duration: 0.7 }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>83%</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>avg</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPreview() {
  return (
    <section className="py-24 px-6" style={{ background: 'var(--void)' }}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="INTELLIGENCE" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Real-Time Logistics Intelligence
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base max-w-[700px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Every CSV upload feeds live data into your analytics.
              See exactly where money is saved, which products underperform, and how to improve.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Dashboard Mockup */}
        <ScrollFadeIn delay={0.3}>
          <div className="glass-card p-6">
            {/* Browser Bar */}
            <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />
              </div>
              <div className="flex-1 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                shipzi.app/dashboard/analytics
              </div>
              <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--elevated)', color: 'var(--text-muted)' }}>
                Last 30 Days ▼
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {KPIS.map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.85, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
                >
                  <div className="font-syne font-bold text-xl" style={{ color: kpi.color }}>
                    <AnimatedCounter value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} duration={2000} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'var(--green)' }}>{kpi.change}</div>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-6 mb-6">
              {/* Area Chart */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Savings Over Time</div>
                <AreaChart />
              </div>

              {/* Donut */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Fit Status Distribution</div>
                <DonutChart />
              </div>
            </div>

            {/* Zone Bars */}
            <div className="p-4 rounded-lg mb-6" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Dimensional Weight Savings by Zone</div>
              <div className="space-y-3">
                {ZONES.map((z, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-16" style={{ color: 'var(--text-secondary)' }}>{z.zone}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: ['#2563EB', '#3B82F6', '#06B6D4', '#0891B2', '#0E7490'][i] }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${z.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>{z.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((ins, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="p-4 rounded-lg text-sm leading-relaxed"
                  style={{ background: 'var(--void)', borderLeft: `2px solid ${ins.color}`, color: 'var(--text-secondary)' }}
                >
                  <span className="mr-1">{ins.icon}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{ins.title}</strong> — {ins.text}
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  )
}