'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionLabel, ScrollFadeIn } from './utils'

const faqsLeft = [
  {
    q: 'How does Shipzi find the right box?',
    a: 'We run a First Fit Decreasing (FFD) algorithm across your entire active box catalog. For each product, the engine tests every catalog box — checking all three dimensions fit the product with the required fragility clearance. Each fitting box is scored by volume (prefer smallest), total cost (box price + dimensional weight × zone rate), and sustainability score. The highest-scoring box wins.',
  },
  {
    q: 'How is shipping cost calculated?',
    a: 'Dimensional weight = (Length × Width × Height) ÷ 5000. This is multiplied by a per-kg zone rate (Zone 1: ₹42/kg through Zone 8: ₹145/kg). Savings = original total cost (current box price + original dim weight shipping) minus optimized total cost (new box price + new dim weight shipping).',
  },
  {
    q: 'Can I upload my own box catalog?',
    a: "Yes — and this is essential for accurate results. In the Box Catalog tab, add every box you actually stock: name, dimensions (L×W×H in cm), max weight, material type, and cost per box. The optimizer exclusively uses boxes marked active in your catalog. If a product cannot fit any catalog box, it returns a 'No Fit' status.",
  },
  {
    q: 'What CSV columns are required?',
    a: "Ten columns are required: product_name, product_length, product_width, product_height, used_box_length, used_box_width, used_box_height, fragility_score (1–10), used_box_price, and shipping_zone (e.g. Zone 3). A downloadable sample CSV is available in the Optimize tab. Rows missing required fields are automatically skipped.",
  },
]

const faqsRight = [
  {
    q: 'What is the fragility score and how does it affect optimization?',
    a: 'Fragility score (1–10) determines the minimum clearance added to your product dimensions before box matching. Score 1–2: no clearance (sturdy items). Score 3–4: 0.5cm per side. Score 5–6: 1cm. Score 7–8: 2cm. Score 9–10: 3–4cm (glass, electronics). A score of 8 on a 12×8×7cm product means the engine looks for boxes ≥16×12×11cm minimum.',
  },
  {
    q: 'How many rows can I upload at once?',
    a: 'The engine handles 10,000+ rows per upload reliably. Rows are processed in chunks of 250 for database performance. Processing time: approximately 4 minutes for 10,000 rows depending on catalog size. One invalid row is individually skipped with an error count — it never stops the rest of the batch.',
  },
  {
    q: 'Where do optimization results go after processing?',
    a: 'Results are saved directly to your Supabase database in the optimized_orders table and appear immediately in the Orders tab. Each result stores: product name, original box dimensions, optimized box recommendation, original price, optimized price, savings, shipping cost, utilization percentage, fit status, and a plain-English optimization reason.',
  },
  {
    q: 'Is there an API? Can I integrate Shipzi with my WMS?',
    a: 'Yes. Your API key is in Settings → API Keys. POST product data to api.shipzi.com/v1/optimize and receive optimization results in JSON. The API supports single-product and batch requests (up to 500 rows per call). API access is available on the Max plan. We also offer Shopify, WooCommerce, and Shiprocket integrations.',
  },
]

function FAQItem({ item, isOpen, onToggle }: { item: { q: string; a: string }; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left transition-colors"
        style={{ color: isOpen ? 'var(--blue)' : 'var(--text-primary)' }}
      >
        <span className="text-sm font-medium pr-4">{item.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0, borderColor: isOpen ? 'var(--blue)' : 'var(--border)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs"
          style={{ color: isOpen ? 'var(--blue)' : 'var(--text-muted)' }}
        >
          +
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', borderLeft: '2px solid var(--blue)' }}>
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openLeft, setOpenLeft] = useState(0)
  const [openRight, setOpenRight] = useState(-1)

  const handleLeft = (index: number) => {
    setOpenLeft(openLeft === index ? -1 : index)
  }

  const handleRight = (index: number) => {
    setOpenRight(openRight === index ? -1 : index)
  }

  return (
    <section className="py-24 px-6" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="FAQ" />
          <h2 className="font-syne font-bold text-[clamp(28px,4vw,40px)] leading-[1.18] mb-4">
            Everything You Need to Know
          </h2>
          <ScrollFadeIn delay={0.2}>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Quick answers to the most common questions about Shipzi.
            </p>
          </ScrollFadeIn>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <ScrollFadeIn direction="left" delay={0.1}>
            <div>
              {faqsLeft.map((item, i) => (
                <FAQItem key={i} item={item} isOpen={openLeft === i} onToggle={() => handleLeft(i)} />
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn direction="right" delay={0.1}>
            <div>
              {faqsRight.map((item, i) => (
                <FAQItem key={i} item={item} isOpen={openRight === i} onToggle={() => handleRight(i)} />
              ))}
            </div>
          </ScrollFadeIn>
        </div>

        {/* Still Have Questions */}
        <ScrollFadeIn delay={0.3}>
          <div className="glass-card p-8 max-w-[520px] mx-auto text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-syne font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
              Still have questions?
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Our team responds within 2 hours during business hours.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn-primary">Chat with Us</button>
              <button className="btn-ghost">Email Support</button>
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  )
}