'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { AnimatedCounter } from './utils'

function CSS3DBox({ size, color, position, rotation, animClass, animDelay }: {
  size: [number, number, number]; color: string; position: [number, number, number]
  rotation: [number, number, number]; animClass: string; animDelay: number
}) {
  const [l, w, h] = size
  const faces = [
    { transform: `translateZ(${h/2}px)`, width: l, height: w, bg: color },
    { transform: `translateZ(-${h/2}px) rotateY(180deg)`, width: l, height: w, bg: color },
    { transform: `translateX(-${l/2}px) rotateY(-90deg)`, width: h, height: w, bg: color },
    { transform: `translateX(${l/2}px) rotateY(90deg)`, width: h, height: w, bg: color },
    { transform: `translateY(-${w/2}px) rotateX(90deg)`, width: l, height: h, bg: color },
    { transform: `translateY(${w/2}px) rotateX(-90deg)`, width: l, height: h, bg: color },
  ]

  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%', top: '50%',
        transformStyle: 'preserve-3d',
        width: l, height: w, marginLeft: -l/2, marginTop: -w/2,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: animDelay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div
        className={animClass}
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `translate3d(${position[0]}px, ${position[1]}px, ${position[2]}px) rotateX(${rotation[0]}deg) rotateY(${rotation[1]}deg)`,
        }}
      >
        {faces.map((face, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: face.width, height: face.height,
              transform: face.transform,
              background: i === 0 ? color : `${color}dd`,
              border: `1px solid ${color}44`,
              backfaceVisibility: 'visible',
              left: '50%', top: '50%',
              marginLeft: -face.width/2, marginTop: -face.height/2,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
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

        {/* Right Column — 3D Floating Boxes */}
        <div className="relative h-[500px] hidden lg:block" style={{ perspective: 800 }}>
          {/* Ambient Light */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(600px circle at 50% 50%, rgba(37,99,235,0.07), transparent)',
          }} />

          {/* Floating Boxes */}
          <CSS3DBox size={[120, 100, 90]} color="#A07820" position={[-60, 20, 0]} rotation={[-10, 15, 0]} animClass="animate-[spin_18s_linear_infinite]" animDelay={0.6} />
          <CSS3DBox size={[80, 70, 65]} color="#2563EBcc" position={[120, -80, 0]} rotation={[15, -20, 0]} animClass="animate-[spin_12s_linear_infinite_reverse]" animDelay={0.75} />
          <CSS3DBox size={[55, 50, 48]} color="#06B6D499" position={[160, 100, 0]} rotation={[0, 0, 0]} animClass="animate-[spin_22s_linear_infinite]" animDelay={0.9} />
          <CSS3DBox size={[120, 100, 90]} color="transparent" position={[80, -40, 0]} rotation={[0, 0, 0]} animClass="animate-[spin_30s_linear_infinite]" animDelay={1.05} />

          <Particles />

          {/* Depth Fog */}
          <div className="absolute bottom-0 left-0 right-0 h-[180px] pointer-events-none"
            style={{ background: 'linear-gradient(transparent, var(--void))' }} />
        </div>
      </div>

      <ScrollHint />
    </section>
  )
}
