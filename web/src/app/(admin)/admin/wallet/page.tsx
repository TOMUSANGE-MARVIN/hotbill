'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Landmark, Banknote, ShieldCheck, TrendingUp, ArrowUpRight, RefreshCw, Info } from 'lucide-react'
import { Stat, Card, Spinner, apiError } from '@/components/admin/controls'

export default function PlatformWalletPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-wallet'],
    queryFn: () => api.get('/admin/wallet').then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <Spinner />
  if (isError || !data) return <div className="text-sm text-red-600">Could not load the platform wallet.</div>

  const s = data.summary
  const cur = s.currency
  const money = (v: number | null) => (v == null ? 'Unavailable' : formatCurrency(Number(v), cur))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Wallet</h1>
          <p className="text-sm text-gray-500">HotBill&apos;s own earnings, kept apart from the money owed to operators.</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Landmark} label="Available to withdraw" value={money(s.withdrawable)} sub={`Up to ${money(data.max_sendable)} after the MarzPay fee`} accent />
        <Stat icon={TrendingUp} label="Earned (all time)" value={money(s.earned.total)} sub={`${money(s.withdrawn)} withdrawn so far`} />
        <Stat icon={Banknote} label="MarzPay balance" value={money(s.marzpay_balance)} sub="Live, all money held" />
        <Stat icon={ShieldCheck} label="Owed to operators" value={money(s.owed_to_operators)} sub="Reserved, never withdrawable" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card title="Where the MarzPay balance goes" sub="Every shilling in the account is either an operator's or HotBill's.">
            <Line label="MarzPay balance (live)" value={money(s.marzpay_balance)} strong />
            <Line label="Operator wallet balances" value={`- ${money(s.operator_wallets)}`} />
            {s.operator_withdrawals_pending > 0 && <Line label="Operator withdrawals on the way" value={`- ${money(s.operator_withdrawals_pending)}`} />}
            {s.in_flight > 0 && <Line label="Platform withdrawals on the way" value={`- ${money(s.in_flight)}`} />}
            <Line label="Cash that is HotBill's" value={money(s.cash_available)} strong border />
            <div className="h-3" />
            <Line label="Hotspot sales commission" value={money(s.earned.hotspot_fees)} />
            <Line label="Voucher commission" value={money(s.earned.voucher_commission)} />
            <Line label="Already withdrawn (incl. fees)" value={`- ${money(s.withdrawn + s.in_flight)}`} />
            <Line label="Earnings not yet withdrawn" value={money(s.book_available)} strong border />
            {s.unexplained != null && Math.abs(s.unexplained) >= 1 && (
              <p className="mt-4 flex gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  {s.unexplained > 0
                    ? `There is ${money(s.unexplained)} more cash than recorded earnings (fee rounding or a manual top-up). It is not counted as withdrawable.`
                    : `Cash is ${money(-s.unexplained)} short of recorded earnings, so withdrawals are capped at the cash that is actually there.`}
                </span>
              </p>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2">
          <WithdrawForm data={data} money={money} />
        </div>
      </div>

      <Card title="Earnings by month" sub="Last 6 months">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m) => format(new Date(`${m}-01`), 'MMM yyyy')} />
            <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatCurrency(v, cur)} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v), cur)} labelFormatter={(m) => format(new Date(`${m}-01`), 'MMMM yyyy')} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="hotspot" stackId="e" fill="#4F4AD7" name="Hotspot commission" />
            <Bar dataKey="voucher" stackId="e" fill="#F59E0B" name="Voucher commission" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Withdrawal history">
          <Withdrawals rows={data.withdrawals} money={money} />
        </Card>
        <Card title="Operator balances" sub="Money held for each business">
          {data.operators.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No operator balances.</p> : (
            <div className="divide-y divide-gray-100">
              {data.operators.map((t: any) => (
                <Link key={t.id} href={`/admin/tenants/${t.id}`} className="flex justify-between py-2.5 text-sm hover:bg-gray-50 -mx-2 px-2 rounded">
                  <span className="text-gray-800">{t.name}<span className="block text-xs text-gray-400">{t.payout_phone ?? 'No payout number'}</span></span>
                  <span className="font-medium text-gray-900">{money(t.wallet_balance)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function WithdrawForm({ data, money }: { data: any; money: (v: number | null) => string }) {
  const qc = useQueryClient()
  const s = data.summary
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState<string>(data.default_phone ?? '')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const [quote, setQuote] = useState<{ amount: number; fee: number } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const n = Number(amount)

  // Fee comes from the server so it always matches what MarzPay will charge.
  // Only a quote for the exact amount currently typed counts.
  useEffect(() => {
    if (!n || n < s.min_withdrawal) return
    const t = setTimeout(() => {
      api.get('/admin/wallet/fee', { params: { amount: n } })
        .then((r) => setQuote({ amount: n, fee: Number(r.data.fee) }))
        .catch(() => setQuote(null))
    }, 300)
    return () => clearTimeout(t)
  }, [n, s.min_withdrawal])
  const fee = quote && quote.amount === n && n >= s.min_withdrawal ? quote.fee : null

  const total = fee != null ? n + fee : null
  const tooMuch = total != null && total > s.withdrawable

  const withdraw = useMutation({
    mutationFn: () => api.post('/admin/wallet/withdraw', { amount: n, phone, password, note: note || null }).then((r) => r.data),
    onSuccess: (r) => {
      setMsg({ ok: true, text: r.message })
      setAmount(''); setPassword(''); setNote('')
      qc.invalidateQueries({ queryKey: ['admin-wallet'] })
    },
    onError: (e) => {
      setMsg({ ok: false, text: apiError(e) })
      setPassword('')
      qc.invalidateQueries({ queryKey: ['admin-wallet'] })
    },
  })

  const canSubmit = n >= s.min_withdrawal && fee != null && !tooMuch && phone && password && !withdraw.isPending

  const submit = () => {
    if (!canSubmit) return
    if (confirm(`Send ${money(n)} to ${phone}?\nMarzPay fee ${money(fee)} · total ${money(total)} leaves the account.`)) withdraw.mutate()
  }

  return (
    <Card title="Withdraw earnings" sub="Sent to mobile money through MarzPay">
      {s.marzpay_balance == null ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">The MarzPay balance could not be read, so withdrawals are paused. Refresh in a minute.</p>
      ) : (
        <div className="space-y-3">
          <Field label="Amount to receive">
            <div className="flex gap-2">
              <input type="number" min={s.min_withdrawal} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${s.min_withdrawal}`} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" />
              <button type="button" onClick={() => setAmount(String(data.max_sendable))} disabled={data.max_sendable < s.min_withdrawal} className="text-xs font-medium px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40">Max</button>
            </div>
          </Field>
          {fee != null && (
            <div className={`text-xs rounded-lg px-3 py-2 ${tooMuch ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
              MarzPay fee {money(fee)} · total {money(total)}
              {tooMuch && <> · more than the {money(s.withdrawable)} available</>}
            </div>
          )}
          <Field label="Mobile money number">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0772123456" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </Field>
          <Field label="Note (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. September earnings" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </Field>
          <Field label="Your password">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </Field>
          <button onClick={submit} disabled={!canSubmit} className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium bg-brand-600 text-white rounded-lg px-4 py-2.5 disabled:opacity-40">
            <ArrowUpRight size={15} /> {withdraw.isPending ? 'Sending...' : 'Withdraw'}
          </button>
          {msg && <p className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        </div>
      )}
    </Card>
  )
}

function Withdrawals({ rows, money }: { rows: any[]; money: (v: number | null) => string }) {
  const qc = useQueryClient()
  const check = useMutation({
    mutationFn: (id: number) => api.post(`/admin/wallet/withdrawals/${id}/refresh`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-wallet'] }),
  })

  if (rows.length === 0) return <p className="text-sm text-gray-400 py-6 text-center">No platform withdrawals yet.</p>

  const tone: Record<string, string> = {
    completed: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-600',
    processing: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((w) => (
        <div key={w.id} className="py-3 flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <div className="font-medium text-gray-900">{money(w.amount)} <span className="font-normal text-gray-400">+ {money(w.fee)} fee</span></div>
            <div className="text-xs text-gray-500">To {w.phone} · {format(new Date(w.created_at), 'dd MMM yyyy, HH:mm')}{w.user?.name ? ` · by ${w.user.name}` : ''}</div>
            {w.note && <div className="text-xs text-gray-400">{w.note}</div>}
            {w.error && <div className="text-xs text-red-600">{w.error}</div>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tone[w.status] ?? 'bg-gray-100 text-gray-600'}`}>{w.status}</span>
            {w.status === 'processing' && (
              <button onClick={() => check.mutate(w.id)} className="text-[11px] text-brand-600 hover:underline">Check status</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function Line({ label, value, strong, border }: { label: string; value: string; strong?: boolean; border?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${border ? 'border-t border-gray-200 mt-1 pt-2' : ''}`}>
      <span className={strong ? 'font-medium text-gray-800' : 'text-gray-500'}>{label}</span>
      <span className={strong ? 'font-semibold text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}
