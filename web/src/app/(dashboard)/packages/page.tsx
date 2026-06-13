'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, Pencil, Trash2, Wifi, Router } from 'lucide-react'

export default function PackagesPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const blank = { name: '', type: 'hotspot', price: '', speed_up: '', speed_down: '', data_limit_mb: '', duration_days: '', duration_hours: '', duration_minutes: '' }
  const [form, setForm] = useState<any>(blank)

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (d: any) => editing ? api.put(`/packages/${editing.id}`, d) : api.post('/packages', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packages'] }); setShowAdd(false); setEditing(null); setForm(blank) },
  })

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/packages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  })

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({
      name: p.name, type: p.type, price: p.price,
      speed_up: p.speed_up ?? '', speed_down: p.speed_down ?? '',
      data_limit_mb: p.data_limit_mb ?? '', duration_days: p.duration_days ?? '',
      duration_hours: p.duration_hours ?? '', duration_minutes: p.duration_minutes ?? '',
    })
    setShowAdd(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
        <button
          onClick={() => { setEditing(null); setForm(blank); setShowAdd(true) }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> New Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {packages.map((pkg: any) => (
          <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1">
                  {pkg.type === 'hotspot' ? <Wifi size={10} /> : <Router size={10} />}
                  {pkg.type}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
                  <Pencil size={12} />
                </button>
                <button onClick={() => del.mutate(pkg.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-3">
              {formatCurrency(pkg.price, currency)}
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Speed</span>
                <span className="font-medium text-gray-700">{pkg.speed_label}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration</span>
                <span className="font-medium text-gray-700">{pkg.duration_label}</span>
              </div>
              {pkg.data_limit_mb && (
                <div className="flex justify-between">
                  <span>Data Cap</span>
                  <span className="font-medium text-gray-700">{(pkg.data_limit_mb / 1024).toFixed(1)} GB</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span>Subscribers</span>
                <span className="font-medium text-gray-700">{pkg.subscribers_count ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">{editing ? 'Edit Package' : 'New Package'}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form) }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="hotspot">Hotspot</option>
                    <option value="pppoe">PPPoE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price ({currency})</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Upload Speed (Kbps)</label>
                  <input type="number" value={form.speed_up} onChange={(e) => setForm({ ...form, speed_up: e.target.value })}
                    placeholder="e.g. 2048" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Download Speed (Kbps)</label>
                  <input type="number" value={form.speed_down} onChange={(e) => setForm({ ...form, speed_down: e.target.value })}
                    placeholder="e.g. 5120" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                  <input type="number" min="0" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
                  <input type="number" min="0" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Minutes</label>
                  <input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Cap (MB, leave empty for unlimited)</label>
                <input type="number" min="0" value={form.data_limit_mb} onChange={(e) => setForm({ ...form, data_limit_mb: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={save.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                  {save.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
