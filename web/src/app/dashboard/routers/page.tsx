'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState, useMemo } from 'react'
import { cn, formatDateTime } from '@/lib/utils'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Activity, Clock, Users, Cpu, MemoryStick, ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default function RouterObservabilityPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
    refetchInterval: 30000,
  })

  const router = useMemo(() => {
    if (!routers.length) return null
    return routers.find((r: any) => r.id === selectedId) ?? routers[0]
  }, [routers, selectedId])

  const { data: stats = [] } = useQuery({
    queryKey: ['router-stats', router?.id],
    queryFn: () => api.get(`/routers/${router!.id}/stats`).then((r) => r.data),
    enabled: !!router?.id,
    refetchInterval: 30000,
  })

  const series = useMemo(
    () =>
      (stats as any[]).map((s) => {
        const total = Number(s.total_memory) || 0
        const free = Number(s.free_memory) || 0
        const memPct = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0
        return {
          t: s.recorded_at,
          cpu: Number(s.cpu_load) || 0,
          memory: memPct,
          users: Number(s.active_users) || 0,
        }
      }),
    [stats]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!router) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Router Observability</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No routers yet.{' '}
          <Link href="/dashboard/settings/routers" className="text-green-600 hover:underline">
            Add one in Settings → Routers
          </Link>
          .
        </div>
      </div>
    )
  }

  const online = router.status === 'online'
  const memPct =
    router.total_memory > 0
      ? Math.round(((router.total_memory - router.free_memory) / router.total_memory) * 1000) / 10
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-green-600" size={22} />
            <h1 className="text-2xl font-bold text-gray-900">Router Observability</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            RouterBoard: <span className="font-medium text-gray-700">{router.model ?? router.identity ?? '—'}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Router selector */}
          {routers.length > 1 && (
            <div className="relative">
              <select
                value={router.id}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="appearance-none border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {routers.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className={cn('flex items-center gap-1.5 font-medium', online ? 'text-green-600' : 'text-gray-400')}>
              {online ? <Wifi size={15} /> : <WifiOff size={15} />}
              {online ? 'Online' : 'Offline'}
            </span>
            <span className="text-gray-400">
              Last sync: {router.last_seen_at ? formatDateTime(router.last_seen_at) : 'never'}
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Uptime" value={router.uptime ?? '—'} />
        <StatCard icon={Users} label="Active Users" value={String(router.active_users ?? 0)} />
        <StatCard icon={Cpu} label="CPU Load" value={router.cpu_load != null ? `${router.cpu_load}%` : '—'} />
        <StatCard icon={MemoryStick} label="Memory Usage" value={memPct != null ? `${memPct}%` : '—'} />
      </div>

      {/* CPU & Memory chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">CPU &amp; Memory Usage</h2>
        {series.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'HH:mm')} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip labelFormatter={(l) => format(new Date(l), 'MMM d, HH:mm')} />
              <Legend />
              <Area type="monotone" dataKey="cpu" stroke="#16a34a" fill="url(#cpuFill)" name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#6366f1" fill="url(#memFill)" name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active users chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Active Users Over Time</h2>
        {series.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'HH:mm')} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(l) => format(new Date(l), 'MMM d, HH:mm')} />
              <Line type="monotone" dataKey="users" stroke="#f59e0b" strokeWidth={2} dot={false} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon size={16} className="text-gray-400" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
      No data yet — waiting for the router heartbeat.
    </div>
  )
}
