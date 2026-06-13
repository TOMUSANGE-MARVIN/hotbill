'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, DollarSign, CreditCard, Activity } from 'lucide-react'
import { useState } from 'react'
import { format, subDays } from 'date-fns'

export default function DashboardPage() {
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'

  const [range, setRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', range],
    queryFn: () =>
      api.get('/analytics/dashboard', { params: range }).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const d = data ?? {}

  return (
    <div className="space-y-6">
      {/* Title + date range */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Net Sales"
          value={formatCurrency(d.net_sales ?? 0, currency)}
          sub={`Agents: ${formatCurrency(d.agent_sales ?? 0, currency)} | MM: ${formatCurrency(d.mm_sales ?? 0, currency)}`}
          icon={<TrendingUp size={18} className="text-green-600" />}
        />
        <KpiCard
          title="Commission"
          value={formatCurrency(d.commission ?? 0, currency)}
          sub={`Agents: ${formatCurrency(d.agent_commission ?? 0, currency)} | MM: ${formatCurrency(d.mm_commission ?? 0, currency)}`}
          icon={<DollarSign size={18} className="text-blue-600" />}
        />
        <KpiCard
          title="Account Credit"
          value={formatCurrency(0, currency)}
          sub="Net prepaid balance."
          icon={<CreditCard size={18} className="text-purple-600" />}
        />
        <SystemInsightsCard data={d} />
      </div>

      {/* Charts + recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Overview</h2>
              <p className="text-xs text-gray-400">{range.start} – {range.end}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.daily ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => format(new Date(v), 'MMM d')}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value), currency), '']}
                labelFormatter={(label) => format(new Date(label), 'EEE, MMM d yyyy')}
              />
              <Legend />
              <Bar dataKey="net_revenue" name="Net Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="Commission" fill="#1e293b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gross_revenue" name="Gross Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Recent Sales</h2>
          <p className="text-xs text-gray-400 mb-4">
            You made {d.recent_sales?.length ?? 0} sales today.
          </p>
          <div className="space-y-3">
            {(d.recent_sales ?? []).map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {(sale.subscriber?.full_name ?? sale.subscriber?.username ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {sale.subscriber?.full_name ?? sale.subscriber?.username ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(sale.paid_at)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +{formatCurrency(sale.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, sub, icon }: {
  title: string; value: string; sub: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function SystemInsightsCard({ data }: { data: any }) {
  const isOnline = (data.active_users ?? 0) > 0 || (data.avg_cpu ?? 0) > 0
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">System Insights</span>
        <span className="flex items-center gap-1 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm mt-2">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{data.active_users ?? 0}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{data.avg_cpu ?? 0}%</p>
          <p className="text-xs text-gray-400">CPU</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{data.total_data_gb ?? 0} GB</p>
          <p className="text-xs text-gray-400">Data Usage</p>
        </div>
      </div>
      {/* mini progress bar */}
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full">
        <div
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${Math.min(data.avg_cpu ?? 0, 100)}%` }}
        />
      </div>
    </div>
  )
}
