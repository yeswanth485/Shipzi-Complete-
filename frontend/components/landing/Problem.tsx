'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionLabel, WordHeadline, ScrollFadeIn } from './utils'

const problems = [
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#EF4444" strokeWidth="1.5">
        <rect x="8" y="14" width="32" height="24" rx="2" />
        <rect x="14" y="20" width="20" height="12" rx="1" strokeDasharray="3 2" opacity="0.4" />
        <line x1="4" y1="14" x2="8" y2="14" opacity="0.4" />
        <line x1="40" y1="14" x2="44" y2="14" opacity="0.4" />
        <line x1="4" y1="38" x2="8" y2="38" opacity="0.4" />
        <line x1="40" y1="38" x2="44" y2="38" opacity="0.4" />
      </svg>
    ),
    title: 'Oversized Boxes',
    body: "40% of box volume is air. You're paying to ship emptiness on every order.",
    stat: '₹340 avg wasted per 100 shipments',
    statColor: '#F59E0B',
    hoverBorder: '#EF4444',
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#F59E0B" strokeWidth="1.5">
        <rect x="10" y="8" width="28" height="32" rx="2" />
        <line x1="24" y1="16" x2="24" y2="32" />
        <line x1="16" y1="24" x2="32" y2="24" />
        <circle cx="24" cy="24" r="8" strokeDasharray="2 2" opacity="0.3" />
      </svg>
    ),
    title: 'Dimensional Weight Charges',
    body: 'Carriers charge by whichever is greater: actual weight or dimensional weight. Oversized boxes trigger premium charges.',
    stat: '15–25% cost increase per oversized shipment',
    statColor: '#F59E0B',
    hoverBorder: '#F59E0B',
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#8B5CF6" strokeWidth="1.5">
        <circle cx="24" cy="16" r="6" />
        <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" />
        <text x="24" y="10" textAnchor="middle" fill="#8B5CF6" fontSize="10" fontWeight="bold">?</text>
      </svg>
    ),
    title: 'Manual Box Guessing',
    body: 'Warehouse teams select boxes by eye. No system. No logic. Human error every time.',
    stat: '62% of manually-picked boxes are wrong size',
    statColor: '#8B5CF6',
    hoverBorder: '#8B5CF6',
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#94A3B8" strokeWidth="1.5">
        <circle cx="24" cy="24" r="14" />
        <circle cx="24" cy="24" r="6" />
        <line x1="24" y1="10" x2="24" y2="6" />
        <line x1="24" y1="42" x2="24" y2="38" />
        <line x1="10" y1="24" x2="6" y2="24" />
        <line x1="42" y1="24" x2="38" y2="24" />
        <line x1="10" y1="10" x2="38" y2="38" strokeWidth="2" opacity="0.6" />
      </svg>
    ),
    title: 'Zero Optimization Tracking',
    body: 'No data on which products use which boxes. No measurement of packaging ROI. Flying blind.',
    stat: '0% of SMBs track packaging efficiency',
    statColor: '#94A3B8',
    hoverBorder: '#94A3B8',
  },
]

export default function Problem() {
  return (
    <section id="problem" className="relative py-24 px-6" style={{ background: 'var(--surface)' }}>
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-[900px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="THE PROBLEM" />
          <WordHeadline
            text="Most Businesses Are Losing Money on Packaging"
            className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4"
            delay={0.2}
          />
          <ScrollFadeIn delay={0.4}>
            <p className="text-base leading-relaxed max-w-[640px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
              The average business overspends on packaging by 23%. That's dead money leaving your warehouse on every single shipment.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Problem Cards — 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {problems.map((p, i) => (
            <ScrollFadeIn key={i} delay={0.2 + i * 0.1} direction={i % 2 === 0 ? 'left' : 'right'}>
              <motion.div
                className="glass-card p-7 h-full"
                whileHover={{ borderColor: p.hoverBorder, boxShadow: `0 0 20px ${p.hoverBorder}18` }}
              >
                <div className="mb-4">{p.icon}</div>
                <h4 className="font-syne font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{p.title}</h4>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{p.body}</p>
                <div
                  className="inline-block text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: `${p.statColor}18`, color: p.statColor, border: `1px solid ${p.statColor}33` }}
                >
                  {p.stat}
                </div>
              </motion.div>
            </ScrollFadeIn>
          ))}
        </div>

        {/* Bottom Connector Animation */}
        <ScrollFadeIn delay={0.6} className="mt-12">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              {['📦', '📦', '📦', '📦'].map((box, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                  className="text-lg"
                >
                  {box}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5 }}
                className="text-lg"
              >
                →
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.8 }}
                className="text-sm font-medium"
                style={{ color: 'var(--green)' }}
              >
                Solution →
              </motion.span>
            </div>
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  )
}
