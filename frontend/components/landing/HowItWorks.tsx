'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { SectionLabel, WordHeadline, ScrollFadeIn } from './utils'

const STEPS = [
  { num: '01', label: 'Upload' },
  { num: '02', label: 'Analyze' },
  { num: '03', label: 'Optimize' },
  { num: '04', label: 'Results' },
]

function TerminalCSV() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [visibleRows, setVisibleRows] = useState(0)

  const headers = ['product_name', 'length', 'width', 'height', 'box_l', 'box_w', 'box_h', 'frag', 'price', 'zone']
  const rows = [
    'Earbuds,12,8,7,20,15,10,8,1.40,Z3',
    'DeskLamp,45,20,15,60,35,30,3,2.20,Z2',
    'PhoneCase,18,9,2,25,20,10,1,0.85,Z1',
    'Laptop,38,30,5,55,45,15,4,2.20,Z4',
    'Speaker,22,22,12,35,30,25,5,1.40,Z2',
    'Headset,18,14,8,25,20,15,6,1.10,Z3',
    'Monitor,54,32,8,65,40,15,3,3.10,Z4',
    'GiftBox,24,16,10,30,20,15,9,1.80,Z1',
  ]

  useEffect(() => {
    if (!inView) return
    const timer = setInterval(() => {
      setVisibleRows(v => {
        if (v >= rows.length) { clearInterval(timer); return v }
        return v + 1
      })
    }, 300)
    return () => clearInterval(timer)
  }, [inView])

  return (
    <div ref={ref} className="terminal-window text-xs font-mono">
      <div className="terminal-bar">
        <div className="terminal-dot red" />
        <div className="terminal-dot amber" />
        <div className="terminal-dot green" />
        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>shipments.csv</span>
      </div>
      <div className="p-3 overflow-hidden" style={{ maxHeight: 260 }}>
        {/* Headers */}
        <div className="flex gap-3 pb-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          {headers.map((h, i) => (
            <span key={i} className="whitespace-nowrap" style={{ color: i < 4 ? 'var(--blue)' : i < 7 ? 'var(--cyan)' : 'var(--purple)' }}>
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {rows.slice(0, visibleRows).map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 py-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {row.split(',').map((cell, j) => (
              <span key={j} className="whitespace-nowrap">{cell}</span>
            ))}
          </motion.div>
        ))}
      </div>
      {visibleRows >= rows.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-3 pb-3"
        >
          <span className="inline-block px-2 py-1 rounded text-xs font-medium badge-valid">
            ✓ 10,247 rows validated
          </span>
        </motion.div>
      )}
    </div>
  )
}

function AIVisual() {
  const [lineIndex, setLineIndex] = useState(0)
  const lines = [
    { text: '→ Loading box catalog...', color: 'var(--text-primary)' },
    { text: '→ Validating geometry for row 1-250...', color: 'var(--cyan)' },
    { text: '→ Running FFD pass 1 of 40...', color: 'var(--blue)' },
    { text: '→ Fragility clearance applied: 3cm', color: 'var(--purple)' },
    { text: '→ Dimensional weight calculated...', color: 'var(--green)' },
    { text: '→ 250 rows complete ✓', color: 'var(--green)' },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex(v => (v + 1) % lines.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Engine Box */}
      <div className="relative w-[280px] h-[180px] rounded-xl flex flex-col items-center justify-center"
        style={{ background: 'var(--void)', border: '1px dashed var(--blue)' }}>
        <span className="font-mono text-xs mb-2" style={{ color: 'var(--blue)' }}>FFD Algorithm</span>
        {/* Scanning line */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <motion.div
            className="absolute left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--blue), transparent)' }}
            animate={{ top: ['-2px', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        {/* Status */}
        <div className="font-mono text-xs mt-2" style={{ color: lines[lineIndex].color }}>
          {lines[lineIndex].text}
        </div>
      </div>
      {/* Progress Ring */}
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="3" />
          <motion.circle
            cx="24" cy="24" r="20" fill="none" stroke="var(--blue)" strokeWidth="3"
            strokeDasharray="126"
            animate={{ strokeDashoffset: [126, 0, 126] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

function BoxTransform() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setPhase(p => (p + 1) % 3), 1500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[220px] h-[160px] flex items-center justify-center" style={{ perspective: 400 }}>
        {phase === 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[160px] h-[120px] rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)' }}
          >
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--red)' }}>50×40×30cm</div>
              <div className="font-syne font-bold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>₹120</div>
            </div>
          </motion.div>
        )}
        {phase === 1 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[140px] h-[100px] rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,0.15)', border: '2px solid var(--blue)', boxShadow: '0 0 20px rgba(37,99,235,0.3)' }}
          >
            <span className="font-mono text-xs" style={{ color: 'var(--blue)' }}>AI Selecting...</span>
          </motion.div>
        )}
        {phase === 2 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[110px] h-[70px] rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--green)' }}
          >
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--green)' }}>42×32×12cm</div>
              <div className="font-syne font-bold text-sm mt-1" style={{ color: 'var(--green)' }}>₹75</div>
            </div>
          </motion.div>
        )}
      </div>
      {phase === 2 && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--green)' }}
        >
          +₹45 saved
        </motion.div>
      )}
      {/* Utilization Bar */}
      <div className="w-full max-w-[200px]">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: 'var(--text-secondary)' }}>Box Utilization</span>
          <span style={{ color: 'var(--blue)' }}>{phase === 2 ? '87%' : phase === 1 ? '...' : '45%'}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--blue), var(--green))' }}
            animate={{ width: phase === 2 ? '87%' : phase === 1 ? '60%' : '45%' }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
    </div>
  )
}

function ResultsVisual() {
  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: '₹4.2M', label: 'Saved', color: 'var(--green)' },
          { value: '10,247', label: 'Processed', color: 'var(--blue)' },
          { value: '83%', label: 'Utilization', color: 'var(--cyan)' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="p-3 rounded-lg text-center"
            style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
          >
            <div className="font-syne font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
      {/* Mini Table */}
      <div className="terminal-window text-xs">
        <div className="p-2 space-y-1">
          {[
            { product: 'Earbuds', result: 'Small Parcel', status: 'Valid', savings: '₹34', color: 'var(--green)' },
            { product: 'Laptop', result: 'Large Box', status: 'Tight', savings: '₹8', color: 'var(--amber)' },
            { product: 'GiftBox', result: '—', status: 'Optimal', savings: '₹0', color: 'var(--text-muted)' },
          ].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="flex items-center justify-between py-1 px-2 rounded"
              style={{ background: 'var(--void)' }}
            >
              <span style={{ color: 'var(--text-primary)' }}>{r.product}</span>
              <span style={{ color: 'var(--text-secondary)' }}>→ {r.result}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: r.color }}>{r.status}</span>
              <span style={{ color: 'var(--green)' }}>{r.savings}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const activeStep = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 0, 1, 2, 3])
  const [step, setStep] = useState(0)

  useEffect(() => {
    return activeStep.on('change', v => setStep(Math.round(v)))
  }, [activeStep])

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="how-it-works" ref={containerRef} className="relative" style={{ background: 'var(--void)' }}>
      {/* Header */}
      <div className="pt-24 pb-12 px-6 text-center max-w-[900px] mx-auto">
        <SectionLabel text="HOW IT WORKS" />
        <WordHeadline
          text="Optimize Thousands of Shipments in Minutes"
          className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4"
        />
        <ScrollFadeIn delay={0.3}>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Four steps. One upload. Zero guesswork.
          </p>
        </ScrollFadeIn>
      </div>

      {/* Sticky Scroll Container */}
      <div className="relative" style={{ height: '400vh' }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Progress Indicator */}
          <div className="absolute top-10 left-0 right-0 z-20 px-6">
            <div className="max-w-[700px] mx-auto relative">
              <div className="flex justify-between items-center relative z-10">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{
                        background: i <= step ? (i < step ? 'var(--green)' : 'var(--blue)') : 'var(--border)',
                        transform: i === step ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span className="text-xs font-medium transition-colors duration-300"
                      style={{ color: i <= step ? (i < step ? 'var(--green)' : 'var(--text-primary)') : 'var(--text-muted)' }}>
                      {s.num} {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute top-[5px] left-0 right-0 h-[2px]" style={{ background: 'var(--border)' }}>
                <motion.div className="h-full" style={{ width: progressWidth, background: 'linear-gradient(90deg, var(--blue), var(--green))' }} />
              </div>
            </div>
          </div>

          {/* Panel Counter */}
          <div className="absolute bottom-10 right-10 z-20 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
            0{step + 1} / 04
          </div>

          {/* Panels */}
          <div className="h-full flex items-center justify-center px-6 pt-20">
            <div className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {step === 0 && (
                <motion.div key="p0" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
                  <div className="mb-6">
                    <span className="font-syne font-bold text-6xl" style={{ color: 'var(--border)' }}>01</span>
                    <h3 className="font-syne font-semibold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>Upload Your CSV</h3>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Drop a CSV with your product dimensions and current packaging data.
                      Supports 10,000+ rows in one upload.
                    </p>
                    <ul className="mt-4 space-y-2">
                      {['Drag and drop or click to browse', 'Required: 10 columns (template downloadable)', '10,000+ rows supported', 'Instant validation feedback'].map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--green)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="p1" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
                  <span className="font-syne font-bold text-6xl" style={{ color: 'var(--border)' }}>02</span>
                  <h3 className="font-syne font-semibold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>AI Analysis</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    The engine tests every box in your catalog against every product row.
                    Validates dimensions, applies fragility clearance, calculates dimensional weight.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {['FFD (First Fit Decreasing) algorithm', 'Fragility clearance: 0–4cm based on score', 'Zone-based dimensional weight pricing', 'Processes 250 rows per chunk'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--green)' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="p2" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
                  <span className="font-syne font-bold text-6xl" style={{ color: 'var(--border)' }}>03</span>
                  <h3 className="font-syne font-semibold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>Optimization Engine</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    For every row, Shipzi selects the smallest box in your catalog that safely fits
                    the product. Savings = original cost minus optimized cost.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {['Smallest valid box always preferred', 'Fragility score adjusts required clearance', 'Savings calculated per-row with reason', 'Fit status: Valid / Tight / No Fit / Already Optimal'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--green)' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="p3" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
                  <span className="font-syne font-bold text-6xl" style={{ color: 'var(--border)' }}>04</span>
                  <h3 className="font-syne font-semibold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>Results in Your Orders Tab</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Every optimization result is saved to your database instantly.
                    Filter by fit status, export CSV, track savings over time.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {['Saved to database automatically', 'Paginated table: 50 rows/page', 'Filter by Valid / Tight / No Fit / Optimal', 'Export results as CSV'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--green)' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Right Visual */}
              <div>
                {step === 0 && <TerminalCSV />}
                {step === 1 && <AIVisual />}
                {step === 2 && <BoxTransform />}
                {step === 3 && <ResultsVisual />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
