'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { SectionLabel, ScrollFadeIn, AnimatedCounter } from './utils'

const testimonials = [
  {
    metric: '₹47L',
    metricLabel: 'saved in Q1 alone',
    quote: 'Shipzi reduced our packaging costs by 31% in the first month. The CSV upload processed our entire 8,000 SKU catalog in under 90 seconds. The ROI was visible before week 1 ended.',
    name: 'Marcus Chen',
    title: 'Head of Operations',
    company: 'NovaTech Fulfillment',
    initials: 'MC',
    color: '#2563EB',
    shipments: '8,200 monthly shipments',
    scrollRate: 0.82,
  },
  {
    metric: '42 → 79',
    metricLabel: 'sustainability score in 3 months',
    quote: 'Our ESG score went from 42 to 79 in 3 months. The sustainability report feature made our board presentation credible for the first time. Customers noticed.',
    name: 'Sarah Okonkwo',
    title: 'Supply Chain Director',
    company: 'GreenLeaf Commerce',
    initials: 'SO',
    color: '#10B981',
    shipments: '3,500 monthly shipments',
    featured: true,
    scrollRate: 1.0,
  },
  {
    metric: '10,000',
    metricLabel: 'SKUs optimized in 4 minutes',
    quote: '10,000-row CSV processed in 4 minutes flat. Every result auto-saved. Our warehouse team stopped guessing box sizes forever. Three months later, zero oversized shipment complaints.',
    name: 'James Hartley',
    title: 'Warehouse Manager',
    company: 'SwiftShip Logistics',
    initials: 'JH',
    color: '#06B6D4',
    shipments: '12,000 monthly shipments',
    scrollRate: 1.18,
  },
]

const logos = ['NovaTech', 'GreenLeaf', 'SwiftShip', 'PackPro', 'LogiFirst', 'BoxCraft', 'ShipRight', 'QuickPack']

function TestimonialCard({ t, index }: { t: typeof testimonials[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [40 * (t.scrollRate - 1), -40 * (t.scrollRate - 1)])
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: index === 1 ? 60 : 0, x: index === 0 ? -90 : index === 2 ? 90 : 0 }}
        animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-8 h-full flex flex-col relative overflow-hidden"
        style={{
          transform: t.featured ? 'scale(1.03)' : undefined,
          border: t.featured ? undefined : undefined,
        }}
      >
        {/* Featured Gradient Border */}
        {t.featured && (
          <>
            <div className="absolute -top-0.5 left-0 right-0 h-[2px]"
              style={{
                background: 'linear-gradient(90deg, #2563EB, #06B6D4, #10B981)',
                animation: 'spin 8s linear infinite',
              }}
            />
            <div className="inline-block self-start px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#06B6D4' }}>
              Featured Story
            </div>
          </>
        )}

        {/* Stars */}
        <div className="flex gap-0.5 mb-4">
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.3 + i * 0.08 }}
              style={{ color: '#F59E0B', transformOrigin: 'left' }}
            >
              ★
            </motion.span>
          ))}
        </div>

        {/* Metric */}
        <div className="mb-4">
          <div className="font-syne font-bold text-[32px] leading-none" style={{ color: 'var(--green)' }}>
            <AnimatedCounter value={0} />
            {t.metric}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.metricLabel}</div>
        </div>

        {/* Quote */}
        <div className="relative mb-6 flex-1">
          <span className="absolute -top-2 -left-1 text-4xl" style={{ color: 'var(--blue)', opacity: 0.4 }}>&quot;</span>
          <p className="text-sm leading-relaxed italic pl-4" style={{ color: 'var(--text-secondary)' }}>
            {t.quote}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mb-5" style={{ background: 'var(--border)' }} />

        {/* Person */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: t.color }}>
            {t.initials}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.title}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--cyan)' }}>{t.company}</div>
          </div>
        </div>

        {/* Company Metric */}
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>📦</span> {t.shipments}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Testimonials() {
  return (
    <section className="py-24 px-6" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="CUSTOMER RESULTS" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Companies Shipping Smarter with Shipzi
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Real results from real logistics teams across India.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i} />
          ))}
        </div>

        {/* Logo Strip */}
        <ScrollFadeIn delay={0.3}>
          <p className="text-center text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Trusted by fast-growing teams across India
          </p>
          <div className="overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10"
              style={{ background: 'linear-gradient(90deg, var(--surface), transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-16 z-10"
              style={{ background: 'linear-gradient(270deg, var(--surface), transparent)' }} />
            <div className="flex gap-4" style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}>
              {[...logos, ...logos].map((name, i) => (
                <div key={i} className="flex-shrink-0 px-6 py-3 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 140, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {name}
                </div>
              ))}
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  )
}
