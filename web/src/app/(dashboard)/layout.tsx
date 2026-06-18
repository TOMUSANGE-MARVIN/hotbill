'use client'

import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    if (user?.role === 'super_admin') router.push('/admin')
  }, [token, user, router])

  if (!token || user?.role === 'super_admin') return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
