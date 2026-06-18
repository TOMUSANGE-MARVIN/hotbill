'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'
import { Wifi, WifiOff, Cpu } from 'lucide-react'

export default function AdminRoutersPage() {
  return <RoutersList />
}

function RoutersList() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin-routers'],
    queryFn: () => api.get('/admin/routers').then((r) => r.data),
    refetchInterval: 30000,
  })

  const online = data.filter((r) => r.status === 'online').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Routers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every router across all operators.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-700">{online}/{data.length}</div>
          <div className="text-xs text-gray-400">online</div>
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Router', 'Operator', 'Model', 'ROS', 'Status', 'CPU', 'Active Users', 'Last Seen'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                      {r.status === 'online' ? <Wifi size={13} className="text-green-500" /> : <WifiOff size={13} className="text-gray-300" />}
                      {r.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.tenant?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.model ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.ros_version ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'online' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Cpu size={12} className="text-gray-400" />
                      <span className={`text-xs font-medium ${(r.cpu_load ?? 0) > 80 ? 'text-red-600' : 'text-gray-700'}`}>
                        {r.cpu_load != null ? `${r.cpu_load}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.active_users ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {r.last_seen_at ? formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No routers registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
}
