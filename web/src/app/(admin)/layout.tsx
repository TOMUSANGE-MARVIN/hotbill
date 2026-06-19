'use client'

import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminSidebar from '@/components/layout/AdminSidebar'
import { Menu } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, hasHydrated } = useAuthStore()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return // wait for persisted session before redirecting
    if (!token) { router.push('/login'); return }
    if (user && user.role !== 'super_admin') router.push('/dashboard')
  }, [hasHydrated, token, user, router])

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  if (!token || !user || user.role !== 'super_admin') return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-200
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Admin header bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between shrink-0">
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-gray-300 md:ml-0 ml-2">Platform Admin</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user.name?.[0] ?? 'A'}</span>
            </div>
            <span className="hidden sm:block text-sm text-gray-300">{user.name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
