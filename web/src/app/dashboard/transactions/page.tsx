'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency, formatDateTime, statusColor, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { format, subDays } from 'date-fns'

const methodLabel: Record<string, string> = {
  mtn_momo: 'MTN MoMo', airtel_money: 'Airtel Money',
  cash: 'Cash', card: 'Card', bank: 'Bank',
}

export default function TransactionsPage() {
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'
  // Open straight to the Summary tab when linked as /transactions?tab=summary.
  const [tab, setTab] = useState<'list' | 'summary'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'summary'
      ? 'summary'
      : 'list'
  )
  const [filters, setFilters] = useState({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    method: '',
    status: '',
  })

  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.get('/transactions', { params: filters }).then((r) => r.data),
    enabled: tab === 'list',
  })

  const { data: summary } = useQuery({
    queryKey: ['transactions-summary', filters],
    queryFn: () => api.get('/transactions/summary', { params: filters }).then((r) => r.data),
    enabled: tab === 'summary',
  })

  const txList = txData?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>

      <div className="flex gap-3 flex-wrap">
        <input type="date" value={filters.start_date}
          onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={filters.end_date}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select value={filters.method} onChange={(e) => setFilters({ ...filters, method: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Methods</option>
          {Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="flex border-b border-gray-200">
        {(['list', 'summary'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize',
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Ref</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Subscriber</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Commission</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Net</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Method</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {txList.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{tx.reference}</td>
                  <td className="px-5 py-3 text-gray-700">{tx.subscriber?.full_name ?? tx.subscriber?.username ?? '—'}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(tx.amount, currency)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatCurrency(tx.commission, currency)}</td>
                  <td className="px-5 py-3 text-brand-600 font-medium">{formatCurrency(tx.net_amount, currency)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{methodLabel[tx.method] ?? tx.method}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs', statusColor(tx.status))}>{tx.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{tx.paid_at ? formatDateTime(tx.paid_at) : '—'}</td>
                </tr>
              ))}
              {!isLoading && txList.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'summary' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Gross Sales', value: summary.gross_sales },
              { label: 'Net Sales', value: summary.net_sales },
              { label: 'Commission', value: summary.commission },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(value, currency)}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">By Payment Method</h3>
            <div className="space-y-2">
              {(summary.by_method ?? []).map((m: any) => (
                <div key={m.method} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{methodLabel[m.method] ?? m.method}</span>
                  <div className="flex gap-4">
                    <span className="text-gray-400">{m.count} txns</span>
                    <span className="font-medium">{formatCurrency(m.total, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
