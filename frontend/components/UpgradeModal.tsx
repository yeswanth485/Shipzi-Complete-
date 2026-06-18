'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Check, FlaskConical, Building2 } from 'lucide-react'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { useSubscription } from '@/context/SubscriptionContext'
import { useUser } from '@/context/UserContext'
import { auth } from '@/lib/firebase'

interface UpgradeModalProps {
  show: boolean
  onClose: () => void
  reason?: string
}

type PlanId = 'pro' | 'enterprise'

const PLANS = {
  pro: {
    id: 'pro' as PlanId,
    name: 'Pro Plan',
    price: 2499,
    pricePaise: 249900,
    period: '/month',
    description: 'For growing logistics teams',
    features: [
      'Unlimited optimizations per month',
      'Up to 10,000 rows per CSV upload',
      'Priority AI-powered optimization',
      'Advanced analytics & reports',
      'ESG sustainability reports',
      'Priority support',
    ],
    color: '#2563EB',
    gradient: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(6,182,212,0.2))',
    border: 'rgba(37,99,235,0.3)',
  },
  enterprise: {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    price: 9999,
    pricePaise: 999900,
    period: '/month',
    description: 'For large-scale operations',
    features: [
      'Everything in Pro',
      'Unlimited rows per upload',
      'Custom box size catalog',
      'Multi-warehouse support',
      'Dedicated account manager',
      'Custom API integrations',
      'SLA guarantee',
    ],
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.2))',
    border: 'rgba(139,92,246,0.3)',
  },
}

export default function UpgradeModal({ show, onClose, reason }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro')
  const [showPayment, setShowPayment] = useState(false)
  const [testUpgrading, setTestUpgrading] = useState(false)
  const { refreshSubscription } = useSubscription()
  const { companyId } = useUser()

  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  const plan = PLANS[selectedPlan]

  const handleSelectPlan = (planId: PlanId) => {
    setSelectedPlan(planId)
    setShowPayment(true)
  }

  const handlePaymentSuccess = async (paymentId: string) => {
    // Activate subscription via backend endpoint with correct plan
    try {
      const token = await auth.currentUser?.getIdToken()
      if (token) {
        const res = await fetch('/api/subscription/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ plan_id: selectedPlan }),
        })
        const data = await res.json()
        console.log('Subscription activation result:', data)
      }
    } catch (e) {
      // Post-payment activation failed — non-fatal, subscription will sync on next refresh
    }
    setShowPayment(false)
    onClose()
    // Refresh with a small delay to allow backend to process
    setTimeout(async () => {
      await refreshSubscription()
    }, 1000)
  }

  const handleTestUpgrade = async (planId: PlanId) => {
    if (!companyId) return
    setTestUpgrading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/test-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId, company_id: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test upgrade failed')
      await refreshSubscription()
      onClose()
    } catch (err) {
      // Test upgrade failed — user will see button reset
    } finally {
      setTestUpgrading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {show && !showPayment && (
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
              className="w-full max-w-2xl rounded-2xl overflow-hidden relative"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
              onClick={e => e.stopPropagation()}>

              <div className="h-1" style={{ background: 'linear-gradient(90deg, #2563EB, #06B6D4, #10B981, #8B5CF6)' }} />

              <div className="p-6">
                <button onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>

                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(37,99,235,0.3)' }}>
                    <Zap size={24} color="var(--accent-primary)" />
                  </div>
                  <h2 className="font-syne font-bold text-xl text-white mb-2">Choose Your Plan</h2>
                  {reason && (
                    <p className="text-sm px-4" style={{ color: 'var(--text-secondary)' }}>{reason}</p>
                  )}
                </div>

                {/* Plan Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {Object.values(PLANS).map((p) => (
                    <div key={p.id}
                      className="rounded-xl p-5 cursor-pointer transition-all"
                      style={{
                        background: selectedPlan === p.id ? p.gradient : 'rgba(17,22,32,0.4)',
                        border: `2px solid ${selectedPlan === p.id ? p.border : 'var(--border-subtle)'}`,
                      }}
                      onClick={() => setSelectedPlan(p.id)}>
                      <div className="flex items-center gap-2 mb-3">
                        {p.id === 'enterprise' ? (
                          <Building2 size={18} style={{ color: p.color }} />
                        ) : (
                          <Zap size={18} style={{ color: p.color }} />
                        )}
                        <span className="font-syne font-bold text-white">{p.name}</span>
                      </div>
                      <div className="mb-3">
                        <span className="font-syne font-bold text-2xl text-white">₹{p.price.toLocaleString('en-IN')}</span>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{p.period}</span>
                      </div>
                      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                      <div className="space-y-2">
                        {p.features.slice(0, 4).map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check size={12} style={{ color: 'var(--accent-success)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                          </div>
                        ))}
                        {p.features.length > 4 && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            +{p.features.length - 4} more features
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="btn-ghost flex-1 justify-center"
                    style={{ padding: '12px', fontSize: 14 }}>
                    Maybe Later
                  </button>
                  <button onClick={() => handleSelectPlan(selectedPlan)}
                    className="btn-primary flex-1 justify-center"
                    style={{ padding: '12px', fontSize: 14 }}>
                    Upgrade to {plan.name} →
                  </button>
                </div>

                {/* Test mode */}
                {isTestMode && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <FlaskConical size={14} style={{ color: 'var(--accent-warning)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--accent-warning)' }}>Test Mode — Skip Payment</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestUpgrade('pro')}
                        disabled={testUpgrading}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--accent-primary)' }}>
                        {testUpgrading ? 'Upgrading...' : 'Test Pro'}
                      </button>
                      <button
                        onClick={() => handleTestUpgrade('enterprise')}
                        disabled={testUpgrading}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                        {testUpgrading ? 'Upgrading...' : 'Test Enterprise'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPayment && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          planId={plan.id}
          planName={plan.name}
          amount={plan.pricePaise}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  )
}
