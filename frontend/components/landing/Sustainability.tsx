'use client'
import { motion } from 'framer-motion'
import { SectionLabel, ScrollFadeIn, AnimatedCounter } from './utils'

const metrics = [
  { icon: '🌿', label: 'CO₂ Reduced', value: 1060, suffix: ' kg', color: '#10B981' },
  { icon: '♻', label: 'Waste Reduced', value: 42, suffix: '%', color: '#06B6D4' },
  { icon: '📦', label: 'Recyclable Pkging', value: 73, suffix: '%', color: '#2563EB' },
  { icon: '🌳', label: 'Trees Equivalent', value: 50, suffix: ' trees', color: '#10B981' },
]

const materials = [
  { label: 'Corrugated', pct: 58, color: '#10B981' },
  { label: 'Kraft', pct: 22, color: '#2563EB' },
  { label: 'Rigid', pct: 12, color: '#06B6D4' },
  { label: 'Poly Mailer', pct: 8, color: '#F59E0B' },
]

const milestones = [
  { title: 'First 100 Optimizations', sub: 'Achieved · Jun 7, 2026', done: true, progress: 100, color: '#10B981' },
  { title: '100kg CO₂ Reduced', sub: 'Achieved · Jun 11, 2026', done: true, progress: 100, color: '#2563EB' },
  { title: '500 Eco-Material Shipments', sub: '335/500 — in progress', done: false, progress: 67, color: '#06B6D4' },
]

function Gauge() {
  const score = 76
  const angle = (score / 100) * 180

  return (
    <div className="flex flex-col items-center">
      <svg width="260" height="160" viewBox="0 0 260 160">
        {/* Track Zones */}
        <path d="M 30 130 A 100 100 0 0 1 90 38" fill="none" stroke="#EF4444" strokeWidth="14" strokeLinecap="round" opacity="0.6" />
        <path d="M 90 38 A 100 100 0 0 1 170 38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
        <path d="M 170 38 A 100 100 0 0 1 230 130" fill="none" stroke="#10B981" strokeWidth="14" strokeLinecap="round" opacity="0.8" />

        {/* Needle */}
        <motion.line
          x1="130" y1="130"
          x2="130" y2="40"
          stroke="#F1F5F9"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          whileInView={{ rotate: -90 + angle }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{ transformOrigin: '130px 130px' }}
        />
        <circle cx="130" cy="130" r="4" fill="#F1F5F9" />

        {/* Labels */}
        <text x="25" y="148" fill="#475569" fontSize="11" fontFamily="JetBrains Mono">0</text>
        <text x="122" y="18" fill="#475569" fontSize="11" fontFamily="JetBrains Mono">50</text>
        <text x="228" y="148" fill="#475569" fontSize="11" fontFamily="JetBrains Mono">100</text>
      </svg>

      <div className="text-center -mt-4">
        <div className="font-syne font-bold text-3xl">
          <AnimatedCounter value={score} />
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>out of 100</div>
      </div>
    </div>
  )
}

function MaterialDonut() {
  let cumulative = 0
  const r = 34
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {materials.map((m, i) => {
            const offset = cumulative
            cumulative += m.pct
            const dash = (m.pct / 100) * circ
            return (
              <motion.circle
                key={i} cx="50" cy="50" r={r} fill="none"
                stroke={m.color} strokeWidth="8"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset * circ / 100}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
              />
            )
          })}
        </svg>
      </div>
      <div className="space-y-1.5">
        {materials.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-sm" style={{ background: m.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
            <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{m.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sustainability() {
  return (
    <section id="sustainability" className="relative py-24 px-6 overflow-hidden" style={{ background: 'var(--void)' }}>
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ border: '1px solid rgba(30,37,51,0.3)', animation: 'spin 60s linear infinite' }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ border: '1px dashed rgba(37,99,235,0.15)', animation: 'spin 90s linear infinite reverse' }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent)' }} />
      </div>

      <div className="max-w-[1100px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="SUSTAINABILITY" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Save Money While Reducing Waste
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base max-w-[640px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Every optimized shipment is a smaller box, less material, lower carbon.
              Shipzi turns your packaging decisions into ESG progress.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left — Gauge + Metrics */}
          <ScrollFadeIn direction="left">
            <Gauge />

            <div className="grid grid-cols-2 gap-3 mt-8">
              {metrics.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.85, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="p-3.5 rounded-xl text-center"
                  style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
                >
                  <div className="text-lg mb-1">{m.icon}</div>
                  <div className="font-syne font-bold text-lg" style={{ color: m.color }}>
                    <AnimatedCounter value={m.value} suffix={m.suffix} duration={1800} />
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                </motion.div>
              ))}
            </div>
          </ScrollFadeIn>

          {/* Right — Description + Materials + Milestones */}
          <ScrollFadeIn direction="right">
            <h3 className="font-syne font-semibold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
              Packaging decisions have environmental impact
            </h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              When Shipzi selects a smaller box, material consumption drops.
              Dimensional weight drops. Carbon footprint drops. At 5,000 shipments/month,
              right-sizing boxes eliminates 1,060kg of CO₂ equivalent annually.
            </p>

            {/* Material Donut */}
            <div className="mb-6">
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Your Material Mix</div>
              <MaterialDonut />
            </div>

            {/* Milestones */}
            <div className="space-y-2.5">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: m.done ? `${m.color}08` : 'var(--elevated)',
                    border: `1px solid ${m.done ? `${m.color}44` : 'var(--border)'}`,
                    opacity: m.done ? 1 : 0.7,
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${m.color}20`, color: m.color }}>
                    {m.done ? '✓' : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.title}</div>
                    {!m.done && (
                      <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--border)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: m.color }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${m.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2 }}
                        />
                      </div>
                    )}
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-ghost w-full mt-6 justify-center">
              📄 Download ESG Report
            </button>
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  )
}
