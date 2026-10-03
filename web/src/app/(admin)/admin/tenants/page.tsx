'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { Search, ChevronRight } from 'lucide-react'
import {
  PlanBadge, VoucherCommissionControl, StatusToggle, HealthBadge, HEALTH_OPTIONS, Spinner,
} from '@/components/admin/controls'

const SORTS = {
  gross_month: 'Sales (this month)',
  gross_revenue: 'Sales (all time)',
  wallet_balance: 'Wallet',
  last_sale_at: 'Last sale',
  created_at: 'Newest',
} as const

export default function TenantsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [health, setHealth] = useState('')
  const [sort, setSort] = useState<keyof typeof SORTS>('gross_month')

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-tenants'],
    queryFn: () => api.get('/admin/tenants').then((r) => r.data),
    refetchInterval: 60000,
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.patch(`/admin/tenants/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return data
      .filter((t) => !term || [t.name, t.email, t.phone].some((v) => v?.toLowerCase().includes(term)))
      .filter((t) => !health || t.health === health)
      .sort((a, b) => {
        const av = a[sort], bv = b[sort]
        if (sort === 'last_sale_at' || sort === 'created_at') return (bv ? Date.parse(bv) : 0) - (av ? Date.parse(av) : 0)
        return Number(bv ?? 0) - Number(av ?? 0)
      })
  }, [data, q, health, sort])

  if (isLoading) return <Spinner />

  const counts: Record<string, number> = {}
  for (const t of data) counts[t.health] = (counts[t.health] ?? 0) + 1

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-500 mt-0.5">All operators on this platform. Click one for its full picture.</p>
      </div>

      {/* Health summary doubles as a quick filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={!health} onClick={() => setHealth('')} label={`All · ${data.length}`} />
        {HEALTH_OPTIONS.filter((h) => counts[h.value]).map((h) => (
          <FilterChip key={h.value} active={health === h.value} onClick={() => setHealth(h.value)} label={`${h.label} · ${counts[h.value]}`} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or phone"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Operator', 'Health', 'Plan', 'Routers', 'Sales this month', 'All time', 'Wallet', 'MoMo success (30d)', 'Last sale', 'Voucher Commission', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600">{t.name}</Link>
                  <div className="text-xs text-gray-400">{t.email}</div>
                  <div className="text-[11px] text-gray-400">Joined {format(new Date(t.created_at), 'dd MMM yyyy')}</div>
                </td>
                <td className="px-4 py-3"><HealthBadge health={t.health} /></td>
                <td className="px-4 py-3">
                  <PlanBadge plan={t.plan} onChange={(plan) => update.mutate({ id: t.id, payload: { plan } })} />
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {t.routers_online}/{t.routers_count}
                  {t.active_users > 0 && <div className="text-xs text-gray-400">{t.active_users} online now</div>}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {formatCurrency(t.gross_month)}
                  <div className="text-xs text-gray-400">{t.sales_month} sale(s)</div>
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(t.gross_revenue)}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(t.wallet_balance)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {t.payment_success_rate == null ? <span className="text-gray-300">-</span> : (
                    <span className={t.payment_success_rate < 60 ? 'text-red-600 font-medium' : 'text-gray-700'}>{t.payment_success_rate}%</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {t.last_sale_at ? formatDistanceToNow(new Date(t.last_sale_at), { addSuffix: true }) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <VoucherCommissionControl
                    enabled={t.voucher_commission_enabled}
                    rate={t.voucher_commission_rate}
                    onChange={(payload) => update.mutate({ id: t.id, payload })}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusToggle active={t.is_active} name={t.name} onChange={(v) => update.mutate({ id: t.id, payload: { is_active: v } })} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${t.id}`} className="text-gray-400 hover:text-brand-600"><ChevronRight size={16} /></Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-400">No tenants match.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1 rounded-full border ${active ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
    >
      {label}
    </button>
  )
}
