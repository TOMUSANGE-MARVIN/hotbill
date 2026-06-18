'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatBytes } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { Building2, Router as RouterIcon, Users, Database, Wallet, TrendingUp, Banknote, ShieldCheck } from 'lucide-react'

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/overview').then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>

  const f = data?.finance ?? {}
  const series = (data?.revenue_series ?? []).map((r: any) => ({ date: r.date, revenue: Number(r.revenue) }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500">System-wide insights across all operators.</p>
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="Platform Revenue" value={formatCurrency(f.platform_revenue ?? 0)} accent />
        <Stat icon={Banknote} label="GMV (gross sales)" value={formatCurrency(f.gmv ?? 0)} />
        <Stat icon={Wallet} label="Operator Wallets" value={formatCurrency(f.operator_wallet_liability ?? 0)} />
        <Stat icon={Banknote} label="Gateway Fees" value={formatCurrency(f.gateway_fees ?? 0)} />
      </div>

      {/* System row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Stat icon={Building2} label="Tenants" value={`${data?.tenants?.active ?? 0}/${data?.tenants?.total ?? 0}`} sub="active / total" />
        <Stat icon={RouterIcon} label="Routers" value={`${data?.routers?.online ?? 0}/${data?.routers?.total ?? 0}`} sub="online / total" />
        <Stat icon={Users} label="Customers" value={String(data?.customers ?? 0)} />
        <Stat icon={Database} label="Data Served" value={formatBytes(data?.data_bytes ?? 0)} />
        <Stat icon={Wallet} label="Pending Payouts" value={formatCurrency(data?.withdrawals?.pending_amount ?? 0)} sub={`${data?.withdrawals?.pending_count ?? 0} request(s)`} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Platform Revenue (commission)</h2>
        {series.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">No revenue yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM dd')} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(l) => format(new Date(l), 'EEE, MMM d')} />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#rev)" name="Commission" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${accent ? 'text-green-100' : 'text-gray-500'}`}>{label}</span>
        <Icon size={16} className={accent ? 'text-green-200' : 'text-gray-400'} />
      </div>
      <p className={`text-2xl font-bold mt-2 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-green-100' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}
