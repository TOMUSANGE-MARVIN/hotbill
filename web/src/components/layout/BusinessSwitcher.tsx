'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import AddBusinessModal from './AddBusinessModal'

export default function BusinessSwitcher() {
  const { businesses, activeBusinessId, tenant, switchBusiness } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const active =
    businesses.find((b) => b.id === activeBusinessId) ??
    (tenant ? { id: tenant.id, name: tenant.name } : null)

  const handleSwitch = async (id: number) => {
    setOpen(false)
    if (id === activeBusinessId) return
    await switchBusiness(id)
    // Every cached query is tenant-scoped — refetch all for the new business.
    qc.invalidateQueries()
    // Detail routes (e.g. a specific router) belong to the old business; go home.
    if (/^\/dashboard\/.+\/.+/.test(pathname)) router.push('/dashboard')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
          <Building2 size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wide text-gray-400 leading-none">Business</span>
          <span className="block text-sm font-semibold text-gray-900 truncate leading-tight mt-0.5">
            {active?.name ?? 'Loading…'}
          </span>
        </span>
        <ChevronsUpDown size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Your businesses
          </p>
          <div className="max-h-64 overflow-y-auto">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSwitch(b.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-800">{b.name}</span>
                  <span className="block text-[11px] text-gray-400">
                    {b.routers_count} router{b.routers_count === 1 ? '' : 's'}
                  </span>
                </span>
                {b.id === activeBusinessId && <Check size={15} className="text-brand-600 shrink-0" />}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); setShowAdd(true) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50'
              )}
            >
              <Plus size={15} /> Add business
            </button>
          </div>
        </div>
      )}

      {showAdd && <AddBusinessModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
