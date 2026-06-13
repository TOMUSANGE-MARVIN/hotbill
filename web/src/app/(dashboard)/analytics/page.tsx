'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatBytes } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-analytics'],
    queryFn: () => api.get('/analytics/usage').then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>

      {/* Session trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Sessions (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data?.session_trend ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(l) => format(new Date(l), 'EEE MMM d')} />
            <Area type="monotone" dataKey="sessions" stroke="#16a34a" fill="#dcfce7" name="Sessions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Users by Data</h2>
          <div className="space-y-2">
            {(data?.top_users ?? []).map((u: any, i: number) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">{u.full_name ?? u.username}</span>
                    <span className="text-gray-600">{formatBytes(u.data_used_mb * 1048576)}</span>
                  </div>
                  {u.data_limit_mb && (
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.min((u.data_used_mb / u.data_limit_mb) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Router usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Router Data Usage</h2>
          <div className="space-y-3">
            {(data?.router_usage ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.active_users} active users</p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>↓ {formatBytes(r.data_rx)}</p>
                  <p>↑ {formatBytes(r.data_tx)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
