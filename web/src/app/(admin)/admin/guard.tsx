'use client'

import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

/** Client-side gate for the platform admin area. The API enforces this too. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user && user.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="text-red-400 mb-3" size={40} />
        <h2 className="text-lg font-semibold text-gray-900">Platform admin only</h2>
        <p className="text-sm text-gray-500 mt-1">You don&apos;t have access to this area.</p>
        <Link href="/" className="text-brand-600 text-sm mt-4">← Back to dashboard</Link>
      </div>
    )
  }

  return <>{children}</>
}
