'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { AdminGuard } from '../guard'
import { Building2, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

export default function TenantsPage() {
  return <AdminGuard><TenantsList /></AdminGuard>
}

function TenantsList() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-tenants'],
    queryFn: () => api.get('/admin/tenants').then((r) => r.data),
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.patch(`/admin/tenants/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-500 mt-0.5">All operators on this platform.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Operator', 'Plan', 'Routers', 'Gross Revenue', 'Wallet', 'Status', 'Joined', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.email}</div>
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={t.plan} onChange={(plan) => update.mutate({ id: t.id, payload: { plan } })} />
                </td>
                <td className="px-4 py-3 text-gray-700">{t.routers_count}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(t.gross_revenue)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(t.wallet_balance)}</td>
                <td className="px-4 py-3">
                  <StatusToggle active={t.is_active} onChange={(v) => update.mutate({ id: t.id, payload: { is_active: v } })} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(t.created_at), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3" />
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No tenants yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PLANS = ['free', 'pro', 'enterprise'] as const
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

function PlanBadge({ plan, onChange }: { plan: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {plan}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute z-10 top-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
          {PLANS.map((p) => (
            <button
              key={p}
              onClick={() => { onChange(p); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
    >
      {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {active ? 'Active' : 'Suspended'}
    </button>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
}
