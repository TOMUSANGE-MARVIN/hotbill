'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { Terminal, Play } from 'lucide-react'

export default function RemoteAccessPage() {
  const { data: routers = [] } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
  })

  const [routerId, setRouterId] = useState('')
  const [command, setCommand] = useState('/system/resource/print')
  const [output, setOutput] = useState<any>(null)
  const [error, setError] = useState('')

  const run = useMutation({
    mutationFn: () => api.post(`/routers/${routerId}/command`, { command }),
    onSuccess: (res) => { setOutput(res.data.result); setError('') },
    onError: (err: any) => { setError(err.response?.data?.error ?? 'Command failed'); setOutput(null) },
  })

  const quickCommands = [
    '/system/resource/print',
    '/ip/hotspot/active/print',
    '/interface/print',
    '/ip/address/print',
    '/system/log/print count-only',
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Remote Access</h1>
      <p className="text-sm text-gray-500">Run RouterOS API commands directly on your routers.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Router</label>
          <select value={routerId} onChange={(e) => setRouterId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm max-w-sm">
            <option value="">Select router</option>
            {routers.map((r: any) => (
              <option key={r.id} value={r.id}>{r.name} ({r.ip_address ?? 'no IP'})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quick Commands</label>
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((cmd) => (
              <button key={cmd} onClick={() => setCommand(cmd)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono text-gray-700">
                {cmd}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Command</label>
          <div className="flex gap-2">
            <input value={command} onChange={(e) => setCommand(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="/system/resource/print" />
            <button
              onClick={() => run.mutate()}
              disabled={!routerId || !command || run.isPending}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-700"
            >
              <Play size={14} />
              {run.isPending ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        {output !== null && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Output</span>
            </div>
            <pre className="bg-gray-900 text-brand-400 text-xs rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
