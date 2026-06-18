'use client'

import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminSidebar from '@/components/layout/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    if (user && user.role !== 'super_admin') router.push('/')
  }, [token, user, router])

  if (!token || !user || user.role !== 'super_admin') return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
