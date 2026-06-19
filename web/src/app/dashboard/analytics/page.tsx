'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatBytes } from '@/lib/utils'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { format } from 'date-fns'
import { Database, Users, Clock, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

function fmtDuration(seconds: number) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const from = format(new Date(Date.now() - (days - 1) * 86400000), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['usage-analytics', from, to],
    queryFn: () => api.get('/analytics/usage', { params: { from, to } }).then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const o = data?.overview ?? {}
  const series = (data?.data_over_time ?? []) as { date: string; bytes: number }[]
  const topUsers = data?.top_users ?? []
  const perPackage = (data?.data_per_package ?? []) as { package: string; bytes: number }[]
  const barColors = ['#4F4AD7', '#0ea5e9', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="text-brand-600" size={22} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-sm text-gray-500">Measured from real hotspot sessions on your routers.</p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
        </select>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard icon={Database} label="Total Data Usage" value={formatBytes(o.total_data_bytes ?? 0)} sub="Data consumed in period" delta={o.deltas?.data} />
        <OverviewCard icon={Users} label="Unique Users" value={String(o.unique_users ?? 0)} sub="Unique users in period" delta={o.deltas?.users} />
        <OverviewCard icon={Clock} label="Avg Session Duration" value={fmtDuration(o.avg_session_seconds ?? 0)} sub="Average time per session" />
        <OverviewCard icon={BarChart3} label="Total Sessions" value={String(o.total_sessions ?? 0)} sub="Total connections in period" delta={o.deltas?.sessions} />
      </div>

      {/* Data usage over time */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800">Data Usage Over Time</h2>
        <p className="text-xs text-gray-500 mb-4">Daily data consumption across all hotspots</p>
        {series.every((s) => s.bytes === 0) ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="dataFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F4AD7" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4F4AD7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM dd')} minTickGap={30} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBytes(v)} width={70} />
              <Tooltip formatter={(v: any) => formatBytes(v)} labelFormatter={(l) => format(new Date(l), 'EEE, MMM d')} />
              <Area type="monotone" dataKey="bytes" stroke="#4F4AD7" fill="url(#dataFill)" name="Data" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* User activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top data users */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={16} /> Top Data Users</h2>
            <p className="text-xs text-gray-500">Users consuming the most data in the selected period</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 font-medium">Rank</th>
                <th className="text-left px-5 py-2.5 font-medium">Customer</th>
                <th className="text-right px-5 py-2.5 font-medium">Data Usage</th>
                <th className="text-right px-5 py-2.5 font-medium">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topUsers.map((u: any, i: number) => (
                <tr key={u.username} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">#{i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{u.phone}</p>
                    {u.package && <p className="text-xs text-gray-400">{u.package}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{formatBytes(u.bytes)}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{u.sessions}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No usage recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Data per package */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Database size={16} /> Data Usage Per Package</h2>
          <p className="text-xs text-gray-500 mb-4">Total bandwidth consumption by package</p>
          {perPackage.length === 0 ? (
            <EmptyState small />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perPackage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="package" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatBytes(v)} width={60} />
                <Tooltip formatter={(v: any) => formatBytes(v)} />
                <Bar dataKey="bytes" radius={[4, 4, 0, 0]}>
                  {perPackage.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewCard({ icon: Icon, label, value, sub, delta }: { icon: any; label: string; value: string; sub: string; delta?: number | null }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon size={16} className="text-gray-400" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
      {delta != null && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${delta >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta >= 0 ? '+' : ''}{delta}% vs last period
        </p>
      )}
    </div>
  )
}

function EmptyState({ small }: { small?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center text-gray-400 ${small ? 'h-[200px]' : 'h-[240px]'}`}>
      <Database size={28} className="text-gray-300 mb-2" />
      <p className="text-sm">No usage recorded yet.</p>
      <p className="text-xs mt-1">Data appears here as customers use the hotspot.</p>
    </div>
  )
}
