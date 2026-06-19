'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { Wallet, ArrowUpRight, ArrowDownLeft, Banknote, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function WalletPage() {
  const qc = useQueryClient()
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data),
    refetchInterval: 30000,
  })

  const withdraw = useMutation({
    mutationFn: (amt: number) => api.post('/wallet/withdraw', { amount: amt }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['wallet'] })
      setShowWithdraw(false); setAmount(''); setError(null)
      setNotice(r.data?.message ?? 'Withdrawal requested')
      setTimeout(() => setNotice(null), 5000)
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Withdrawal failed'),
  })

  const currency = data?.currency ?? 'UGX'
  const balance = data?.balance ?? 0
  const txns = data?.transactions ?? []

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>

      {notice && <div className="bg-brand-50 text-brand-700 text-sm rounded-lg px-4 py-3">{notice}</div>}

      {/* Balance card */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white max-w-md">
        <div className="flex items-center gap-2 text-brand-100 text-sm"><Wallet size={16} /> Available Balance</div>
        <p className="text-4xl font-bold mt-2">{formatCurrency(balance, currency)}</p>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => { setShowWithdraw(true); setError(null) }}
            disabled={balance <= 0}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 disabled:opacity-60"
          >
            Withdraw
          </button>
          {!data?.payout_phone && (
            <Link href="/dashboard/settings" className="text-brand-100 text-xs underline">Set payout number</Link>
          )}
        </div>
      </div>

      {!data?.payouts_enabled && (
        <div className="flex items-start gap-2 bg-amber-50 text-amber-700 text-xs rounded-lg px-4 py-3 max-w-2xl">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>Automatic payouts aren&apos;t enabled yet — withdrawal requests are queued as <b>processing</b> and released manually until the disbursement provider is switched on.</span>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800">Transaction History</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
              <th className="text-left px-5 py-2.5 font-medium">Date</th>
              <th className="text-left px-5 py-2.5 font-medium">Description</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-right px-5 py-2.5 font-medium">Amount</th>
              <th className="text-right px-5 py-2.5 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {txns.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                <td className="px-5 py-3 text-gray-700">
                  <span className="flex items-center gap-2">
                    {t.type === 'credit'
                      ? <ArrowDownLeft size={14} className="text-brand-500" />
                      : <ArrowUpRight size={14} className="text-gray-400" />}
                    {t.description ?? (t.source === 'sale' ? 'Hotspot sale' : 'Withdrawal')}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                    t.status === 'completed' ? 'bg-brand-50 text-brand-600'
                    : t.status === 'failed' ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600')}>{t.status}</span>
                </td>
                <td className={cn('px-5 py-3 text-right font-medium', t.type === 'credit' ? 'text-brand-600' : 'text-gray-700')}>
                  {t.type === 'credit' ? '+' : '−'}{formatCurrency(t.amount, currency)}
                </td>
                <td className="px-5 py-3 text-right text-gray-400">{formatCurrency(t.balance_after, currency)}</td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400"><Banknote className="mx-auto mb-2 text-gray-300" size={28} />No transactions yet. Earnings from hotspot sales will appear here.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdraw(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">Withdraw Funds</h2>
              <button onClick={() => setShowWithdraw(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
              <p className="text-sm text-gray-500">
                Sent to <span className="font-medium text-gray-800">{data?.payout_phone ?? '—'}</span>.{' '}
                {!data?.payout_phone && <Link href="/dashboard/settings" className="text-brand-600 underline">Set a number</Link>}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={data?.min_withdrawal}
                  max={balance}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Min {formatCurrency(data?.min_withdrawal ?? 0, currency)} · Available {formatCurrency(balance, currency)}
                </p>
              </div>
              <button
                onClick={() => withdraw.mutate(Number(amount))}
                disabled={withdraw.isPending || !amount || !data?.payout_phone}
                className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {withdraw.isPending ? 'Processing…' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
