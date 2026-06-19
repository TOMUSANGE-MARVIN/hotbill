'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from 'recharts'
import {
  TrendingUp, DollarSign, Users, Cpu, Wifi, HardDrive, ArrowUpRight,
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

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => api.get('/analytics/dashboard', { params: range }).then((r) => r.data),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Net Sales" value={formatCurrency(d.net_sales ?? 0, currency)}
          sub={`Gross ${formatCurrency(d.gross_sales ?? 0, currency)}`} icon={<TrendingUp size={18} />}
          color={C.indigo} spark={daily} sparkKey="net_revenue" />
        <KpiCard title="Commission" value={formatCurrency(d.commission ?? 0, currency)}
          sub={`Agents ${formatCurrency(d.agent_commission ?? 0, currency)}`} icon={<DollarSign size={18} />}
          color={C.emerald} spark={daily} sparkKey="commission" />
        <KpiCard title="Active Subscribers" value={String(d.active_subscribers ?? 0)}
          sub={`${d.expired_today ?? 0} expiring today`} icon={<Users size={18} />}
          color={C.amber} />
        <KpiCard title="Active Users" value={String(d.active_users ?? 0)}
          sub={`${d.total_data_gb ?? 0} GB used`} icon={<Wifi size={18} />}
          color={C.rose} />
      </div>

      {/* Revenue trend + channel donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHead title="Revenue Trend" subtitle={`${range.start} – ${range.end}`} />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.indigo} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.indigo} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.emerald} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} />
              <Tooltip content={<ChartTip currency={currency} />} />
              <Area type="monotone" dataKey="gross_revenue" name="Gross" stroke={C.indigo} strokeWidth={2.5} fill="url(#gGross)" />
              <Area type="monotone" dataKey="net_revenue" name="Net" stroke={C.emerald} strokeWidth={2.5} fill="url(#gNet)" />
            </AreaChart>
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

      {/* Daily breakdown + system insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
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

        <Card>
          <CardHead title="System Insights" subtitle="Live router health" />
          <div className="relative">
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: cpu, fill: cpu > 80 ? C.rose : C.sky }]}
                startAngle={210} endAngle={-30}>
                <RadialBar background={{ fill: '#eef2f7' }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900">{cpu}%</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Cpu size={12} /> Avg CPU</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <MiniStat icon={<Wifi size={15} className="text-indigo-500" />} label="Active Users" value={String(d.active_users ?? 0)} />
            <MiniStat icon={<HardDrive size={15} className="text-emerald-500" />} label="Data Used" value={`${d.total_data_gb ?? 0} GB`} />
          </div>
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <CardHead title="Recent Sales" subtitle={`Latest ${d.recent_sales?.length ?? 0} transactions`} />
        <div className="divide-y divide-slate-100">
          {(d.recent_sales ?? []).map((sale: any) => (
            <div key={sale.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${C.indigo},${C.violet})` }}>
                  {(sale.subscriber?.full_name ?? sale.subscriber?.username ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {sale.subscriber?.full_name ?? sale.subscriber?.username ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400">{formatDateTime(sale.paid_at)} · {sale.method?.replace('_', ' ')}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <ArrowUpRight size={14} />{formatCurrency(sale.amount, currency)}
              </span>
            </div>
          ))}
          {(d.recent_sales ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-6">No recent sales.</p>}
        </div>
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
            <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`s-${sparkKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey={sparkKey} stroke={color} strokeWidth={2} fill={`url(#s-${sparkKey})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">{icon}{label}</div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
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
