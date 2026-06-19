'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function WithdrawalsPage() {
  return <WithdrawalsList />
}

const STATUS_OPTIONS = ['', 'pending', 'processing', 'completed', 'failed'] as const

function WithdrawalsList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-withdrawals', status],
    queryFn: () => api.get('/admin/withdrawals', { params: status ? { status } : {} }).then((r) => r.data),
  })

  const release = useMutation({
    mutationFn: (id: number) => api.post(`/admin/withdrawals/${id}/release`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }),
  })

  const fail = useMutation({
    mutationFn: (id: number) => api.post(`/admin/withdrawals/${id}/fail`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }),
  })

  const pending = data.filter((w) => w.status === 'pending' || w.status === 'processing')
  const pendingTotal = pending.reduce((s: number, w: any) => s + Number(w.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Operator payout requests.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingTotal)}</div>
          <div className="text-xs text-gray-400">{pending.length} pending</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Operator', 'Phone', 'Amount', 'Status', 'Requested', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{w.tenant?.name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {w.tenant?.payout_phone ?? '—'} <span className="text-gray-400">{w.tenant?.payout_provider}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(w.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(w.created_at), 'dd MMM yyyy HH:mm')}</td>
                  <td className="px-4 py-3">
                    {(w.status === 'pending' || w.status === 'processing') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => release.mutate(w.id)}
                          disabled={release.isPending}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                        >
                          {release.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Paid out
                        </button>
                        <button
                          onClick={() => fail.mutate(w.id)}
                          disabled={fail.isPending}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {fail.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Fail & refund
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No withdrawal requests.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-brand-50 text-brand-700',
  failed: 'bg-red-50 text-red-600',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}
