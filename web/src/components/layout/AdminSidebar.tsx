'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  ShieldCheck, LayoutDashboard, Building2, Wallet,
  CreditCard, Router as RouterIcon, LogOut, X,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/admin/routers', label: 'All Routers', icon: RouterIcon },
]

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
            <ShieldCheck size={14} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">HotBill</span>
            <p className="text-xs text-green-400 font-medium">Platform Admin</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-1 text-gray-500 hover:text-gray-300">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">Management</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm',
                active
                  ? 'bg-green-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Account */}
      <div className="p-3 border-t border-gray-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-white font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}
