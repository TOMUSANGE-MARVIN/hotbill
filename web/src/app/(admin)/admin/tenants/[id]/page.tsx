'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatBytes } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeft, TrendingUp, Banknote, Wallet, Smartphone, Users, Database, UserCheck, Ticket,
  Router as RouterIcon, RefreshCw, Power, LogOut, Mail, Phone, Clock, CheckCircle, XCircle,
} from 'lucide-react'
import {
  Stat, Card, Spinner, PlanBadge, VoucherCommissionControl, StatusToggle, apiError,
} from '@/components/admin/controls'
import { usePeriod } from '@/lib/period'
import PeriodPicker from '@/components/PeriodPicker'


export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  // Starts on this month so a business's figures reset each month.
  const period = usePeriod('this_month')
  const pl = period.label.toLowerCase()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-tenant', id, period.start, period.end],
    queryFn: () => api.get(`/admin/tenants/${id}`, { params: { from: period.start, to: period.end } }).then((r) => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: 60000,
  })

  const done = (text: string) => {
    setNotice({ ok: true, text })
    qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
    qc.invalidateQueries({ queryKey: ['admin-tenants'] })
  }
  const fail = (e: any) => setNotice({ ok: false, text: apiError(e) })

  const update = useMutation({
    mutationFn: (payload: any) => api.patch(`/admin/tenants/${id}`, payload).then((r) => r.data),
    onSuccess: () => done('Saved.'),
    onError: fail,
  })
  const userAction = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: 'suspend' | 'activate' | 'sign-out' }) =>
      action === 'sign-out'
        ? api.post(`/admin/users/${userId}/sign-out`).then((r) => r.data)
        : api.patch(`/admin/users/${userId}`, { is_active: action === 'activate' }).then((r) => r.data),
    onSuccess: (r) => done(r.message),
    onError: fail,
  })
  const routerAction = useMutation({
    mutationFn: ({ routerId, action }: { routerId: number; action: string }) =>
      api.post(`/admin/routers/${routerId}/action`, { action }).then((r) => r.data),
    onSuccess: (r) => done(r.message),
    onError: fail,
  })

  if (isLoading) return <Spinner />
  if (isError || !data) return <div className="text-sm text-red-600">Could not load this tenant.</div>

  const t = data.tenant
  const cur = t.currency
  const money = (v: number) => formatCurrency(Number(v ?? 0), cur)
  const p = data.finance.period
  const a = data.finance.all_time
  const pay = data.payments
  const c = data.customers
  const peak = [...data.hourly].sort((x: any, y: any) => y.sales - x.sales)[0]

  return (
    <div className="space-y-6">
      <Link href="/admin/tenants" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> All tenants
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{t.name}</h1>
            <StatusToggle active={t.is_active} name={t.name} onChange={(v) => update.mutate({ is_active: v })} />
            <PlanBadge plan={t.plan} onChange={(plan) => update.mutate({ plan })} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {t.email && <span className="flex items-center gap-1"><Mail size={13} />{t.email}</span>}
            {t.phone && <span className="flex items-center gap-1"><Phone size={13} />{t.phone}</span>}
            <span className="flex items-center gap-1"><Clock size={13} />{t.timezone}</span>
            <span>Joined {format(new Date(t.created_at), 'dd MMM yyyy')}</span>
            <span>ID #{t.id}</span>
          </div>
        </div>
        <div className="self-start"><PeriodPicker period={period} /></div>
      </div>

      {notice && (
        <div className={`text-sm rounded-lg px-4 py-2 flex justify-between ${notice.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label={`Sales · ${pl}`} value={money(p.gross)} sub={`${p.sales} sale(s) · all time ${money(a.gross)}`} accent />
        <Stat icon={Banknote} label={`Platform revenue · ${pl}`} value={money(p.platform_revenue)} sub={`all time ${money(a.platform_revenue)}`} />
        <Stat icon={Wallet} label="Wallet balance" value={money(t.wallet_balance)} sub={`${money(data.finance.withdrawn)} withdrawn in ${data.finance.withdrawals_count}`} />
        <Stat
          icon={Smartphone}
          label={`MoMo success · ${pl}`}
          value={pay.success_rate == null ? '-' : `${pay.success_rate}%`}
          sub={`${pay.paid} paid · ${pay.failed} failed · ${pay.pending} pending`}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={UserCheck} label="Active sessions" value={String(c.subscribers_active)} sub={`${c.subscribers_total} customer accounts`} />
        <Stat icon={Users} label={`Paying numbers · ${pl}`} value={String(c.unique_buyers)} sub={`${c.repeat_buyers} bought more than once`} />
        <Stat icon={Database} label={`Data served · ${pl}`} value={formatBytes(c.data_bytes)} sub={`${c.sessions} sessions`} />
        <Stat
          icon={Clock}
          label="Last sale"
          value={data.finance.last_sale_at ? formatDistanceToNow(new Date(data.finance.last_sale_at), { addSuffix: true }) : 'Never'}
          sub={peak?.sales ? `Busiest hour ${String(peak.hour).padStart(2, '0')}:00` : undefined}
        />
      </div>

      {/* Sales over time */}
      <Card title="Daily sales" sub={`Mobile money vs vouchers · ${data.range.from} to ${data.range.to} (${t.timezone})`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM dd')} minTickGap={24} />
            <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatCurrency(v, cur)} />
            <Tooltip formatter={(v: any) => money(v)} labelFormatter={(l) => format(new Date(l), 'EEE, MMM d')} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="mobile_money" stackId="s" fill="#4F4AD7" name="Mobile money" />
            <Bar dataKey="voucher" stackId="s" fill="#F59E0B" name="Vouchers" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="When customers buy" sub={`Sales by hour of day, local time · ${pl}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}`} interval={1} />
              <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 - ${String(h).padStart(2, '0')}:59`} />
              <Bar dataKey="sales" fill="#4F4AD7" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Sales channels" sub="All time">
          <ChannelBar label="Mobile money" amount={a.mobile_money} count={a.mobile_money_count} total={a.gross} color="bg-brand-600" money={money} />
          <ChannelBar label="Vouchers" amount={a.voucher} count={a.voucher_count} total={a.gross} color="bg-amber-500" money={money} />
          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <Mini label="Operator earned" value={money(a.operator_net)} />
            <Mini label="Pending withdrawals" value={money(data.finance.pending_withdrawals)} />
            <Mini label={`Failed MoMo value · ${pl}`} value={money(pay.failed_amount)} />
            <Mini label="Voucher commission" value={`${t.effective_voucher_commission}%${t.voucher_commission_enabled ? ' (custom)' : ' (default)'}`} />
          </div>
        </Card>
      </div>

      {/* Packages */}
      <Card title="Package performance" sub={`${pl}`}>
        {data.packages.length === 0 ? <Empty text="No sales in this range." /> : (
          <Table head={['Package', 'Price', 'Sales', 'Via voucher', 'Revenue', 'Share']}>
            {data.packages.map((pk: any) => (
              <tr key={pk.package_id ?? 'none'}>
                <Td strong>{pk.name}</Td>
                <Td>{pk.price != null ? money(pk.price) : '-'}</Td>
                <Td>{pk.sales}</Td>
                <Td>{pk.via_voucher}</Td>
                <Td>{money(pk.gross)}</Td>
                <Td>{p.gross > 0 ? Math.round((Number(pk.gross) / p.gross) * 100) : 0}%</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Routers */}
      <Card title="Routers" sub="Live status and remote actions (runs through the router's command queue)">
        {data.routers.length === 0 ? <Empty text="No routers added yet." /> : (
          <div className="space-y-3">
            {data.routers.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.online ? 'bg-green-500' : 'bg-red-500'}`} />
                    <RouterIcon size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{r.name}</span>
                    <span className="text-xs text-gray-400">#{r.id}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{r.online ? 'Online' : `Offline · last seen ${r.last_seen_at ? formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true }) : 'never'}`}</span>
                    {r.ros_version && <span>RouterOS {r.ros_version}</span>}
                    {r.uptime && <span>Up {r.uptime}</span>}
                    {r.cpu_load != null && <span>CPU {r.cpu_load}%</span>}
                    {r.memory_used_pct != null && <span>RAM {r.memory_used_pct}%</span>}
                    <span>{r.active_users} user(s) online</span>
                    <span>
                      Commands 24h: {r.commands_24h.done} ok
                      {r.commands_24h.failed > 0 && <span className="text-red-600"> · {r.commands_24h.failed} failed</span>}
                      {r.commands_24h.waiting > 0 && <span className="text-amber-600"> · {r.commands_24h.waiting} waiting</span>}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <SmallButton
                    icon={RefreshCw}
                    label="Refresh portal page"
                    onClick={() => { if (confirm(`Re-download the captive portal login page on "${r.name}"?`)) routerAction.mutate({ routerId: r.id, action: 'refresh-login' }) }}
                  />
                  <SmallButton
                    icon={Power}
                    label="Reboot"
                    danger
                    onClick={() => { if (confirm(`Reboot "${r.name}"? Every customer on it drops for about a minute.`)) routerAction.mutate({ routerId: r.id, action: 'reboot' }) }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team */}
        <Card title="Team" sub="People who can sign in to this business">
          {data.team.length === 0 ? <Empty text="No users." /> : (
            <div className="divide-y divide-gray-100">
              {data.team.map((u: any) => (
                <div key={u.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                      {u.owner && <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Owner</span>}
                      {!u.is_active && <span className="text-[10px] uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Suspended</span>}
                      {!u.verified && <span className="text-[10px] uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Unverified</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                    <div className="text-xs text-gray-400">
                      {u.last_active_at ? `Active ${formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true })}` : 'Never signed in'}
                      {` · ${u.sessions} open session(s)`}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {u.sessions > 0 && (
                      <SmallButton icon={LogOut} label="Sign out" onClick={() => { if (confirm(`Sign ${u.name} out of every device?`)) userAction.mutate({ userId: u.id, action: 'sign-out' }) }} />
                    )}
                    {u.is_active ? (
                      <SmallButton icon={XCircle} label="Suspend" danger onClick={() => { if (confirm(`Suspend ${u.name}? They are signed out and cannot sign in again.`)) userAction.mutate({ userId: u.id, action: 'suspend' }) }} />
                    ) : (
                      <SmallButton icon={CheckCircle} label="Reactivate" onClick={() => userAction.mutate({ userId: u.id, action: 'activate' })} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Account controls */}
        <Card title="Account controls">
          <div className="space-y-4 text-sm">
            <Row label="Voucher commission">
              <VoucherCommissionControl
                enabled={t.voucher_commission_enabled}
                rate={t.voucher_commission_rate}
                onChange={(payload) => update.mutate(payload)}
              />
            </Row>
            <Row label="Trial ends">
              <input
                type="date"
                defaultValue={t.trial_ends_at ? t.trial_ends_at.slice(0, 10) : ''}
                onBlur={(e) => {
                  const v = e.target.value || null
                  if (v !== (t.trial_ends_at ? t.trial_ends_at.slice(0, 10) : null)) update.mutate({ trial_ends_at: v })
                }}
                className="text-xs border border-gray-200 rounded-md px-2 py-1"
              />
            </Row>
            <Row label="Payout number">
              <span className="text-gray-700">{t.payout_phone ?? 'Not set'}{t.payout_provider ? ` (${t.payout_provider})` : ''}</span>
            </Row>
            <WalletAdjust tenantId={t.id} money={money} onDone={done} onFail={fail} />
          </div>
        </Card>
      </div>

      {/* Vouchers */}
      <Card title="Vouchers" sub={`${data.agents_count} agent(s)`}>
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(data.vouchers.by_status).map(([status, n]: any) => (
            <div key={status} className="rounded-lg border border-gray-200 px-4 py-2">
              <div className="text-xs text-gray-500 capitalize">{status}</div>
              <div className="text-lg font-semibold text-gray-900">{n}</div>
            </div>
          ))}
        </div>
        {data.vouchers.batches.length === 0 ? <Empty text="No voucher batches." /> : (
          <Table head={['Batch', 'Prefix', 'Package', 'Used', 'Created']}>
            {data.vouchers.batches.map((b: any) => (
              <tr key={b.id}>
                <Td strong>{b.name}</Td>
                <Td>{b.prefix ?? '-'}</Td>
                <Td>{b.package ?? '-'}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${b.quantity ? Math.min(100, (b.used_count / b.quantity) * 100) : 0}%` }} />
                    </div>
                    <span>{b.used_count}/{b.quantity}</span>
                  </div>
                </Td>
                <Td>{format(new Date(b.created_at), 'dd MMM yyyy')}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Activity data={data} money={money} />
    </div>
  )
}

function WalletAdjust({ tenantId, money, onDone, onFail }: { tenantId: number; money: (v: number) => string; onDone: (m: string) => void; onFail: (e: any) => void }) {
  const [type, setType] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const adjust = useMutation({
    mutationFn: () => api.post(`/admin/tenants/${tenantId}/wallet-adjustment`, { type, amount: Number(amount), reason }).then((r) => r.data),
    onSuccess: (r) => { setAmount(''); setReason(''); onDone(`Wallet ${type === 'credit' ? 'credited' : 'debited'}. New balance ${money(r.balance)}.`) },
    onError: onFail,
  })

  const submit = () => {
    if (!Number(amount) || reason.trim().length < 3) return
    if (confirm(`${type === 'credit' ? 'Credit' : 'Debit'} ${money(Number(amount))} ${type === 'credit' ? 'to' : 'from'} this wallet?\nReason: ${reason}`)) adjust.mutate()
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="font-medium text-gray-700 mb-2">Wallet adjustment</div>
      <p className="text-xs text-gray-400 mb-3">For corrections only. Recorded in the wallet ledger with your name and the reason.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5">
          <option value="credit">Credit (+)</option>
          <option value="debit">Debit (-)</option>
        </select>
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="sm:w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        <button
          onClick={submit}
          disabled={adjust.isPending || !Number(amount) || reason.trim().length < 3}
          className="text-sm font-medium bg-brand-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

const TABS = { sales: 'Recent sales', failed: 'Failed payments', wallet: 'Wallet ledger', commands: 'Router commands' } as const

function Activity({ data, money }: { data: any; money: (v: number) => string }) {
  const [tab, setTab] = useState<keyof typeof TABS>('sales')
  const when = (v?: string) => (v ? format(new Date(v), 'dd MMM, HH:mm') : '-')

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex overflow-x-auto border-b border-gray-200">
        {Object.entries(TABS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'sales' && (data.recent_sales.length === 0 ? <Empty text="No sales yet." /> : (
          <Table head={['When', 'Package', 'Channel', 'Phone', 'Amount', 'Commission', 'Reference']}>
            {data.recent_sales.map((s: any) => (
              <tr key={s.id}>
                <Td>{when(s.paid_at ?? s.created_at)}</Td>
                <Td>{s.package?.name ?? '-'}</Td>
                <Td>{s.type === 'voucher' ? <span className="inline-flex items-center gap-1"><Ticket size={12} />Voucher</span> : s.method?.replace('_', ' ')}</Td>
                <Td>{s.phone ?? '-'}</Td>
                <Td strong>{money(s.amount)}</Td>
                <Td>{money(s.commission)}</Td>
                <Td mono>{s.reference}</Td>
              </tr>
            ))}
          </Table>
        ))}
        {tab === 'failed' && (data.failed_payments.length === 0 ? <Empty text="No failed payments." /> : (
          <Table head={['When', 'Phone', 'Network', 'Amount', 'Reference']}>
            {data.failed_payments.map((o: any) => (
              <tr key={o.id}>
                <Td>{when(o.created_at)}</Td>
                <Td>{o.phone}</Td>
                <Td>{o.provider ?? '-'}</Td>
                <Td>{money(o.amount)}</Td>
                <Td mono>{o.merchant_reference}</Td>
              </tr>
            ))}
          </Table>
        ))}
        {tab === 'wallet' && (data.wallet_ledger.length === 0 ? <Empty text="No wallet activity." /> : (
          <Table head={['When', 'Type', 'Source', 'Amount', 'Balance after', 'Status', 'Note']}>
            {data.wallet_ledger.map((w: any) => (
              <tr key={w.id}>
                <Td>{when(w.created_at)}</Td>
                <Td><span className={w.type === 'credit' ? 'text-green-700' : 'text-red-600'}>{w.type}</span></Td>
                <Td>{w.source.replace('_', ' ')}</Td>
                <Td strong>{w.type === 'credit' ? '+' : '-'}{money(w.amount)}</Td>
                <Td>{money(w.balance_after)}</Td>
                <Td>{w.status}</Td>
                <Td>{w.description ?? ''}</Td>
              </tr>
            ))}
          </Table>
        ))}
        {tab === 'commands' && (data.recent_commands.length === 0 ? <Empty text="No router commands." /> : (
          <Table head={['When', 'Router', 'Kind', 'Label', 'Status', 'Result']}>
            {data.recent_commands.map((cmd: any) => (
              <tr key={cmd.id}>
                <Td>{when(cmd.created_at)}</Td>
                <Td>#{cmd.router_id}</Td>
                <Td>{cmd.kind}</Td>
                <Td>{cmd.label ?? '-'}</Td>
                <Td>
                  <span className={cmd.status === 'failed' ? 'text-red-600' : cmd.status === 'done' ? 'text-green-700' : 'text-amber-600'}>{cmd.status}</span>
                </Td>
                <Td><span className="line-clamp-1 max-w-[260px] inline-block" title={cmd.result ?? ''}>{cmd.result ?? ''}</span></Td>
              </tr>
            ))}
          </Table>
        ))}
      </div>
    </div>
  )
}

function ChannelBar({ label, amount, count, total, color, money }: { label: string; amount: number; count: number; total: number; color: string; money: (v: number) => string }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label} <span className="text-gray-400">· {count}</span></span>
        <span className="font-medium text-gray-900">{money(amount)} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  )
}

function SmallButton({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-gray-100">
            {head.map((h) => <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </div>
  )
}

function Td({ children, strong, mono }: { children: React.ReactNode; strong?: boolean; mono?: boolean }) {
  return <td className={`py-2 pr-4 whitespace-nowrap ${strong ? 'font-medium text-gray-900' : 'text-gray-600'} ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-gray-400 py-6 text-center">{text}</div>
}
