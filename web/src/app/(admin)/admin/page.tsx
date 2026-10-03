'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatBytes } from '@/lib/utils'
import Link from 'next/link'
import { Building2, Router as RouterIcon, Users, Database, Wallet, TrendingUp, Banknote, Ticket, Wifi, Smartphone, AlertTriangle, Info, ShoppingCart } from 'lucide-react'
import { Stat, Card } from '@/components/admin/controls'
import {
  VIZ, SalesByChannelChart, CommissionChart, Donut, NetworkSuccess, BuyingHeatmap, PackageMix, GrowthChart, FleetBar, Sparkline,
} from '@/components/admin/charts'
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
  const plc = pl.toLowerCase()

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  const f = data?.finance ?? {}
  const ch = data?.charts ?? {}
  const daily: any[] = ch.daily ?? []

  // Platform revenue per day (hotspot fees + voucher commission), on every day of the period.
  const revByDay = new Map<string, number>((data?.revenue_series ?? []).map((r: any) => [r.date, Number(r.revenue)]))
  const commission = daily.map((d) => ({ date: d.date, commission: revByDay.get(d.date) ?? 0 }))
  const salesSpark = daily.map((d) => ({ date: d.date, total: d.mobile_money + d.voucher }))

  const pay = data?.payments ?? {}
  const outcomes = [
    { name: 'Paid', value: pay.paid ?? 0, color: VIZ.status.good },
    { name: 'Failed', value: pay.failed ?? 0, color: VIZ.status.critical },
    { name: 'Pending', value: pay.pending ?? 0, color: VIZ.status.warning },
  ].filter((o) => o.value > 0)

  const share = (ch.tenant_share ?? []).map((t: any, i: number) => ({
    name: t.name,
    value: t.value,
    color: t.id == null ? VIZ.other : VIZ.series[i % VIZ.series.length],
  }))

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

      {/* Headline numbers with their trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label={`Platform revenue · ${pl}`} value={formatCurrency(f.period_revenue ?? 0)} sub={`All time ${formatCurrency(f.platform_revenue ?? 0)}`} accent>
          <Sparkline data={commission} dataKey="commission" color="#ffffff" />
        </Stat>
        <Stat icon={ShoppingCart} label={`Sales · ${pl}`} value={formatCurrency(data?.sales?.gross ?? 0)} sub={`${data?.sales?.count ?? 0} sale(s)`}>
          <Sparkline data={salesSpark} dataKey="total" color={VIZ.series[0]} />
        </Stat>
        <Stat icon={Wallet} label="Held for operators" value={formatCurrency(f.operator_wallet_liability ?? 0)} sub="Live wallet balances">
          <p className="text-xs text-gray-500 mt-3">
            {(data?.withdrawals?.pending_count ?? 0) > 0
              ? `${formatCurrency(data.withdrawals.pending_amount)} in ${data.withdrawals.pending_count} pending payout(s)`
              : 'No pending payouts'}
          </p>
        </Stat>
        <Stat
          icon={Smartphone}
          label={`MoMo success · ${pl}`}
          value={pay.success_rate == null ? '-' : `${pay.success_rate}%`}
          sub={`${pay.paid ?? 0} paid · ${pay.failed ?? 0} failed`}
        >
          {pay.success_rate != null && (
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" title={`${pay.success_rate}% of completed attempts were paid`}>
              <div className="h-full rounded-full" style={{ width: `${pay.success_rate}%`, background: VIZ.status.good }} />
            </div>
          )}
        </Stat>
      </div>

      {/* Sales over time + payment outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <Card title="Daily sales by channel" sub={`What operators sold each day · ${plc}`}>
            <SalesByChannelChart data={daily} />
          </Card>
        </div>
        <Card title="Mobile Money outcomes" sub={`Every payment prompt sent · ${plc}`}>
          <Donut
            data={outcomes}
            money={false}
            center={pay.success_rate == null ? '-' : `${pay.success_rate}%`}
            centerSub="succeeded"
          />
        </Card>
      </div>

      {/* Who sells, which network, what they buy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Sales share by business" sub={plc}>
          <Donut data={share} center={compactMoney(data?.sales?.gross ?? 0)} centerSub="total sales" />
        </Card>
        <Card title="Success by network" sub={`MTN vs Airtel · ${plc}`}>
          <NetworkSuccess data={ch.networks ?? []} />
        </Card>
        <Card title="What customers buy" sub={`Sales by access length · ${plc}`}>
          <PackageMix data={ch.package_mix ?? []} />
        </Card>
      </div>

      {/* When people buy */}
      <Card title="When customers buy" sub={`Sales by weekday and hour, East Africa time · ${plc}`}>
        <BuyingHeatmap grid={ch.heatmap ?? []} />
      </Card>

      {/* Revenue, growth, fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <Card title="Platform revenue per day" sub={`Hotspot fees + voucher commission · ${plc}`}>
            <CommissionChart data={commission} />
          </Card>
        </div>
        <Card title="Businesses on HotBill" sub="Last 12 months">
          {ch.growth && <GrowthChart data={ch.growth} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Router fleet" sub="Right now">
          {ch.fleet && <FleetBar fleet={ch.fleet} />}
        </Card>

        {/* Top tenants */}
        <div className="lg:col-span-2 min-w-0">
          <Card title="Top tenants" sub={`By sales · ${plc}`}>
            {(data?.top_tenants ?? []).length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">No sales in this period.</div>
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
                        <div className="h-full rounded-full" style={{ width: `${(Number(t.gross) / max) * 100}%`, background: VIZ.series[0] }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Revenue by source */}
      <Card title="Where revenue comes from" sub={`Commission by source · ${plc}, with all-time totals`}>
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
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.source === 'voucher' ? VIZ.series[1] : VIZ.series[0] }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  All time {formatCurrency(s.amount ?? 0)}
                  {s.source === 'voucher' && s.count != null ? ` · ${s.count} voucher(s)` : ''}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Platform at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat icon={Building2} label="Tenants" value={`${data?.tenants?.active ?? 0}/${data?.tenants?.total ?? 0}`} sub="active / total" />
        <Stat icon={Building2} label="Selling · 7d" value={String(data?.tenants?.selling_7d ?? 0)} sub={`${data?.tenants?.new_in_range ?? 0} new · ${plc}`} />
        <Stat icon={RouterIcon} label="Routers" value={`${data?.routers?.online ?? 0}/${data?.routers?.total ?? 0}`} sub="online / total" />
        <Stat icon={Wifi} label="Online now" value={String(data?.routers?.active_users ?? 0)} sub="users on live routers" />
        <Stat icon={Users} label="Customers" value={String(data?.customers ?? 0)} sub="all time" />
        <Stat icon={Database} label="Data served" value={formatBytes(data?.data_bytes ?? 0)} sub="all time" />
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1.5"><Banknote size={13} /> MarzPay collection fees all time: {formatCurrency(f.gateway_fees ?? 0)}</p>
    </div>
  )
}

/** Short money for tight spots like a donut centre: UGX 422k, UGX 1.2M. */
function compactMoney(v: number) {
  const n = Number(v)
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `UGX ${Math.round(n / 1000)}k`
  return formatCurrency(n)
}
