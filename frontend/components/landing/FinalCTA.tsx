'use client'
import { useMemo } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { SectionLabel } from './utils'

function ParticleBurst() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      angle: (i / 30) * 360,
      distance: 80 + Math.random() * 200,
      color: Math.random() > 0.5 ? '#2563EB' : '#10B981',
    })), [])

  if (!inView) return null

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: '50%', top: '50%',
            width: 3, height: 3,
            background: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: Math.cos(p.angle * Math.PI / 180) * p.distance,
            y: Math.sin(p.angle * Math.PI / 180) * p.distance - 40,
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 3, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function FinalCTA() {
  return (
    <>
      {/* CTA Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden" style={{ background: 'var(--void)' }}>
        {/* Animated Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full" style={{
            width: 600, height: 600, left: '20%', top: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(37,99,235,0.16)', filter: 'blur(80px)',
            animation: 'orbDrift1 14s ease-in-out infinite',
          }} />
          <div className="absolute rounded-full" style={{
            width: 400, height: 400, right: '10%', top: '45%',
            background: 'rgba(6,182,212,0.10)', filter: 'blur(80px)',
            animation: 'orbDrift2 18s ease-in-out infinite 3s',
          }} />
          <div className="absolute rounded-full" style={{
            width: 320, height: 320, left: '50%', top: '55%', transform: 'translate(-50%, -50%)',
            background: 'rgba(16,185,129,0.07)', filter: 'blur(80px)',
            animation: 'orbDrift3 11s ease-in-out infinite 6s',
          }} />
          <div className="absolute inset-0" style={{ background: 'rgba(4,6,8,0.72)' }} />
        </div>

        <ParticleBurst />

        <div className="relative z-10 text-center px-6 max-w-[680px]">
          <SectionLabel text="START TODAY" />

          <h2 className="font-syne font-bold text-[clamp(32px,5vw,54px)] leading-[1.12] mb-5">
            {'Start Optimizing Every Shipment Today'.split(' ').map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={word === 'Today' ? { color: 'var(--blue)' } : {}}
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="text-lg mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            Join 500+ logistics teams shipping smarter.
            <br />First 50 optimizations free. No credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-4 mb-7"
          >
            <Link href="/signup"
              className="btn-primary text-base px-10 py-4"
              style={{ animation: 'glowPulse 2.5s ease-in-out infinite' }}>
              Start Free Trial
            </Link>
            <button className="btn-ghost text-base px-10 py-4">
              Book a Demo
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.0 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {['🔒 SOC2 Compliant', '🔒 GDPR Ready', '⚡ Setup in 5 Minutes', '✓ Cancel Anytime'].map((badge, i) => (
              <span key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>{badge}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-gradient-divider" style={{ background: 'linear-gradient(var(--void), var(--surface))' }} />

      {/* Footer */}
      <footer className="pt-16 pb-0 px-6" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[1100px] mx-auto">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12 px-0 md:px-[80px]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={36} height={36} className="object-contain" />
                <span className="font-syne font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
              </div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>AI-Powered Logistics Intelligence</p>
              <p className="text-xs leading-relaxed max-w-[260px] mb-5" style={{ color: 'var(--text-muted)' }}>
                Optimize every shipment. Reduce every cost. Smarter packaging decisions for modern logistics teams.
              </p>

              {/* Social */}
              <div className="flex gap-3 mb-5">
                {['Li', 'X', 'Gh'].map((icon, i) => (
                  <a key={i} href="#"
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                    style={{ background: 'var(--elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    {icon}
                  </a>
                ))}
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 Shipzi Inc. All rights reserved.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'How It Works', 'Pricing', 'Changelog', 'API Documentation'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-all hover:translate-x-0.5 inline-block"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>Company</h4>
              <ul className="space-y-2.5">
                {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-all hover:translate-x-0.5 inline-block"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security', 'GDPR'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-all hover:translate-x-0.5 inline-block"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: 'var(--border)' }} />

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between py-5 px-0 md:px-[80px]">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Made with ❤️ for logistics professionals worldwide</p>
            <div className="flex items-center gap-2 text-xs mt-3 md:mt-0" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
              Status: All Systems Operational
            </div>
            <p className="text-xs mt-3 md:mt-0" style={{ color: 'var(--text-muted)' }}>v1.0 — Last updated Jun 2026</p>
          </div>
        </div>
      </footer>
    </>
  )
}
