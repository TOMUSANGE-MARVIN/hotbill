'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import { cn, statusColor, formatDateTime } from '@/lib/utils'
import { Plus, RefreshCw, Terminal, Copy, Check, Wifi, WifiOff, Wand2 } from 'lucide-react'

export default function RoutersPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [scriptRouter, setScriptRouter] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', ip_address: '', api_port: 8728, api_username: 'admin', api_password: '' })

  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
    refetchInterval: 30000,
  })

  const addRouter = useMutation({
    mutationFn: (data: any) => api.post('/routers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routers'] }); setShowAdd(false) },
  })

  const testConnection = useMutation({
    mutationFn: (id: number) => api.post(`/routers/${id}/test-connection`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routers'] }),
  })

  const fetchScript = async (router: any) => {
    const res = await api.get(`/routers/${router.id}/script`)
    setScriptRouter({ ...router, script: res.data.script })
  }

  const copyScript = () => {
    navigator.clipboard.writeText(scriptRouter?.script ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Routers</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> Add Router
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">IP</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">CPU</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Active Users</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Last Seen</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {routers.map((router: any) => (
              <tr key={router.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {router.status === 'online'
                      ? <Wifi size={14} className="text-green-500" />
                      : <WifiOff size={14} className="text-gray-400" />}
                    {router.name}
                    {router.identity && <span className="text-xs text-gray-400">({router.identity})</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{router.ip_address ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor(router.status))}>
                    {router.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{router.cpu_load != null ? `${router.cpu_load}%` : '—'}</td>
                <td className="px-5 py-3 text-gray-600">{router.active_users}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {router.last_seen_at ? formatDateTime(router.last_seen_at) : 'Never'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => testConnection.mutate(router.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      title="Test connection"
                    >
                      <RefreshCw size={13} className={testConnection.isPending ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => fetchScript(router)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      title="Get install script"
                    >
                      <Terminal size={13} />
                    </button>
                    <Link
                      href={`/routers/${router.id}/setup`}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      title="Setup wizard"
                    >
                      <Wand2 size={13} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && routers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No routers yet. Add your first MikroTik router.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Router" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { e.preventDefault(); addRouter.mutate(form) }} className="space-y-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="IP Address" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="API Port" value={String(form.api_port)} onChange={(v) => setForm({ ...form, api_port: +v })} />
              <Field label="API Username" value={form.api_username} onChange={(v) => setForm({ ...form, api_username: v })} />
            </div>
            <Field label="API Password" type="password" value={form.api_password} onChange={(v) => setForm({ ...form, api_password: v })} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
              <button type="submit" disabled={addRouter.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                {addRouter.isPending ? 'Adding...' : 'Add Router'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Script modal */}
      {scriptRouter && (
        <Modal title={`Install Script — ${scriptRouter.name}`} onClose={() => setScriptRouter(null)}>
          <p className="text-xs text-gray-500 mb-3">
            Paste this into your MikroTik terminal (New Terminal). It sets up the heartbeat scheduler and RADIUS.
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono">
              {scriptRouter.script}
            </pre>
            <button
              onClick={copyScript}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded text-white hover:bg-gray-600"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}
