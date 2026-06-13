'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Check } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  show: boolean
  onClose: () => void
  reason?: string
}

export default function UpgradeModal({ show, onClose, reason }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-2xl overflow-hidden relative"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>

            {/* Gradient accent top */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #2563EB, #06B6D4, #10B981)' }} />

            <div className="p-6">
              <button onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(37,99,235,0.3)' }}>
                  <Zap size={24} color="var(--accent-primary)" />
                </div>
                <h2 className="font-syne font-bold text-xl text-white mb-2">Upgrade to Pro</h2>
                {reason && (
                  <p className="text-sm px-4" style={{ color: 'var(--text-secondary)' }}>{reason}</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {[
                  'Unlimited optimizations per month',
                  'Up to 10,000 rows per CSV upload',
                  'Priority AI-powered optimization',
                  'Advanced analytics & reports',
                  'ESG sustainability reports',
                  'Priority support',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <Check size={12} color="var(--accent-success)" />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="glass-card p-4 text-center mb-4"
                style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <div className="font-syne font-bold text-2xl text-white mb-1">$149<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/month</span></div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Growth Plan — Cancel anytime</p>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="btn-ghost flex-1 justify-center"
                  style={{ padding: '10px', fontSize: 13 }}>
                  Maybe Later
                </button>
                <Link href="/dashboard/settings"
                  onClick={onClose}
                  className="btn-primary flex-1 justify-center"
                  style={{ padding: '10px', fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                  Upgrade Now →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
