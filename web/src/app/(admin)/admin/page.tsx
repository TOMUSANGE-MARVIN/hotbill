'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatBytes } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import Link from 'next/link'
import { Building2, Router as RouterIcon, Users, Database, Wallet, TrendingUp, Banknote, Ticket, Wifi, Smartphone, AlertTriangle, Info, ShoppingCart } from 'lucide-react'
import { Stat } from '@/components/admin/controls'
import { usePeriod } from '@/lib/period'
import PeriodPicker from '@/components/PeriodPicker'

export default function AdminOverviewPage() {
  // Money figures follow the selected period, which starts as this month.
  const period = usePeriod('this_month')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview', period.start, period.end],
    queryFn: () => api.get('/admin/overview', { params: { from: period.start, to: period.end } }).then((r) => r.data),
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  })
  const pl = period.label

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  const f = data?.finance ?? {}
  const series = (data?.revenue_series ?? []).map((r: any) => ({ date: r.date, revenue: Number(r.revenue) }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500">System-wide insights across all operators.</p>
        </div>
        <PeriodPicker period={period} />
      </div>

      {/* Needs attention */}
      {(data?.alerts ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Needs attention</h2>
          <ul className="space-y-2">
            {data.alerts.map((a: any, i: number) => {
              const cls = a.level === 'critical' ? 'bg-red-50 text-red-700' : a.level === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700'
              const Icon = a.level === 'info' ? Info : AlertTriangle
              const body = <span className="flex items-center gap-2"><Icon size={14} className="shrink-0" />{a.message}</span>
              const href = a.tenant_id ? `/admin/tenants/${a.tenant_id}` : a.kind === 'withdrawals' ? '/admin/withdrawals' : a.kind === 'stuck_commands' ? '/admin/routers' : null
              return (
                <li key={i} className={`text-sm rounded-lg px-3 py-2 ${cls}`}>
                  {href ? <Link href={href} className="hover:underline">{body}</Link> : body}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Revenue row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label={`Platform revenue · ${pl}`} value={formatCurrency(f.period_revenue ?? 0)} sub={`All time ${formatCurrency(f.platform_revenue ?? 0)}`} accent />
        <Stat icon={ShoppingCart} label={`Sales · ${pl}`} value={formatCurrency(data?.sales?.gross ?? 0)} sub={`${data?.sales?.count ?? 0} sale(s) · all time ${formatCurrency(f.gmv ?? 0)} online`} />
        <Stat icon={Wallet} label="Held for operators" value={formatCurrency(f.operator_wallet_liability ?? 0)} sub="Live wallet balances" />
        <Stat
          icon={Smartphone}
          label={`MoMo success · ${pl}`}
          value={data?.payments?.success_rate == null ? '-' : `${data.payments.success_rate}%`}
          sub={`${data?.payments?.paid ?? 0} paid · ${data?.payments?.failed ?? 0} failed`}
        />
      </div>

      {/* System row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Stat icon={Building2} label="Tenants" value={`${data?.tenants?.active ?? 0}/${data?.tenants?.total ?? 0}`} sub="active / total" />
        <Stat icon={RouterIcon} label="Routers" value={`${data?.routers?.online ?? 0}/${data?.routers?.total ?? 0}`} sub="online / total" />
        <Stat icon={Users} label="Customers" value={String(data?.customers ?? 0)} />
        <Stat icon={Database} label="Data Served" value={formatBytes(data?.data_bytes ?? 0)} />
        <Stat icon={Wallet} label="Pending Payouts" value={formatCurrency(data?.withdrawals?.pending_amount ?? 0)} sub={`${data?.withdrawals?.pending_count ?? 0} request(s)`} />
      </div>

      {/* Activity row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <Stat icon={Building2} label="Selling tenants · 7d" value={String(data?.tenants?.selling_7d ?? 0)} sub={`${data?.tenants?.new_in_range ?? 0} new sign-up(s) · ${pl.toLowerCase()}`} />
        <Stat icon={Wifi} label="Online now" value={String(data?.routers?.active_users ?? 0)} sub="users on live routers" />
        <Stat icon={Banknote} label="Gateway fees · all time" value={formatCurrency(f.gateway_fees ?? 0)} sub="Charged by MarzPay on collections" />
      </div>

      {/* Top tenants */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Top tenants</h2>
        <p className="text-xs text-gray-400 mb-4">By sales · {pl.toLowerCase()}.</p>
        {(data?.top_tenants ?? []).length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">No sales in this range.</div>
        ) : (
          <div className="space-y-3">
            {data.top_tenants.map((t: any) => {
              const max = Number(data.top_tenants[0].gross) || 1
              return (
                <Link key={t.id} href={`/admin/tenants/${t.id}`} className="block group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 group-hover:text-brand-600">{t.name}</span>
                    <span className="text-gray-600">{formatCurrency(Number(t.gross))} <span className="text-xs text-gray-400">· {t.sales} sales · {formatCurrency(Number(t.platform_revenue))} to us</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${(Number(t.gross) / max) * 100}%` }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Revenue by source */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Where revenue comes from</h2>
        <p className="text-xs text-gray-400 mb-4">Commission earned by source · {pl.toLowerCase()}, with all-time totals.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data?.revenue_by_source ?? []).map((s: any) => {
            const total = Number(f.period_revenue ?? 0)
            const pct = total > 0 ? Math.round((Number(s.period) / total) * 100) : 0
            return (
              <div key={s.source} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    {s.source === 'voucher'
                      ? <Ticket size={15} className="text-brand-500" />
                      : <Wifi size={15} className="text-brand-500" />}
                    {s.label}
                  </span>
                  <span className="text-xs text-gray-400">{pct}% of total</span>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(s.period ?? 0)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  All time {formatCurrency(s.amount ?? 0)}
                  {s.source === 'voucher' && s.count != null ? ` · ${s.count} voucher(s)` : ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Platform revenue (commission) · {pl}</h2>
        {series.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">No revenue yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F4AD7" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4F4AD7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM dd')} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(l) => format(new Date(l), 'EEE, MMM d')} />
              <Area type="monotone" dataKey="revenue" stroke="#4F4AD7" fill="url(#rev)" name="Commission" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
