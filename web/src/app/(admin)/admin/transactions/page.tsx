'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

export default function AdminTransactionsPage() {
  return <TransactionsList />
}

function TransactionsList() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-transactions'],
    queryFn: () => api.get('/admin/transactions').then((r) => r.data),
    refetchInterval: 30000,
  })

  const totals = data.reduce(
    (acc, t) => {
      if (t.type === 'credit') acc.credits += Number(t.amount)
      else acc.debits += Number(t.amount)
      return acc
    },
    { credits: 0, debits: 0 }
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Global transaction log across all operators.</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xl font-bold text-brand-700">+{formatCurrency(totals.credits)}</div>
            <div className="text-xs text-gray-400">Credits</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">−{formatCurrency(totals.debits)}</div>
            <div className="text-xs text-gray-400">Debits</div>
          </div>
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Operator', 'Type', 'Amount', 'Category', 'Description', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.tenant?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.type === 'credit' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>
                      {t.type === 'credit' ? '+' : '−'}{t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{t.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{t.description ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(t.created_at), 'dd MMM yyyy HH:mm')}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}
