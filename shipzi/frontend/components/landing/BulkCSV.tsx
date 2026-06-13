'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionLabel, ScrollFadeIn, AnimatedCounter } from './utils'

const CSV_HEADERS = ['product', 'l', 'w', 'h', 'box_l', 'box_w', 'box_h', 'frag', 'price', 'zone']
const CSV_ROWS = [
  'Earbuds,12,8,7,20,15,10,8,1.40,Z3',
  'DeskLamp,45,20,15,60,35,30,3,2.20,Z2',
  'PhoneCase,18,9,2,25,20,10,1,0.85,Z1',
  'Laptop,38,30,5,55,45,15,4,2.20,Z4',
  'Speaker,22,22,12,35,30,25,5,1.40,Z2',
  'Headset,18,14,8,25,20,15,6,1.10,Z3',
  'Monitor,54,32,8,65,40,15,3,3.10,Z4',
  'GiftBox,24,16,10,30,20,15,9,1.80,Z1',
]

const RESULTS = [
  { icon: '✓', product: 'Earbuds', result: 'Small Parcel', savings: '₹34 saved', color: 'var(--green)' },
  { icon: '✓', product: 'Desk Lamp', result: 'Medium Box', savings: '₹18 saved', color: 'var(--green)' },
  { icon: '✓', product: 'Phone Case', result: 'Micro Mailer', savings: '₹12 saved', color: 'var(--green)' },
  { icon: '⚠', product: 'Laptop', result: 'Large Box', savings: '₹8 saved', color: 'var(--amber)' },
  { icon: '✓', product: 'Speaker', result: 'Medium Box', savings: '₹22 saved', color: 'var(--green)' },
  { icon: '✗', product: 'Large Panel', result: 'No fit found', savings: '₹0', color: 'var(--red)' },
  { icon: '✓', product: 'Headset', result: 'Small Parcel', savings: '₹15 saved', color: 'var(--green)' },
  { icon: '○', product: 'Gift Box', result: 'Already opt.', savings: '₹0', color: 'var(--text-muted)' },
]

function TerminalPanel({ title, children, width = 320 }: { title: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="terminal-window" style={{ width }}>
      <div className="terminal-bar">
        <div className="terminal-dot red" />
        <div className="terminal-dot amber" />
        <div className="terminal-dot green" />
        <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <div className="p-3 font-mono text-xs overflow-hidden" style={{ maxHeight: 300 }}>
        {children}
      </div>
    </div>
  )
}

function EnginePanel() {
  const [msgIdx, setMsgIdx] = useState(0)
  const messages = [
    { text: '→ Validating row geometry...', color: 'var(--text-secondary)' },
    { text: '→ Fragility clearance: 3cm', color: 'var(--purple)' },
    { text: '→ Running FFD pass...', color: 'var(--blue)' },
    { text: '→ Dim weight: 0.88kg', color: 'var(--cyan)' },
    { text: '→ Savings: ₹38.50', color: 'var(--green)' },
    { text: '→ Row complete ✓', color: 'var(--green)' },
  ]

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(v => (v + 1) % messages.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative w-[260px] h-[260px] glass-card flex flex-col items-center justify-center">
      {/* Animated Border */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 260">
        <motion.rect
          x="1" y="1" width="258" height="258" rx="16"
          fill="none" stroke="var(--blue)" strokeWidth="1"
          strokeDasharray="12 8"
          animate={{ strokeDashoffset: [0, -80] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      <span className="font-mono text-xs mb-3 relative z-10" style={{ color: 'var(--blue)' }}>FFD Algorithm</span>

      {/* Cog */}
      <motion.div
        className="text-4xl mb-3 relative z-10"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        ⚙️
      </motion.div>

      {/* Processing bar */}
      <div className="w-[80%] h-1 rounded-full overflow-hidden mb-4 relative z-10" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--blue), var(--cyan), var(--green))' }}
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </div>

      {/* Status message */}
      <div className="font-mono text-xs relative z-10" style={{ color: messages[msgIdx].color }}>
        {messages[msgIdx].text}
      </div>

      <div className="absolute bottom-3 right-3 font-mono text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
        1,248 rows/sec
      </div>
    </div>
  )
}

function ResultsPanel() {
  const [visibleRows, setVisibleRows] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setVisibleRows(v => {
      if (v >= RESULTS.length) return 0
      return v + 1
    }), 800)
    return () => clearInterval(t)
  }, [])

  return (
    <TerminalPanel title="optimization_results.csv">
      <div className="space-y-1">
        {RESULTS.slice(0, visibleRows).map((r, i) => (
          <motion.div
            key={`${i}-${r.product}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-1 px-2 rounded"
            style={{ background: `${r.color}08` }}
          >
            <span style={{ color: r.color }}>{r.icon}</span>
            <span className="flex-1 ml-2" style={{ color: 'var(--text-primary)' }}>{r.product}</span>
            <span className="flex-1 text-center" style={{ color: 'var(--text-secondary)' }}>→ {r.result}</span>
            <span className="text-right" style={{ color: r.color }}>{r.savings}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 pt-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--green)' }}>✓ Results auto-saved to Orders tab</span>
      </div>
    </TerminalPanel>
  )
}

export default function BulkCSV() {
  const [visibleHeaders, setVisibleHeaders] = useState(0)
  const [visibleRows, setVisibleRows] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const ht = setInterval(() => setVisibleHeaders(v => {
      if (v >= CSV_HEADERS.length) { clearInterval(ht); return v }
      return v + 1
    }), 50)
    const rt = setTimeout(() => {
      const interval = setInterval(() => setVisibleRows(v => {
        if (v >= CSV_ROWS.length) { clearInterval(interval); return v }
        return v + 1
      }), 300)
    }, 500)
    return () => { clearInterval(ht); clearTimeout(rt) }
  }, [inView])

  return (
    <section className="py-24 px-6" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="BULK PROCESSING" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Optimize 10,000+ Shipments at Once
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base max-w-[640px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Upload a single CSV. Get back fully optimized results for every row.
              One invalid row never stops the batch.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Three Panel Visualization */}
        <ScrollFadeIn delay={0.3}>
          <div ref={ref} className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
            {/* Panel A — CSV Input */}
            <TerminalPanel title="shipments.csv">
              <div className="flex gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                {CSV_HEADERS.slice(0, visibleHeaders).map((h, i) => (
                  <span key={i} className="whitespace-nowrap" style={{
                    color: i < 4 ? 'var(--blue)' : i < 7 ? 'var(--cyan)' : 'var(--purple)'
                  }}>{h}</span>
                ))}
              </div>
              {CSV_ROWS.slice(0, visibleRows).map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="py-1 flex gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  {row.split(',').map((cell, j) => (
                    <span key={j} className="whitespace-nowrap">{cell}</span>
                  ))}
                </motion.div>
              ))}
              {visibleRows >= CSV_ROWS.length && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Row 8 of 10,247
                </div>
              )}
            </TerminalPanel>

            {/* Arrow */}
            <div className="text-2xl hidden md:block" style={{ color: 'var(--blue)' }}>→</div>

            {/* Panel B — Engine */}
            <EnginePanel />

            {/* Arrow */}
            <div className="text-2xl hidden md:block" style={{ color: 'var(--green)' }}>→</div>

            {/* Panel C — Results */}
            <ResultsPanel />
          </div>
        </ScrollFadeIn>

        {/* Stats Bar */}
        <ScrollFadeIn delay={0.5}>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            {[
              { value: 10247, suffix: '', label: 'Rows Processed', color: 'var(--text-primary)' },
              { value: 42, prefix: '₹', suffix: 'L', label: 'Projected Savings', color: 'var(--green)' },
              { value: 0, suffix: '', label: 'Rows Failed', color: 'var(--green)' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-syne font-bold text-3xl" style={{ color: s.color }}>
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} duration={1800} />
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  )
}
