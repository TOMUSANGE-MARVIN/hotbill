'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, type Business } from '@/store/auth'
import api from '@/lib/api'
import { Building2, Router as RouterIcon, Loader2, ArrowRight, X } from 'lucide-react'

type Step = 'business' | 'router'

export default function AddBusinessModal({ onClose }: { onClose: () => void }) {
  const { addBusiness } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const [step, setStep] = useState<Step>('business')
  const [businessName, setBusinessName] = useState('')
  const [routerName, setRouterName] = useState('')
  const [created, setCreated] = useState<Business | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBusiness = async () => {
    if (!businessName.trim()) return
    setBusy(true); setError(null)
    try {
      const biz = await addBusiness(businessName.trim())
      // We've switched to the new (empty) business — clear stale cached data.
      qc.invalidateQueries()
      setCreated(biz)
      setStep('router')
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Could not create business.')
    } finally {
      setBusy(false)
    }
  }

  const createRouter = async () => {
    if (!routerName.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await api.post('/routers', { name: routerName.trim() })
      qc.invalidateQueries({ queryKey: ['routers'] })
      onClose()
      router.push(`/dashboard/routers/${res.data.id}/setup`)
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Could not add router.')
      setBusy(false)
    }
  }

  const skipRouter = () => {
    onClose()
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {step === 'business' ? 'Add a hotspot business' : 'Add your first router'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}

          {step === 'business' ? (
            <>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                  <Building2 size={18} />
                </span>
                <p>Each business is a separate location with its own packages, subscribers, routers and earnings.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business name</label>
                <input
                  autoFocus
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createBusiness()}
                  placeholder="e.g. Kampala Branch"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={createBusiness}
                disabled={busy || !businessName.trim()}
                className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <>Continue <ArrowRight size={15} /></>}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                  <RouterIcon size={18} />
                </span>
                <p><span className="font-medium text-gray-700">{created?.name}</span> is ready. Give your router a name and we&apos;ll walk you through installation.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Router name</label>
                <input
                  autoFocus
                  value={routerName}
                  onChange={(e) => setRouterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createRouter()}
                  placeholder="e.g. Main Gate Router"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={skipRouter} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Skip for now
                </button>
                <button
                  onClick={createRouter}
                  disabled={busy || !routerName.trim()}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : <>Add &amp; set up <ArrowRight size={15} /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
