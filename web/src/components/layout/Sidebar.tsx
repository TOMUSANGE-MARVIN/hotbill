'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Router, BarChart3, TrendingDown,
  ShoppingCart, Users, Package, CreditCard, UserCheck,
  Ticket, MonitorSmartphone, Megaphone, Settings, ChevronDown, LogOut, Wallet
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/routers', label: 'Router', icon: Router },
  { href: '/analytics', label: 'Usage Analytics', icon: BarChart3 },
  {
    label: 'Expenses', icon: TrendingDown,
    children: [{ href: '/expenses', label: 'All Expenses' }]
  },
  {
    label: 'Sales', icon: ShoppingCart,
    children: [
      { href: '/transactions', label: 'Transactions' },
      { href: '/transactions/summary', label: 'Summary' },
    ]
  },
  {
    label: 'Users', icon: Users,
    children: [
      { href: '/subscribers', label: 'Subscribers' },
      { href: '/subscribers/new', label: 'Add Subscriber' },
    ]
  },
  { href: '/packages', label: 'Packages', icon: Package },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/agents', label: 'Agent', icon: UserCheck },
  { href: '/vouchers', label: 'Vouchers', icon: Ticket },
  { href: '/remote-access', label: 'Remote Access', icon: MonitorSmartphone },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  {
    label: 'Settings', icon: Settings,
    children: [
      { href: '/settings', label: 'General' },
      { href: '/settings/routers', label: 'Routers' },
      { href: '/settings/router-setup', label: 'Router Setup' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { tenant, logout } = useAuthStore()
  const [expanded, setExpanded] = useState<string[]>(() =>
    navItems
      .filter((item): item is typeof item & { children: { href: string; label: string }[] } => 'children' in item)
      .filter((item) => item.children.some((child) => pathname === child.href))
      .map((item) => item.label)
  )

  const toggle = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">H</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">HotBill</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          {tenant?.name ?? 'Loading...'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          if ('children' in item) {
            const isOpen = expanded.includes(item.label)
            const Icon = item.icon
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Icon size={15} />
                    {item.label}
                  </span>
                  <ChevronDown size={13} className={cn('transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {(item.children ?? []).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-xs',
                          pathname === child.href
                            ? 'bg-green-50 text-green-700 font-medium'
                            : 'text-gray-500 hover:bg-gray-50'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                active
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Account section */}
      <div className="p-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-2 px-1">Account</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}
