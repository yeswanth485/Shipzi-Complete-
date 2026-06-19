'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useUser } from '@/context/UserContext'
import { SubscriptionProvider, useSubscription } from '@/context/SubscriptionContext'
import UpgradeModal from '@/components/UpgradeModal'
import {
  LayoutDashboard, Zap, Package, Truck, Box, BarChart3, Leaf, Settings, Clock,
  Menu, X, Bell, Search, LogOut, ChevronDown, Crown
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/optimize', label: 'Optimize', icon: Zap },
  { href: '/dashboard/orders', label: 'Orders', icon: Package },
  { href: '/dashboard/shipments', label: 'Shipments', icon: Truck },
  { href: '/dashboard/history', label: 'History', icon: Clock },
  { href: '/dashboard/box-catalog', label: 'Box Catalog', icon: Box },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/sustainability', label: 'Sustainability', icon: Leaf },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/optimize': 'Optimize Shipments',
  '/dashboard/orders': 'Optimized Orders',
  '/dashboard/shipments': 'Shipments',
  '/dashboard/history': 'Optimization History',
  '/dashboard/box-catalog': 'Box Catalog',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/sustainability': 'Sustainability',
  '/dashboard/settings': 'Settings',
}

function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) {
    return <Image src={url} alt={name ?? 'User'} width={size} height={size} className="rounded-full object-cover" />
  }
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--accent-primary)' }}>
      {initials}
    </div>
  )
}

function Sidebar({ mobile, onClose, onLogout }: { mobile?: boolean; onClose?: () => void; onLogout: () => void }) {
  const pathname = usePathname()
  const { userData } = useUser()
  const { subscription, isPro, optimizationsRemaining, setShowUpgradeModal, setUpgradeReason } = useSubscription()

  return (
    <div className="flex flex-col h-full"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', width: '100%' }}>

      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-[72px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/shipzi-logo.png" alt="Shipzi Logo" width={36} height={36} className="object-contain" />
          <span className="font-syne font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Shipzi</span>
        </Link>
        {mobile && (
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Plan Badge */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
        style={{
          background: isPro ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 100%)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isPro ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
        }}>
        <Crown size={14} color={isPro ? 'var(--accent-success)' : 'var(--text-muted)'} />
        <span className="text-xs font-medium" style={{ color: isPro ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
          {isPro ? 'Pro Plan' : 'Free Plan'}
        </span>
        {!isPro && subscription && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {optimizationsRemaining}/10 opts left
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link key={href} href={href}
              onClick={mobile ? onClose : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 relative"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}>
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Upgrade Banner — only for free users */}
      {!isPro && (
        <div className="mx-3 mb-3 p-4 rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(37,99,235,0.3)' }}>
          <p className="text-xs font-bold text-white mb-1">⚡ Upgrade to Pro</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Unlimited optimizations & rows</p>
          <button onClick={() => { setUpgradeReason('Upgrade for unlimited optimizations and rows'); setShowUpgradeModal(true) }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
            Upgrade Now
          </button>
        </div>
      )}

      {/* User Profile */}
      <div className="p-4 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Avatar name={userData?.full_name} url={userData?.avatar_url} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userData?.full_name ?? 'User'}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{userData?.email}</p>
        </div>
        <button onClick={onLogout} className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { userData } = useUser()
  const { isPro, showUpgradeModal, setShowUpgradeModal, upgradeReason, setUpgradeReason } = useSubscription()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarDropdown, setAvatarDropdown] = useState(false)

  useEffect(() => {
    if (!avatarDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-avatar-dropdown]')) setAvatarDropdown(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [avatarDropdown])

  // Auth guards removed — AuthGate + useAuthRedirect handle all routing now.

  const pageTitle = pageTitles[pathname] ?? 'Dashboard'

  const handleLogout = async () => {
    await signOut(auth)
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      {/* Desktop Sidebar */}
      <div className="fixed top-0 left-0 bottom-0 w-[240px] z-40 hidden md:block">
        <Sidebar onLogout={handleLogout} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-[240px] z-50 md:hidden">
              <Sidebar mobile onClose={() => setMobileOpen(false)} onLogout={handleLogout} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="fixed top-0 right-0 left-0 md:left-[240px] h-[60px] z-30 flex items-center justify-between px-6"
        style={{ background: 'rgba(4,6,8,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <Menu size={20} />
          </button>
          <h1 className="font-syne font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
            <Search size={18} />
          </button>
          <button className="relative p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--accent-danger)' }} />
          </button>

          {/* Plan Badge in top bar */}
          {!isPro && (
            <button onClick={() => { setUpgradeReason('Upgrade for unlimited optimizations and rows'); setShowUpgradeModal(true) }}
              className="text-xs px-3 py-1.5 rounded-full font-medium hidden md:block transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(6,182,212,0.15) 100%)',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(37,99,235,0.4)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(6,182,212,0.15) 100%)'; e.currentTarget.style.color = 'var(--accent-primary)' }}>
              ⚡ Upgrade
            </button>
          )}
          {isPro && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium hidden md:block"
              style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-success)', border: '1px solid rgba(16,185,129,0.3)' }}>
              Pro
            </span>
          )}

          <span className="text-sm hidden md:block" style={{ color: 'var(--text-muted)' }}>{userData?.companies?.name}</span>
          
          {userData?.companies?.logo_url && (
            <Image
              src={userData.companies.logo_url}
              alt="Company Logo"
              width={28}
              height={28}
              className="object-contain rounded hidden md:block"
              unoptimized
            />
          )}

          <div className="relative" data-avatar-dropdown onClick={e => e.stopPropagation()}>
            <button onClick={() => setAvatarDropdown(!avatarDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
              style={{ background: avatarDropdown ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <Avatar name={userData?.full_name} url={userData?.avatar_url} size={30} />
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            <AnimatePresence>
              {avatarDropdown && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl py-1 z-50"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
                  {[
                    { label: 'Profile', href: '/dashboard/settings' },
                    { label: 'Settings', href: '/dashboard/settings' },
                  ].map(item => (
                    <Link key={item.label} href={item.href}
                      onClick={() => setAvatarDropdown(false)}
                      className="block px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="md:ml-[240px] pt-[60px] min-h-screen p-6">
        {children}
      </main>

      {/* Global Upgrade Modal */}
      <UpgradeModal
        show={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SubscriptionProvider>
  )
}
