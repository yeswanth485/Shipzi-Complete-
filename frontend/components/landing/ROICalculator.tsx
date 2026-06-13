'use client'
import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionLabel, ScrollFadeIn, AnimatedCounter } from './utils'

type Rate = 'conservative' | 'moderate' | 'aggressive'
const RATES: Record<Rate, number> = { conservative: 0.15, moderate: 0.23, aggressive: 0.30 }

export default function ROICalculator() {
  const [shipments, setShipments] = useState(5000)
  const [boxCost, setBoxCost] = useState(120)
  const [shippingCost, setShippingCost] = useState(340)
  const [rate, setRate] = useState<Rate>('moderate')
  const [calculated, setCalculated] = useState(false)
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const symbol = currency === 'INR' ? '₹' : '$'
  const conversion = currency === 'INR' ? 1 : 0.012

  const results = useMemo(() => {
    const optRate = RATES[rate]
    const currentSpend = shipments * (boxCost + shippingCost) * conversion
    const monthlySavings = currentSpend * optRate
    const annualSavings = monthlySavings * 12
    const wasteReduction = Math.round(optRate * 1.1 * 100)
    const costPerOpt = ((149 * conversion) / shipments)

    return { currentSpend, monthlySavings, annualSavings, wasteReduction, costPerOpt, newSpend: currentSpend - monthlySavings }
  }, [shipments, boxCost, shippingCost, rate, conversion])

  const handleCalculate = useCallback(() => {
    setCalculated(true)
  }, [])

  const fmt = (n: number) => {
    if (currency === 'INR') {
      return '₹' + Math.round(n).toLocaleString('en-IN')
    }
    return '$' + Math.round(n).toLocaleString('en-US')
  }

  return (
    <section className="py-24 px-6" style={{ background: 'var(--void)' }}>
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="ROI CALCULATOR" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Calculate Your Savings
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              30 seconds. No sign-up. See your exact ROI before committing.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-[48%_48%] gap-6">
          {/* Left — Inputs */}
          <div className="glass-card p-8">
            <h3 className="font-syne font-semibold text-xl mb-6" style={{ color: 'var(--text-primary)' }}>Your Numbers</h3>

            {/* Monthly Shipments */}
            <div className="mb-5">
              <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>📦 Monthly Shipments</label>
              <input
                type="number"
                value={shipments}
                onChange={e => setShipments(Number(e.target.value) || 0)}
                className="input-dark"
              />
              <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>Typical: 500–50,000</span>
            </div>

            {/* Box Cost */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Avg Box Cost</span>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{symbol}{boxCost}</span>
              </div>
              <input type="range" min={10} max={500} value={boxCost} onChange={e => setBoxCost(Number(e.target.value))} className="w-full" />
            </div>

            {/* Shipping Cost */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Avg Shipping Cost per Shipment</span>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{symbol}{shippingCost}</span>
              </div>
              <input type="range" min={50} max={2000} value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="w-full" />
            </div>

            {/* Optimization Rate */}
            <div className="mb-5">
              <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Expected Optimization Rate</label>
              <div className="flex gap-1.5">
                {([
                  { key: 'conservative' as Rate, label: 'Conservative 15%' },
                  { key: 'moderate' as Rate, label: 'Moderate 23%' },
                  { key: 'aggressive' as Rate, label: 'Aggressive 30%' },
                ]).map(r => (
                  <button
                    key={r.key}
                    onClick={() => setRate(r.key)}
                    className="flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: rate === r.key ? 'var(--blue)' : 'var(--elevated)',
                      color: rate === r.key ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${rate === r.key ? 'var(--blue)' : 'var(--border)'}`,
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Toggle */}
            <div className="flex gap-1.5 mb-6">
              {(['INR', 'USD'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: currency === c ? 'var(--blue)' : 'var(--elevated)',
                    color: currency === c ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${currency === c ? 'var(--blue)' : 'var(--border)'}`,
                  }}
                >
                  {c === 'INR' ? '₹ INR' : '$ USD'}
                </button>
              ))}
            </div>

            <button onClick={handleCalculate} className="btn-primary w-full justify-center">
              {calculated ? 'Recalculate' : 'Calculate My Savings'}
            </button>
          </div>

          {/* Right — Results */}
          <AnimatePresence mode="wait">
            {calculated ? (
              <motion.div
                key="results"
                initial={{ opacity: 0.4, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                className="glass-card p-8"
                style={{ borderColor: 'var(--green)' }}
              >
                {/* Monthly Savings */}
                <div className="mb-6">
                  <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Monthly Savings</div>
                  <div className="font-syne font-bold text-[42px] leading-none" style={{ color: 'var(--green)' }}>
                    {fmt(results.monthlySavings)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>per month, based on your inputs</div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Annual Savings', value: fmt(results.annualSavings), color: 'var(--green)' },
                    { label: 'Waste Reduction', value: `${results.wasteReduction}%`, color: 'var(--cyan)' },
                    { label: 'ROI within', value: '14 days', color: 'var(--amber)' },
                    { label: 'Cost per Optimization', value: `${symbol}${results.costPerOpt.toFixed(2)}`, color: 'var(--text-secondary)' },
                  ].map((m, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--elevated)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                      <div className="font-syne font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Breakdown Bars */}
                <div className="mb-6">
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Where savings come from</div>
                  {[
                    { label: 'Box Cost Savings', pct: 45, color: 'var(--blue)' },
                    { label: 'Dim Weight Reduction', pct: 35, color: 'var(--cyan)' },
                    { label: 'Waste Elimination', pct: 20, color: 'var(--green)' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2">
                      <span className="text-xs w-40" style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: b.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text-secondary)' }}>{b.pct}%</span>
                    </div>
                  ))}
                </div>

                {/* Before/After */}
                <div className="p-4 rounded-lg mb-6" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Currently spending</div>
                      <div className="font-syne font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(results.currentSpend)}/mo</div>
                    </div>
                    <div className="text-2xl" style={{ color: 'var(--green)' }}>→</div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>With Shipzi</div>
                      <div className="font-syne font-bold" style={{ color: 'var(--green)' }}>{fmt(results.newSpend)}/mo</div>
                    </div>
                  </div>
                </div>

                <a href="/signup" className="btn-primary w-full justify-center">
                  Start Free Trial — See These Savings Real
                </a>
                <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  ✓ Free plan includes 50 optimizations · No credit card
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                className="glass-card p-8 flex flex-col items-center justify-center text-center"
                style={{ filter: 'blur(2px)' }}
              >
                <div className="text-4xl mb-4">📊</div>
                <p className="font-syne font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Your savings will appear here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Enter your numbers to see your savings →
                </p>
                <div className="mt-6 space-y-2 opacity-30">
                  {['_ _ _ _', '_ _ _ _', '_ _ _ _'].map((d, i) => (
                    <div key={i} className="h-8 rounded-lg" style={{ background: 'var(--elevated)' }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Disclaimer */}
        <ScrollFadeIn delay={0.3}>
          <p className="text-center text-xs mt-6 max-w-[600px] mx-auto" style={{ color: 'var(--text-muted)' }}>
            Based on average Shipzi customer data across 500+ businesses. Actual results vary by
            product mix, box catalog diversity, and shipping zones.
          </p>
        </ScrollFadeIn>
      </div>
    </section>
  )
}
