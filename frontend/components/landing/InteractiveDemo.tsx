'use client'
import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { SectionLabel, ScrollFadeIn } from './utils'

const CATALOG = [
  { name: 'Micro Mailer', l: 15, w: 10, h: 3, price: 25 },
  { name: 'Small Parcel', l: 20, w: 15, h: 10, price: 85 },
  { name: 'Medium Box', l: 35, w: 25, h: 20, price: 140 },
  { name: 'Large Box', l: 50, w: 40, h: 30, price: 220 },
  { name: 'XL Box', l: 65, w: 50, h: 40, price: 310 },
]

const FRAGILITY: Record<number, number> = { 9: 4, 7: 3, 4: 1, 2: 0, 1: 0 }

const FRAG_OPTIONS = [
  { label: '🪟 Glass', score: 9 },
  { label: '💛 Fragile', score: 7 },
  { label: '📦 Normal', score: 4 },
  { label: '🔩 Sturdy', score: 2 },
  { label: '⚓ Heavy', score: 1 },
]

export default function InteractiveDemo() {
  const [length, setLength] = useState(38)
  const [width, setWidth] = useState(30)
  const [height, setHeight] = useState(10)
  const [fragility, setFragility] = useState(4)
  const [currentBoxPrice] = useState(120)

  const result = useMemo(() => {
    const clearance = FRAGILITY[fragility] || 1
    const minL = length + clearance
    const minW = width + clearance
    const minH = height + clearance

    const fitting = CATALOG.filter(b => b.l >= minL && b.w >= minW && b.h >= minH)

    if (fitting.length === 0) return null

    const scored = fitting.map(b => {
      const volume = b.l * b.w * b.h
      const productVolume = length * width * height
      const utilization = (productVolume / volume) * 100
      const dimWeight = volume / 5000
      const shippingCost = dimWeight * 0.65
      const totalCost = b.price + shippingCost
      const score = (100 / volume) * 0.55 + (1 / totalCost) * 35 + 0.1

      return { ...b, volume, utilization, dimWeight, shippingCost, totalCost, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    const currentDimWeight = (50 * 40 * 20) / 5000
    const currentTotal = currentBoxPrice + currentDimWeight * 0.65
    const savings = currentTotal - best.totalCost

    const reduction = ((1 - best.dimWeight / currentDimWeight) * 100)

    return {
      box: best,
      savings: Math.max(0, savings),
      utilization: Math.round(best.utilization),
      reduction: Math.round(reduction),
      ecoScore: Math.min(100, Math.round(best.utilization * 0.9 + 10)),
      reason: `Downsized from 50×40×20 to ${best.l}×${best.w}×${best.h}cm. Reduces dimensional weight by ${Math.round(reduction)}%. Fragility clearance of ${clearance}cm applied.`,
    }
  }, [length, width, height, fragility, currentBoxPrice])

  return (
    <section id="demo" className="py-24 px-6" style={{ background: 'var(--void)' }}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="LIVE DEMO" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            See Shipzi Find Your Perfect Box
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Adjust the dimensions below — watch the AI recommendation update in real time
            </p>
          </ScrollFadeIn>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
          {/* Left — Input Panel */}
          <div className="glass-card p-7">
            <h4 className="font-syne font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Your Product</h4>

            {/* Sliders */}
            {[
              { label: 'Length', value: length, set: setLength, max: 60, unit: 'cm' },
              { label: 'Width', value: width, set: setWidth, max: 60, unit: 'cm' },
              { label: 'Height', value: height, set: setHeight, max: 40, unit: 'cm' },
            ].map(s => (
              <div key={s.label} className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{s.value} {s.unit}</span>
                </div>
                <input
                  type="range"
                  min={5} max={s.max} value={s.value}
                  onChange={e => s.set(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}

            {/* Fragility */}
            <div className="mb-6">
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Fragility Level</div>
              <div className="flex flex-wrap gap-1.5">
                {FRAG_OPTIONS.map(f => (
                  <button
                    key={f.score}
                    onClick={() => setFragility(f.score)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: fragility === f.score ? 'var(--blue)' : 'var(--elevated)',
                      color: fragility === f.score ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${fragility === f.score ? 'var(--blue)' : 'var(--border)'}`,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Box */}
            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Your Current Box</div>
              <div className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>50 × 40 × 20 cm</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cost: ₹{currentBoxPrice} per shipment</div>
            </div>

            {/* 3D Preview */}
            <div className="mt-6 flex justify-center">
              <div style={{ perspective: 300 }}>
                <motion.div
                  animate={{
                    width: 40 + length * 1.5,
                    height: 30 + height * 1.5,
                  }}
                  transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                  className="rounded-lg"
                  style={{
                    background: 'rgba(37,99,235,0.25)',
                    border: '1px solid var(--blue)',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(-15deg) rotateY(25deg)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center Arrow */}
          <div className="hidden md:flex items-center justify-center pt-20">
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl"
              style={{ color: result ? 'var(--green)' : 'var(--text-muted)' }}
            >
              →
            </motion.div>
          </div>

          {/* Right — Result Panel */}
          <motion.div
            className="glass-card p-7"
            animate={{ borderColor: result ? 'var(--green)' : 'var(--border)' }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-syne font-semibold" style={{ color: 'var(--text-primary)' }}>Shipzi Recommendation</h4>
              {result && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="badge-pill text-xs"
                  style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--green)', borderColor: 'rgba(16,185,129,0.3)' }}
                >
                  ✓ Optimized
                </motion.span>
              )}
            </div>

            {result ? (
              <>
                {/* Optimized Dimensions */}
                <div className="mb-4">
                  <motion.div
                    key={`${result.box.l}-${result.box.w}-${result.box.h}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-syne font-bold text-3xl"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {result.box.l} × {result.box.w} × {result.box.h} cm
                  </motion.div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{result.box.name}</div>
                </div>

                {/* Savings Badge */}
                <motion.div
                  key={result.savings}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="inline-block px-4 py-2 rounded-full mb-6"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <span className="font-syne font-semibold text-lg" style={{ color: 'var(--green)' }}>
                    +₹{Math.round(result.savings)} saved per shipment
                  </span>
                </motion.div>

                {/* Metric Bars */}
                <div className="space-y-4 mb-6">
                  {[
                    { label: 'Box Utilization', value: result.utilization, color: 'var(--blue)', suffix: '%' },
                    { label: 'Dim Weight Reduction', value: result.reduction, color: 'var(--cyan)', suffix: '%' },
                    { label: 'Eco Score', value: result.ecoScore, color: 'var(--green)', suffix: '/100' },
                  ].map((m, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                        <span className="font-mono text-xs font-medium" style={{ color: m.color }}>
                          {m.value}{m.suffix} {i < 2 ? '↑' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <motion.div
                          key={m.value}
                          className="h-full rounded-full"
                          style={{ background: m.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, m.value)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reason */}
                <div className="pl-3 text-xs italic leading-relaxed" style={{ borderLeft: '2px solid var(--blue)', color: 'var(--text-secondary)' }}>
                  {result.reason}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">📦</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No box in catalog fits this product with required clearance.
                  Adjust dimensions or fragility level.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
