'use client'

import { ShieldOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function SuspendedPage() {
  const { logout } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldOff className="text-red-600" size={22} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">This business is suspended</h1>
        <p className="text-sm text-gray-500 mt-2">
          Your hotspot is still serving customers, but the dashboard and withdrawals are paused.
          Please contact HotBill support at <a href="mailto:info@hotbill.app" className="text-brand-600">info@hotbill.app</a> to restore access.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <a href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Try again</a>
          <button onClick={() => { logout(); window.location.href = '/login' }} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white">Sign out</button>
        </div>
      </div>
    </div>
  )
}
