'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

import { CustomCursor, ScrollProgress } from '@/components/landing/utils'
import Hero from '@/components/landing/Hero'
import Problem from '@/components/landing/Problem'
import HowItWorks from '@/components/landing/HowItWorks'
import InteractiveDemo from '@/components/landing/InteractiveDemo'
import Features from '@/components/landing/Features'
import AnalyticsPreview from '@/components/landing/AnalyticsPreview'
import Sustainability from '@/components/landing/Sustainability'
import BulkCSV from '@/components/landing/BulkCSV'
import ROICalculator from '@/components/landing/ROICalculator'
import Testimonials from '@/components/landing/Testimonials'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import FinalCTA from '@/components/landing/FinalCTA'

// ── Gradient Divider ──────────────────────────────────────────────
function Divider({ from = 'var(--void)', to = 'var(--surface)' }: { from?: string; to?: string }) {
  return <div className="section-gradient-divider" style={{ background: `linear-gradient(${from}, ${to})` }} />
}

function DividerAlt() {
  return <div className="section-gradient-divider" style={{ background: 'linear-gradient(var(--surface), var(--void))' }} />
}

// ── NAVBAR ────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.nav
      initial={{ y: -68 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(4,6,8,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        height: 68,
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={40} height={40} className="object-contain" priority />
          <span className="font-syne font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
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

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost hidden md:flex" style={{ padding: '8px 20px', fontSize: 14 }}>
            Log In
          </Link>
          <Link href="/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>
            Start Free Trial
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="w-5 h-0.5 rounded" style={{ background: 'var(--text-primary)' }} />
          <div className="w-5 h-0.5 rounded" style={{ background: 'var(--text-primary)' }} />
          <div className="w-3.5 h-0.5 rounded" style={{ background: 'var(--text-primary)' }} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed top-[68px] right-0 bottom-0 w-[280px] p-6 md:hidden"
          style={{ background: 'var(--void)', borderLeft: '1px solid var(--border)', zIndex: 50 }}
        >
          <div className="flex flex-col gap-4">
            {['Features', 'How It Works', 'Pricing', 'Sustainability'].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="text-sm font-medium py-2"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </motion.a>
            ))}
            <div className="h-px my-2" style={{ background: 'var(--border)' }} />
            <Link href="/login" className="btn-ghost text-center" onClick={() => setMenuOpen(false)}>Log In</Link>
            <Link href="/signup" className="btn-primary text-center" onClick={() => setMenuOpen(false)}>Start Free Trial</Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}

// ── MAIN LANDING PAGE ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh' }}>
      <CustomCursor />
      <ScrollProgress />
      <Navbar />

      {/* PROMPT 02 — Hero */}
      <Hero />

      <Divider from="var(--void)" to="var(--surface)" />

      {/* PROMPT 03 — Problem */}
      <Problem />

      <DividerAlt />

      {/* PROMPT 04 — How It Works */}
      <HowItWorks />

      <Divider from="var(--void)" to="var(--void)" />

      {/* PROMPT 05 — Interactive Demo */}
      <InteractiveDemo />

      <Divider from="var(--void)" to="var(--surface)" />

      {/* PROMPT 06 — Features */}
      <Features />

      <DividerAlt />

      {/* PROMPT 07 — Analytics Preview */}
      <AnalyticsPreview />

      <Divider from="var(--void)" to="var(--void)" />

      {/* PROMPT 08 — Sustainability */}
      <Sustainability />

      <Divider from="var(--void)" to="var(--surface)" />

      {/* PROMPT 09 — Bulk CSV */}
      <BulkCSV />

      <DividerAlt />

      {/* PROMPT 10 — ROI Calculator */}
      <ROICalculator />

      <Divider from="var(--void)" to="var(--surface)" />

      {/* PROMPT 11 — Testimonials */}
      <Testimonials />

      <DividerAlt />

      {/* PROMPT 12 — Pricing */}
      <Pricing />

      <Divider from="var(--void)" to="var(--surface)" />

      {/* PROMPT 13 — FAQ */}
      <FAQ />

      <DividerAlt />

      {/* PROMPT 14 — Final CTA + Footer */}
      <FinalCTA />
    </div>
  )
}
