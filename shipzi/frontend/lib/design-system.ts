export const colors = {
  bgVoid: '#040608',
  bgSurface: '#0A0D12',
  bgElevated: '#111620',
  borderSubtle: '#1E2533',
  borderGlow: '#2563EB',
  accentPrimary: '#2563EB',
  accentSecondary: '#06B6D4',
  accentSuccess: '#10B981',
  accentWarning: '#F59E0B',
  accentDanger: '#EF4444',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
}

export const chartColors = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6']

export type OrderStatus = 'pending' | 'optimized' | 'packed' | 'shipped' | 'delivered'

export const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-pending' },
  optimized: { label: 'Optimized', className: 'badge-optimized' },
  packed: { label: 'Packed', className: 'badge-packed' },
  shipped: { label: 'Shipped', className: 'badge-shipped' },
  delivered: { label: 'Delivered', className: 'badge-delivered' },
}

export const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/optimize', label: 'Optimize', icon: 'Zap' },
  { href: '/dashboard/orders', label: 'Orders', icon: 'Package' },
  { href: '/dashboard/shipments', label: 'Shipments', icon: 'Truck' },
  { href: '/dashboard/box-catalog', label: 'Box Catalog', icon: 'Box' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'BarChart3' },
  { href: '/dashboard/sustainability', label: 'Sustainability', icon: 'Leaf' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
]
