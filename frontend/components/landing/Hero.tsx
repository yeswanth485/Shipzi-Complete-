'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { AnimatedCounter } from './utils'

const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false })

function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5,
      drift: -40 - Math.random() * 40,
    })), [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left, top: p.top,
            width: 2, height: 2,
            background: 'var(--blue)',
            opacity: 0.3,
          }}
          animate={{ y: [0, p.drift], opacity: [0.3, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function ScrollHint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const handler = () => setVisible(window.scrollY < 100)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!visible) return null
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      transition={{ delay: 2.5 }}
    >
      <motion.span
        className="text-white text-2xl"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        ∨
      </motion.span>
      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
        Scroll to explore
      </span>
    </motion.div>
  )
}

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'var(--void)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 items-center min-h-screen pt-20">
        {/* Left Column */}
        <div className="py-16 relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="badge-pill mb-8 inline-block"
          >
            🚀 AI-Powered Logistics Intelligence
          </motion.div>

          {/* Headline */}
          <h1 className="font-syne font-bold mb-6 leading-[1.08]" style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {'Stop Paying for Empty Space.'.split(' ').map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 70 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={word === 'Space.' ? { color: 'var(--blue)' } : {}}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* SVG Underline for "Empty Space." */}
          <motion.div className="mb-6 -mt-4" style={{ height: 6 }}>
            <svg width="260" height="6" viewBox="0 0 260 6">
              <motion.path
                d="M0 3 Q 30 0, 60 3 T 120 3 T 180 3 T 240 3"
                fill="none"
                stroke="var(--blue)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 1.1, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-lg mb-8 leading-relaxed max-w-[520px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Shipzi automatically finds the most efficient box for every shipment —
            reducing shipping costs, packaging waste, and fulfillment inefficiencies at scale.
          </motion.p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 mb-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.15 }}>
              <Link href="/signup" className="btn-primary">Start Free Trial</Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.25 }}>
              <button className="btn-ghost relative">
                <span className="relative z-10">▶ Watch Live Demo</span>
              </button>
            </motion.div>
          </div>

          {/* Live Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="flex items-center gap-6 mb-5"
          >
            {[
              { value: 124, prefix: '₹', suffix: 'M', label: 'Cost Saved' },
              { value: 23, suffix: 'M', label: 'Shipments Optimized' },
              { value: 31, suffix: '%', label: 'Waste Reduced' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center" style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none', paddingRight: i < 2 ? 24 : 0 }}>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--green)' }}>↑</span>
                    <span className="font-syne font-bold" style={{ fontSize: 26, color: 'var(--text-primary)' }}>
                      <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} duration={2200} />
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans' }}>{stat.label}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.6 }}
            className="flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {['#2563EB', '#06B6D4', '#10B981', '#F59E0B'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                  style={{ background: c, borderColor: 'var(--void)' }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 text-sm" style={{ color: '#F59E0B' }}>★★★★★</div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Trusted by 500+ logistics teams</p>
            </div>
          </motion.div>
        </div>

        {/* Right Column — Real Three.js 3D Scene */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[500px] hidden lg:block"
        >
          {/* Ambient glow behind scene */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(500px circle at 50% 50%, rgba(37,99,235,0.08), transparent)',
          }} />

          {/* Three.js Canvas */}
          <HeroScene />

          {/* Depth fog at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[160px] pointer-events-none"
            style={{ background: 'linear-gradient(transparent, var(--void))' }} />

          {/* Floating particles overlay */}
          <Particles />
        </motion.div>
      </div>

      <ScrollHint />
    </section>
  )
}
