'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'

// Dynamically import Three.js scene to avoid SSR issues
const HeroScene = dynamic(() => import('@/components/HeroScene'), { ssr: false })

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const end = value
    const duration = 2000
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(animate)
      else setCount(end)
    }
    requestAnimationFrame(animate)
  }, [inView, value])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// ── Feature Card ──────────────────────────────────────────────────
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card p-6 cursor-default"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
        style={{ background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
        {icon}
      </div>
      <h3 className="font-syne text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </motion.div>
  )
}

// ── Testimonial Card ──────────────────────────────────────────────
function TestimonialCard({ quote, name, title, company, initials, color }: {
  quote: string; name: string; title: string; company: string; initials: string; color: string
}) {
  return (
    <div className="glass-card p-6">
      <p className="text-sm leading-relaxed mb-6 italic" style={{ color: 'var(--text-secondary)' }}>"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: color }}>
          {initials}
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{title}, {company}</div>
        </div>
      </div>
    </div>
  )
}

// ── Demo Step Component ───────────────────────────────────────────
function DemoSection() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % 3), 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>Live Demo</p>
          <h2 className="font-syne text-4xl font-bold text-white">See Shipzi In Action</h2>
        </motion.div>

        <div className="flex justify-center gap-2 mb-8">
          {['Upload Data', 'AI Optimizes', 'Get Results'].map((label, i) => (
            <button key={i} onClick={() => setStep(i)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
              style={{
                background: step === i ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: step === i ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${step === i ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              }}>
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="glass-card p-8 max-w-3xl mx-auto">
          {step === 0 && (
            <div>
              <h3 className="font-syne text-xl font-semibold text-white mb-4">📂 Upload Product Data</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Product', 'L×W×H (cm)', 'Weight', 'Fragility', 'Zone'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Wireless Earbuds', '12×8×6', '0.45kg', 'High', 'Zone 2'],
                      ['Phone Case', '18×10×3', '0.18kg', 'Low', 'Zone 1'],
                      ['Smart Watch', '14×12×7', '0.32kg', 'Medium', 'Zone 3'],
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {row.map((cell, j) => (
                          <td key={j} className="py-3 pr-4" style={{ color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center py-4">
              <h3 className="font-syne text-xl font-semibold text-white mb-6">🧠 AI Analyzing & Optimizing</h3>
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl animate-spin"
                style={{ border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }}>
              </div>
              {['Fetching product data...', 'Loading box catalog...', 'Running FFD Algorithm...', 'Calculating savings...', 'Generating AI recommendations...'].map((step, i) => (
                <div key={i} className="flex items-center gap-3 mb-2 max-w-xs mx-auto text-left">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)' }}>✓</div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step}</span>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-syne text-xl font-semibold text-white mb-4">✅ Optimization Results</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Recommended Box</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Small Parcel</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>20×15×10 cm</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Box Utilization</p>
                  <p className="font-semibold text-2xl" style={{ color: 'var(--accent-success)' }}>85%</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Savings / Shipment</p>
                  <p className="font-semibold text-xl" style={{ color: 'var(--accent-success)' }}>$3.40</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-void)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Sustainability</p>
                  <p className="font-semibold text-xl" style={{ color: 'var(--accent-secondary)' }}>78/100</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

// ── MAIN LANDING PAGE ─────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: 'rgba(4, 6, 8, 0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border-subtle)',
          height: 72,
          boxShadow: scrolled ? '0 0 32px rgba(37,99,235,0.15)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/shipzi-logo.png"
              alt="Shipzi Logo"
              width={48}
              height={48}
              className="object-contain"
              style={{ imageRendering: 'high-quality' }}
              priority
            />
            <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
          </div>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing', 'Sustainability'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                {item}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden md:flex" style={{ padding: '8px 20px', fontSize: 14 }}>
              Log In
            </Link>
            <Link href="/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex items-center pt-[72px]">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-72px)]">
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="py-16">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--accent-secondary)' }}>
                🚀 AI-Powered Logistics Intelligence
              </div>

              {/* Headline */}
              <h1 className="font-syne font-bold mb-6 leading-tight" style={{ fontSize: 'clamp(36px, 5vw, 60px)', color: 'var(--text-primary)' }}>
                Optimize Every Shipment.{' '}
                <span style={{ color: 'var(--accent-primary)', textDecoration: 'underline', textDecorationStyle: 'wavy', textDecorationColor: 'var(--accent-secondary)' }}>
                  Reduce Every Cost.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg mb-8 leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
                Shipzi intelligently analyzes product dimensions, weight, fragility, and packaging inventory to recommend the most efficient box for every shipment — saving money and the planet.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 mb-10">
                <Link href="/signup" className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                  Start Free Trial
                </Link>
                <button className="btn-ghost" style={{ padding: '14px 32px', fontSize: 16 }}>
                  ▶ Watch Demo
                </button>
              </div>

              {/* Trust Row */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['#2563EB', '#06B6D4', '#10B981', '#F59E0B'].map((color, i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: color, borderColor: 'var(--bg-void)' }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 text-yellow-400 text-sm">★★★★★</div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Trusted by 500+ logistics teams</p>
                </div>
              </div>
            </motion.div>

            {/* Right: 3D Scene */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="h-[500px] hidden lg:block">
              <HeroScene />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-12" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 2400000, label: 'Optimizations Processed', suffix: '+' },
              { value: 18000000, label: 'Total Saved for Clients', prefix: '$', suffix: '+' },
              { value: 500000, label: 'Shipments Optimized', suffix: 'K+' },
              { value: 340, label: 'CO₂ Reduced (Tonnes)', suffix: 'T' },
            ].map(({ value, label, suffix, prefix }, i) => (
              <div key={i}>
                <div className="font-syne font-bold text-3xl md:text-4xl mb-1" style={{ color: 'var(--accent-primary)' }}>
                  <AnimatedCounter
                    value={i === 1 ? 18 : i === 2 ? 500 : value}
                    prefix={prefix}
                    suffix={i === 1 ? 'M+' : suffix}
                  />
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>Platform Features</p>
            <h2 className="font-syne text-4xl md:text-5xl font-bold text-white">Everything You Need to Ship Smarter</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📦', title: 'Packaging Optimization', description: 'FFD algorithm + AI selects the perfect-fit box for every SKU automatically, minimizing void fill and dimensional weight.' },
              { icon: '💰', title: 'Cost Reduction Engine', description: 'Minimizes dimensional weight charges and eliminates oversized packaging waste, cutting shipping costs by up to 23%.' },
              { icon: '🌱', title: 'Sustainability Tracking', description: 'Measure carbon reduction, recyclable material usage, and packaging waste in real time with ESG compliance reports.' },
              { icon: '🧠', title: 'Analytics Intelligence', description: 'Deep operational dashboards reveal cost patterns, carrier performance, and efficiency trends across all shipments.' },
              { icon: '🔄', title: '3D Box Visualization', description: 'See exactly how products fit inside boxes with interactive 3D rendering before you ship — zero surprises.' },
              { icon: '⚡', title: 'Bulk CSV Processing', description: 'Upload thousands of SKUs at once. Get AI-powered optimized recommendations in under 60 seconds.' },
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <DemoSection />

      {/* ── MARKET BANNER ── */}
      <section id="how-it-works" className="py-16 px-6" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(6,182,212,0.05) 100%)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-center mb-8" style={{ color: 'var(--accent-secondary)' }}>Industry Context</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              'AI packaging market growing at 19.9% CAGR through 2030',
              'E-commerce packaging segment growing at 25% CAGR (2026–2030)',
              'Average 23% cost reduction reported by optimization platform users',
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>Customer Stories</p>
            <h2 className="font-syne text-4xl font-bold text-white">Trusted by Logistics Leaders</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Shipzi cut our shipping costs by 19% in the first month. The box utilization reports alone paid for the entire annual subscription."
              name="Arjun Mehta" title="Head of Operations" company="NovaTrade" initials="AM" color="#2563EB"
            />
            <TestimonialCard
              quote="The 3D visualization feature is a game-changer. Our warehouse team can now see exactly how products should be packed before touching the box."
              name="Priya Nair" title="Logistics Director" company="ElectroPlex" initials="PN" color="#06B6D4"
            />
            <TestimonialCard
              quote="We went from spending hours on packaging decisions to having AI handle it in seconds. Shipzi is now mission-critical infrastructure for us."
              name="Rahul Sharma" title="VP Supply Chain" company="QuickCart" initials="RS" color="#10B981"
            />
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>Pricing</p>
            <h2 className="font-syne text-4xl font-bold text-white">Simple, Transparent Pricing</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="glass-card p-8">
              <h3 className="font-syne text-xl font-bold text-white mb-1">Free</h3>
              <div className="font-syne text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>$0</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>per month</p>
              <ul className="space-y-3 mb-8">
                {['100 shipments/month', '1 user', 'Basic optimization', 'CSV upload', 'Email support'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-success)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-ghost w-full text-center block" style={{ textDecoration: 'none' }}>
                Get Started
              </Link>
            </div>

            {/* Growth (highlighted) */}
            <div className="p-8 rounded-2xl relative" style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '2px solid var(--accent-primary)',
              boxShadow: '0 0 40px rgba(37, 99, 235, 0.2)',
            }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{ background: 'var(--accent-primary)', color: 'white' }}>
                Most Popular
              </div>
              <h3 className="font-syne text-xl font-bold text-white mb-1">Growth</h3>
              <div className="font-syne text-4xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>$149</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>per month</p>
              <ul className="space-y-3 mb-8">
                {['5,000 shipments/month', '10 users', 'Full AI optimization', 'CSV bulk upload', 'Advanced analytics', '3D box viewer', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-success)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary w-full text-center block" style={{ textDecoration: 'none' }}>
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass-card p-8">
              <h3 className="font-syne text-xl font-bold text-white mb-1">Enterprise</h3>
              <div className="font-syne text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Custom</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>contact sales</p>
              <ul className="space-y-3 mb-8">
                {['Unlimited shipments', 'Unlimited users', 'SSO / SAML', 'Dedicated API access', 'Custom integrations', 'SLA guarantee', 'Dedicated CSM'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-success)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:sales@shipzi.com" className="btn-ghost w-full text-center block" style={{ textDecoration: 'none' }}>
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-syne text-4xl md:text-5xl font-bold text-white mb-6">Ready to Eliminate Shipping Waste?</h2>
          <p className="text-lg mb-8 text-white/80">Join 500+ logistics teams already saving with Shipzi AI optimization.</p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105"
            style={{ background: 'white', color: '#2563EB' }}>
            Start Free Trial — No Credit Card Required
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6" style={{ background: 'var(--bg-void)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/shipzi-logo.png" alt="Shipzi" width={36} height={36} className="object-contain" />
                <span className="font-syne font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Logistics • Ecommerce • Delivered</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 Shipzi Inc. All rights reserved.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'How It Works', 'Pricing', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Built for the future of logistics</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              {['𝕏', 'in', 'gh'].map((icon, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
