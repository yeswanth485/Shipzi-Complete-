'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { SectionLabel, ScrollFadeIn } from './utils'

const plans = [
  {
    name: 'Free',
    tagline: 'Try it out, no risk',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { text: '50 optimizations/month', included: true },
      { text: '1 user', included: true },
      { text: 'CSV upload (500 rows max)', included: true },
      { text: 'Basic box catalog', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Bulk processing', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup',
    ghost: true,
    featured: false,
  },
  {
    name: 'Pro',
    tagline: 'For growing teams',
    monthlyPrice: 2499,
    annualPrice: 1999,
    features: [
      { text: '5,000 optimizations/month', included: true },
      { text: '10 users', included: true },
      { text: 'Bulk CSV up to 10,000 rows', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'AI insights + reasons', included: true },
      { text: '3D box visualization', included: true },
      { text: 'Priority email support', included: true },
      { text: 'SSO', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    ctaHref: '/signup',
    ghost: false,
    featured: true,
  },
  {
    name: 'Max',
    tagline: 'Enterprise scale',
    monthlyPrice: 9999,
    annualPrice: 7999,
    features: [
      { text: 'Unlimited optimizations', included: true },
      { text: 'Unlimited users', included: true },
      { text: 'Bulk CSV: no row limit', included: true },
      { text: 'All Pro features', included: true },
      { text: 'SSO (SAML/OIDC)', included: true },
      { text: 'REST API access', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@shipzi.com',
    ghost: true,
    featured: false,
  },
]

const comparisonRows = [
  { category: 'OPTIMIZATION', rows: [
    { label: 'Monthly limit', values: ['50', '5,000', 'Unlimited'] },
    { label: 'Max CSV rows', values: ['500', '10,000', 'Unlimited'] },
    { label: 'Fragility scoring', values: ['✓', '✓', '✓'] },
  ]},
  { category: 'ANALYTICS', rows: [
    { label: 'Basic dashboard', values: ['✓', '✓', '✓'] },
    { label: 'AI insights', values: ['✗', '✓', '✓'] },
  ]},
  { category: 'INTEGRATIONS', rows: [
    { label: 'API access', values: ['✗', '✗', '✓'] },
    { label: 'SSO', values: ['✗', '✗', '✓'] },
  ]},
  { category: 'SUPPORT', rows: [
    { label: 'Email support', values: ['✓', 'Priority', 'Dedicated'] },
  ]},
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  return (
    <section id="pricing" className="py-24 px-6" style={{ background: 'var(--void)' }}>
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <SectionLabel text="PRICING" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Simple, Transparent Pricing
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Start free. Scale as you grow. No hidden fees, no per-seat charges, no surprise bills.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="relative flex p-1 rounded-full" style={{ background: 'var(--elevated)', border: '1px solid var(--border)', width: 240, height: 44 }}>
            <motion.div
              className="absolute top-1 bottom-1 rounded-full"
              style={{ background: 'var(--blue)', width: 'calc(50% - 4px)' }}
              animate={{ x: annual ? '100%' : '0%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
            <button onClick={() => setAnnual(false)} className="flex-1 relative z-10 text-sm font-medium rounded-full transition-colors"
              style={{ color: !annual ? '#fff' : 'var(--text-secondary)' }}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)} className="flex-1 relative z-10 text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-1"
              style={{ color: annual ? '#fff' : 'var(--text-secondary)' }}>
              Annual
              {annual && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--green)', color: '#fff', fontSize: 10 }}>
                  Save 20%
                </motion.span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start mb-12">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 60, x: i === 0 ? -80 : i === 2 ? 80 : 0 }}
              whileInView={{ opacity: 1, y: plan.featured ? -20 : 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-8 relative"
              style={plan.featured ? { transform: 'translateY(-20px)' } : {}}
            >
              {/* Featured Badge */}
              {plan.featured && (
                <motion.div
                  initial={{ y: -24, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-bold uppercase tracking-wide"
                  style={{ background: 'var(--blue)', color: '#fff' }}
                >
                  Most Popular
                </motion.div>
              )}

              <h3 className="font-syne font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{plan.tagline}</p>

              {/* Price */}
              <div className="mb-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={annual ? 'annual' : 'monthly'}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0 }}
                    className="font-syne font-bold leading-none"
                    style={{ fontSize: plan.featured ? 52 : 48, color: plan.featured ? 'var(--blue)' : 'var(--text-primary)', transformOrigin: 'bottom' }}
                  >
                    ₹{(annual ? plan.annualPrice : plan.monthlyPrice).toLocaleString('en-IN')}
                  </motion.div>
                </AnimatePresence>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>/month</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm" style={{ color: f.included ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    <span style={{ color: f.included ? 'var(--green)' : 'var(--text-muted)' }}>{f.included ? '✓' : '✗'}</span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={plan.ctaHref}
                className={plan.ghost ? 'btn-ghost w-full justify-center' : 'btn-primary w-full justify-center'}
                style={{ textDecoration: 'none', display: 'flex' }}>
                {plan.cta}
              </Link>

              {plan.featured && (
                <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  14-day free trial · No credit card required
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Comparison Toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--blue)' }}
          >
            {showComparison ? 'Hide' : 'See Full'} Feature Comparison ↓
          </button>
        </div>

        {/* Comparison Table */}
        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-8"
            >
              <div className="glass-card p-6">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 pb-3 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div />
                  <div className="text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Free</div>
                  <div className="text-center text-sm font-medium" style={{ color: 'var(--blue)' }}>Pro</div>
                  <div className="text-center text-sm font-medium" style={{ color: 'var(--cyan)' }}>Max</div>
                </div>

                {comparisonRows.map((cat, ci) => (
                  <div key={ci} className="mb-4">
                    <div className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                      {cat.category}
                    </div>
                    {cat.rows.map((row, ri) => (
                      <motion.div
                        key={ri}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: ci * 0.1 + ri * 0.06 }}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 py-2 text-sm"
                        style={{ borderBottom: '1px solid rgba(30,37,51,0.5)' }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                        {row.values.map((v, vi) => (
                          <div key={vi} className="text-center" style={{ color: v === '✓' ? 'var(--green)' : v === '✗' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                            {v}
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
