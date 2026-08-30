'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  BarChart, Bar, ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, Cpu, Wifi, HardDrive, ArrowUpRight,
  Ticket, UserCircle2, Wallet, ChevronDown, Sigma,
} from 'lucide-react'
import { useState } from 'react'
import { format, subDays } from 'date-fns'

/* ── vibrant palette ─────────────────────────────────────────────── */
const C = {
  indigo: '#6366F1', violet: '#8B5CF6', emerald: '#10B981', teal: '#14B8A6',
  amber: '#F59E0B', orange: '#F97316', rose: '#F43F5E', pink: '#EC4899',
  cyan: '#06B6D4', sky: '#0EA5E9', slate: '#1E293B',
}

export default function DashboardPage() {
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'

  const [range, setRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  const [overviewFilter, setOverviewFilter] = useState<{
    type: 'all' | 'mobile_money' | 'vouchers' | 'subscriber'
    subscriberId?: number
    label: string
  }>({ type: 'all', label: 'All' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [showTotals, setShowTotals] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => api.get('/analytics/dashboard', { params: range }).then((r) => r.data),
  })

  const { data: seriesData } = useQuery({
    queryKey: ['dashboard-series', range, overviewFilter.type, overviewFilter.subscriberId],
    queryFn: () => api.get('/analytics/dashboard/series', {
      params: {
        ...range,
        channel: overviewFilter.type === 'subscriber' ? undefined : overviewFilter.type,
        subscriber_id: overviewFilter.type === 'subscriber' ? overviewFilter.subscriberId : undefined,
      },
    }).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const d = data ?? {}
  const daily = (d.daily ?? []).map((r: any) => ({
    ...r,
    net_revenue: Number(r.net_revenue),
    gross_revenue: Number(r.gross_revenue),
    commission: Number(r.commission),
  }))

  const other = Math.max(0, Number(d.gross_sales ?? 0) - Number(d.agent_sales ?? 0) - Number(d.mm_sales ?? 0))
  const channel = [
    { name: 'Agents', value: Number(d.agent_sales ?? 0), color: C.indigo },
    { name: 'Mobile Money', value: Number(d.mm_sales ?? 0), color: C.emerald },
    { name: 'Other', value: other, color: C.amber },
  ].filter((c) => c.value > 0)
  const channelTotal = channel.reduce((s, c) => s + c.value, 0)

  const cpu = Number(d.avg_cpu ?? 0)

  const overviewRaw = (seriesData?.daily ?? []).map((r: any) => ({
    ...r,
    net_revenue: Number(r.net_revenue),
    gross_revenue: Number(r.gross_revenue),
    commission: Number(r.commission),
  }))
  const overviewChart = showTotals ? toCumulative(overviewRaw) : overviewRaw

  const filterOptions: { type: 'all' | 'mobile_money' | 'vouchers'; label: string }[] = [
    { type: 'all', label: 'All' },
    { type: 'mobile_money', label: 'Mobile Money' },
    { type: 'vouchers', label: 'Printed Vouchers' },
  ]
  const subscriberOptions: { id: number; label: string }[] = d.subscriber_filters ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400">Welcome back — here&apos;s how {tenant?.name ?? 'your network'} is performing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
          <input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="text-sm text-slate-600 px-2 py-1 rounded-lg outline-none" />
          <span className="text-slate-300">→</span>
          <input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="text-sm text-slate-600 px-2 py-1 rounded-lg outline-none" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Net Sales" value={formatCurrency(d.net_sales ?? 0, currency)}
          sub={`MM: ${formatCurrency(d.mm_sales ?? 0, currency)} | Vouchers: ${formatCurrency(d.voucher_sales ?? 0, currency)}`}
          icon={<TrendingUp size={18} />}
          color={C.indigo} spark={daily} sparkKey="net_revenue" />
        <KpiCard title="Vouchers Sales" value={formatCurrency(d.voucher_sales ?? 0, currency)}
          sub="Total sales from physical vouchers" icon={<Ticket size={18} />}
          color={C.teal} />
        <KpiCard title="Balance" value={formatCurrency(d.balance ?? 0, currency)}
          sub={`Commission: ${formatCurrency(d.commission ?? 0, currency)}`} icon={<Wallet size={18} />}
          color={C.sky} />
        <SystemKpiCard online={!!d.system_online} activeUsers={d.active_users ?? 0} cpu={cpu} dataGb={d.total_data_gb ?? 0} />
      </div>

      {/* Overview + recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">{range.start} – {range.end}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTotals((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  showTotals ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                <Sigma size={13} /> Totals
              </button>
              <div className="relative">
                <button onClick={() => setFilterOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                  {overviewFilter.label} <ChevronDown size={13} />
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                      {filterOptions.map((opt) => (
                        <button key={opt.type} onClick={() => { setOverviewFilter({ type: opt.type, label: opt.label }); setFilterOpen(false) }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">
                          {opt.label}
                          {overviewFilter.type === opt.type && <span className="text-slate-900">✓</span>}
                        </button>
                      ))}
                      {subscriberOptions.length > 0 && <div className="my-1 border-t border-slate-100" />}
                      {subscriberOptions.map((s) => (
                        <button key={s.id}
                          onClick={() => { setOverviewFilter({ type: 'subscriber', subscriberId: s.id, label: s.label }); setFilterOpen(false) }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left truncate">
                          <span className="truncate">{s.label}</span>
                          {overviewFilter.type === 'subscriber' && overviewFilter.subscriberId === s.id && <span className="text-slate-900">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={overviewChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
              <Tooltip content={<OverviewTip currency={currency} />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="net_revenue" name="Net Proceeds" fill={C.emerald} radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Bar dataKey="commission" name="Agent Commission" fill={C.slate} radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Line type="monotone" dataKey="gross_revenue" name="Gross Revenue" stroke={C.violet} strokeWidth={2}
                dot={{ r: 3, fill: C.violet, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <Legend2 items={[
            { label: 'Net Proceeds', color: C.emerald },
            { label: 'Agent Commission', color: C.slate },
            { label: 'Gross Revenue', color: C.violet },
          ]} />
          {overviewChart.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No sales in this range.</p>}
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Sales</h2>
              <p className="text-xs text-slate-400 mt-0.5">You made {d.sales_today ?? 0} sales today.</p>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">Scroll for more <ChevronDown size={12} /></span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
            {(d.recent_sales ?? []).map((sale: any) => {
              const isVoucher = sale.type === 'voucher'
              const name = isVoucher ? (sale.voucher?.code ?? 'Voucher') : (sale.subscriber?.full_name ?? sale.subscriber?.username ?? 'Unknown')
              const subtitle = isVoucher ? 'Printed Voucher' : (sale.method?.replace('_', ' ') ?? '')
              return (
                <div key={sale.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isVoucher ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isVoucher ? <Ticket size={17} /> : <UserCircle2 size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 capitalize">{subtitle} · {formatDateTime(sale.paid_at)}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 shrink-0">
                    <ArrowUpRight size={14} />{formatCurrency(sale.amount, currency)}
                  </span>
                </div>
              )
            })}
            {(d.recent_sales ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-6">No recent sales.</p>}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">Showing {d.recent_sales?.length ?? 0} recent sales</p>
        </Card>
      </div>

      {/* Revenue trend + channel donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHead title="Revenue Trend" subtitle={`${range.start} – ${range.end}`} />
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
              <Tooltip content={<ChartTip currency={currency} />} />
              <Line type="monotone" dataKey="gross_revenue" name="Gross" stroke={C.indigo} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="net_revenue" name="Net" stroke={C.emerald} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Legend2 items={[{ label: 'Gross Revenue', color: C.indigo }, { label: 'Net Revenue', color: C.emerald }]} />
        </Card>

        <Card>
          <CardHead title="Sales by Channel" subtitle="Where revenue comes from" />
          <div className="relative">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={channel} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
                  {channel.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip content={<ChartTip currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(channelTotal, currency)}</span>
            </div>
          </div>
          <div className="space-y-2 mt-3">
            {channel.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.name}
                </span>
                <span className="font-semibold text-slate-800">
                  {channelTotal ? Math.round((c.value / channelTotal) * 100) : 0}%
                </span>
              </div>
            ))}
            {channel.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No sales in this range.</p>}
          </div>
        </Card>
      </div>

      {/* Daily breakdown */}
      <Card>
        <CardHead title="Daily Revenue & Commission" subtitle="Per-day breakdown" />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => format(new Date(v), 'MMM d')} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
            <Tooltip content={<ChartTip currency={currency} />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="net_revenue" name="Net Revenue" fill={C.violet} radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="commission" name="Commission" fill={C.cyan} radius={[5, 5, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
        <Legend2 items={[{ label: 'Net Revenue', color: C.violet }, { label: 'Commission', color: C.cyan }]} />
      </Card>
    </div>
  )
}

/* ── building blocks ─────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm ${className}`}>{children}</div>
}

function CardHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function KpiCard({ title, value, sub, icon, color, spark, sparkKey }: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string
  spark?: any[]; sparkKey?: string
}) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1A`, color }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-3">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
      {spark && sparkKey && spark.length > 1 && (
        <div className="h-10 mt-2 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey={sparkKey} stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function SystemKpiCard({ online, activeUsers, cpu, dataGb }: {
  online: boolean; activeUsers: number; cpu: number; dataGb: number
}) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">System</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${online ? 'text-emerald-600' : 'text-rose-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center">
          <Wifi size={16} className="mx-auto text-indigo-500 mb-1" />
          <p className="text-base font-bold text-slate-900">{activeUsers}</p>
          <p className="text-[11px] text-slate-400">Active</p>
        </div>
        <div className="text-center">
          <Cpu size={16} className="mx-auto text-sky-500 mb-1" />
          <p className="text-base font-bold text-slate-900">{cpu}%</p>
          <p className="text-[11px] text-slate-400">CPU</p>
        </div>
        <div className="text-center">
          <HardDrive size={16} className="mx-auto text-emerald-500 mb-1" />
          <p className="text-base font-bold text-slate-900">{dataGb} GB</p>
          <p className="text-[11px] text-slate-400">Data Usage</p>
        </div>
      </div>
    </div>
  )
}

function Legend2({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-5 mt-3 justify-center">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />{i.label}
        </span>
      ))}
    </div>
  )
}

function ChartTip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{format(new Date(label), 'EEE, MMM d')}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <span className="font-semibold">{formatCurrency(Number(p.value), currency)}</span>
        </p>
      ))}
    </div>
  )
}

function toCumulative(rows: any[]) {
  let net = 0
  let commission = 0
  let gross = 0
  return rows.map((r) => {
    net += r.net_revenue
    commission += r.commission
    gross += r.gross_revenue
    return { ...r, net_revenue: net, commission, gross_revenue: gross }
  })
}

function OverviewTip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload ?? {}
  const commission = Number(row.commission ?? 0)
  const net = Number(row.net_revenue ?? 0)
  const gross = Number(row.gross_revenue ?? 0)
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2.5 text-xs min-w-[200px]">
      {label && <p className="font-semibold text-slate-700 mb-2">{format(new Date(label), 'EEE, MMMM d yyyy')}</p>}
      <div className="space-y-1">
        <p className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-800" />Agent Commission</span>
          <span className="font-semibold">{formatCurrency(commission, currency)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Net Proceeds</span>
          <span className="font-semibold">{formatCurrency(net, currency)}</span>
        </p>
      </div>
      <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between gap-4">
        <span className="text-slate-500">Total (Gross)</span>
        <span className="font-semibold text-slate-800">{formatCurrency(gross, currency)}</span>
      </div>
    </div>
  )
}
