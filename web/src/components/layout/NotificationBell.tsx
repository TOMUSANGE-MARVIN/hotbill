'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Smartphone, Ticket, AlertTriangle, Wallet, WifiOff, PackageX, CheckCheck, type LucideIcon,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

type Item = {
  id: string
  type: string
  level: 'success' | 'warning' | 'danger' | 'info'
  title: string
  body: string
  at: string | null
  href: string
  unread: boolean
}

const ICONS: Record<string, LucideIcon> = {
  momo_sale: Smartphone,
  voucher_sale: Ticket,
  payment_failed: AlertTriangle,
  wallet: Wallet,
  router_offline: WifiOff,
  voucher_stock: PackageX,
}

const TONE: Record<Item['level'], string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
}

const FILTERS = {
  all: { label: 'All', match: () => true },
  sales: { label: 'Sales', match: (i: Item) => i.type === 'momo_sale' || i.type === 'voucher_sale' },
  alerts: { label: 'Alerts', match: (i: Item) => i.level === 'warning' || i.level === 'danger' },
  wallet: { label: 'Wallet', match: (i: Item) => i.type === 'wallet' },
} as const

export default function NotificationBell() {
  const qc = useQueryClient()
  const businessId = useAuthStore((s) => s.activeBusinessId)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<keyof typeof FILTERS>('all')
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery<{ items: Item[]; unread: number }>({
    queryKey: ['notifications', businessId],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 60000,
  })

  const markRead = useMutation({
    mutationFn: () => api.post('/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const items = data?.items ?? []
  const unread = data?.unread ?? 0
  const shown = items.filter(FILTERS[filter].match)

  // Leaving the panel counts as having seen everything in it; the highlight
  // stays while it is open so it is clear what was new.
  const toggle = () => {
    if (open && unread > 0) markRead.mutate()
    setOpen((v) => !v)
  }
  const close = () => {
    if (unread > 0) markRead.mutate()
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 relative"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-10 sm:right-0 sm:w-[380px] z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unread > 0 && (
              <button onClick={() => markRead.mutate()} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
            {Object.entries(FILTERS).map(([k, f]) => (
              <button
                key={k}
                onClick={() => setFilter(k as keyof typeof FILTERS)}
                className={`text-xs px-2.5 py-1 rounded-full ${filter === k ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
            {shown.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">Nothing here yet.</div>
            ) : shown.map((i) => {
              const Icon = ICONS[i.type] ?? Bell
              return (
                <Link
                  key={i.id}
                  href={i.href}
                  onClick={close}
                  className={`flex gap-3 px-4 py-3 hover:bg-gray-50 ${i.unread ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''}`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${TONE[i.level]}`}>
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-sm leading-snug ${i.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{i.title}</span>
                      {i.unread && <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-brand-500" />}
                    </span>
                    {i.body && <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{i.body}</span>}
                    {i.at && <span className="block text-[11px] text-gray-400 mt-1">{formatDistanceToNow(new Date(i.at), { addSuffix: true })}</span>}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
            Sales and payments from the last 7 days · wallet from the last 30.
          </div>
        </div>
      )}
    </div>
  )
}
