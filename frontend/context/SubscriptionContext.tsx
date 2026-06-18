'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useUser } from '@/context/UserContext'
import { auth } from '@/lib/firebase'

interface SubscriptionData {
  plan: 'free' | 'growth' | 'enterprise'
  status: string
  current_usage: number
  monthly_shipment_limit: number
  total_optimizations: number
  monthly_optimization_limit: number
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null
  isLoading: boolean
  isPro: boolean
  isFree: boolean
  optimizationsRemaining: number
  canOptimize: boolean
  canUploadRows: (count: number) => { allowed: boolean; reason?: string }
  recordOptimization: (rowCount: number) => Promise<void>
  refreshSubscription: () => Promise<void>
  showUpgradeModal: boolean
  setShowUpgradeModal: (show: boolean) => void
  upgradeReason: string
  setUpgradeReason: (reason: string) => void
}

const FREE_LIMITS = {
  monthly_optimizations: 10,
  max_rows_per_upload: 50,
}

const DEFAULT_SUB: SubscriptionData = {
  plan: 'free',
  status: 'active',
  current_usage: 0,
  monthly_shipment_limit: 100,
  total_optimizations: 0,
  monthly_optimization_limit: FREE_LIMITS.monthly_optimizations,
}

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken()
  } catch {
    return null
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { companyId, isLoading: isUserLoading } = useUser()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')

  const fetchSubscription = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false)
      return
    }
    try {
      const token = await getAuthToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/subscription', { headers })
      const data = await res.json()

      if (data.success && data.data) {
        setSubscription(data.data)
      } else {
        setSubscription(DEFAULT_SUB)
      }
    } catch (err) {
      console.error('Subscription fetch error:', err)
      setSubscription(DEFAULT_SUB)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!isUserLoading) fetchSubscription()
  }, [isUserLoading, fetchSubscription])

  const isPro = subscription?.plan === 'growth' || subscription?.plan === 'enterprise'
  const isFree = !isPro
  const optimizationsRemaining = subscription
    ? Math.max(0, subscription.monthly_optimization_limit - subscription.total_optimizations)
    : FREE_LIMITS.monthly_optimizations
  const canOptimize = optimizationsRemaining > 0

  const canUploadRows = useCallback((count: number) => {
    if (!subscription) return { allowed: true }
    if (isFree && count > FREE_LIMITS.max_rows_per_upload) {
      return {
        allowed: false,
        reason: `Free plan allows up to ${FREE_LIMITS.max_rows_per_upload} rows per upload. You uploaded ${count} rows. Upgrade to Pro for unlimited rows.`,
      }
    }
    if (isFree && optimizationsRemaining <= 0) {
      return {
        allowed: false,
        reason: `You've used all ${FREE_LIMITS.monthly_optimizations} free optimizations this month. Upgrade to Pro for unlimited optimizations.`,
      }
    }
    return { allowed: true }
  }, [subscription, isFree, optimizationsRemaining])

  const recordOptimization = useCallback(async (rowCount: number) => {
    if (!companyId || !subscription) return
    // Just update local state — the real count comes from optimization_runs
    // which is counted by the backend subscription endpoint on every refresh
    const newTotal = subscription.total_optimizations + 1
    setSubscription(prev => prev ? {
      ...prev,
      current_usage: newTotal,
      total_optimizations: newTotal,
    } : prev)
  }, [companyId, subscription])

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isLoading,
      isPro,
      isFree,
      optimizationsRemaining,
      canOptimize,
      canUploadRows,
      recordOptimization,
      refreshSubscription: fetchSubscription,
      showUpgradeModal,
      setShowUpgradeModal,
      upgradeReason,
      setUpgradeReason,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
