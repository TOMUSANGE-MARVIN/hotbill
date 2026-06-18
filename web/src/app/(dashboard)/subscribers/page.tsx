'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { cn, statusColor, formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, Search, UserX, UserCheck, RefreshCw } from 'lucide-react'

export default function SubscribersPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    username: '', full_name: '', phone: '', email: '',
    type: 'hotspot', package_id: '', router_id: '', password: ''
  })

  const { data, isLoading } = useQuery({
    queryKey: ['subscribers', search, status],
    queryFn: () => api.get('/subscribers', { params: { search, status } }).then((r) => r.data),
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data),
  })

  const { data: routers = [] } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
  })

  const addSub = useMutation({
    mutationFn: (d: any) => api.post('/subscribers', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscribers'] }); setShowAdd(false) },
  })

  const suspendSub = useMutation({
    mutationFn: (id: number) => api.post(`/subscribers/${id}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  })

  const activateSub = useMutation({
    mutationFn: (id: number) => api.post(`/subscribers/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  })

  const subs = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> Add Subscriber
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, phone..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Username</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Full Name</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Type</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Expires</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subs.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-gray-800">{sub.username}</td>
                <td className="px-5 py-3 text-gray-700">{sub.full_name ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">{sub.package?.name ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{sub.type}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor(sub.status))}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {sub.expires_at ? formatDate(sub.expires_at) : 'No expiry'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {sub.status === 'active' ? (
                      <button
                        onClick={() => suspendSub.mutate(sub.id)}
                        className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600" title="Suspend"
                      >
                        <UserX size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => activateSub.mutate(sub.id)}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Activate"
                      >
                        <UserCheck size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && subs.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No subscribers found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">Add Subscriber</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); addSub.mutate(form) }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
                <F label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <F label="Password (auto if empty)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="hotspot">Hotspot</option>
                    <option value="pppoe">PPPoE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                  <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Select package</option>
                    {packages.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Router</label>
                <select value={form.router_id} onChange={(e) => setForm({ ...form, router_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">No router assigned</option>
                  {routers.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={addSub.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                  {addSub.isPending ? 'Adding...' : 'Add Subscriber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  )
}
