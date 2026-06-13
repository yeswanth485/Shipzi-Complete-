'use client'
import { SectionLabel, ScrollFadeIn, TiltCard } from './utils'

const features = [
  {
    icon: '📦',
    title: 'AI Packaging Optimization',
    body: 'FFD algorithm tests every catalog box for every product. Picks the smallest box that safely fits, every time.',
    pill: 'FFD Algorithm',
    color: '#2563EB',
  },
  {
    icon: '💰',
    title: 'Shipping Cost Reduction',
    body: 'Minimize dimensional weight charges across all carrier zones. Average customer saves 23% on packaging costs.',
    pill: 'Avg 23% Savings',
    color: '#10B981',
  },
  {
    icon: '📋',
    title: 'Live Box Catalog',
    body: 'Add your real inventory with exact dimensions, costs, and materials. Optimizer only recommends boxes you actually stock.',
    pill: 'Your Inventory Only',
    color: '#06B6D4',
  },
  {
    icon: '🌱',
    title: 'Sustainability Tracking',
    body: 'Track CO₂ reduction, recyclable material percentage, packaging waste metrics. Export ESG reports.',
    pill: 'ESG Ready',
    color: '#10B981',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    body: 'Real-time KPIs: total savings, utilization rates, sustainability scores, zone breakdown, AI-generated insights.',
    pill: 'Real-Time KPIs',
    color: '#8B5CF6',
  },
  {
    icon: '⚡',
    title: 'Bulk CSV Processing',
    body: 'Upload 10,000+ SKUs in one file. Processed in chunks of 250. One invalid row never stops the batch.',
    pill: '10,000+ Rows',
    color: '#F59E0B',
  },
]

const integrations = ['Shopify', 'WooCommerce', 'Amazon', 'Shiprocket', 'Delhivery', 'Custom API']

export default function Features() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="CAPABILITIES" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4" style={{ color: 'var(--text-primary)' }}>
            Everything You Need to Ship Smarter
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base max-w-[640px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
              A complete AI-powered platform — from CSV upload to ESG reporting.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Feature Cards — 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <ScrollFadeIn key={i} delay={i < 3 ? 0.2 + i * 0.1 : 0.5 + (i - 3) * 0.1}>
              <TiltCard borderColor={f.color} className="h-full">
                <div className="p-7">
                  {/* Icon */}
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-2xl mb-4"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}33` }}
                  >
                    {f.icon}
                  </div>

                  {/* Title */}
                  <h4 className="font-syne font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                    {f.title}
                  </h4>

                  {/* Body */}
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {f.body}
                  </p>

                  {/* Pill */}
                  <div
                    className="inline-block text-xs font-medium px-3 py-1 rounded-full"
                    style={{ background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}33` }}
                  >
                    {f.pill}
                  </div>
                </div>
              </TiltCard>
            </ScrollFadeIn>
          ))}
        </div>

        {/* Integration Strip */}
        <ScrollFadeIn delay={0.3} className="mt-16">
          <div className="py-6 px-8 rounded-xl" style={{ background: 'var(--elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-widest text-center mb-5" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              Integrates With Your Stack
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {integrations.map((name, i) => (
                <div
                  key={i}
                  className="px-5 py-3 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ background: 'var(--void)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
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