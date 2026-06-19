'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, Pencil, Trash2, Wifi, Router, ChevronDown, Search, X, Package as PackageIcon } from 'lucide-react'

type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'

const blankForm = {
  name: '',
  type: 'hotspot',
  duration_value: '',
  duration_unit: 'hours' as DurationUnit,
  speed_up_mbps: '',
  speed_down_mbps: '',
  data_value: '',
  data_unit: 'MB' as 'MB' | 'GB',
  price: '',
  billing_starts: 'first_use' as 'first_use' | 'on_purchase',
  // advanced
  burst_up: '',
  burst_down: '',
  pool_name: '',
}

export default function PackagesPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [advanced, setAdvanced] = useState(false)
  const [form, setForm] = useState<any>(blankForm)
  // filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'hotspot' | 'pppoe'>('all')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc' | 'name'>('newest')

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (d: any) => (editing ? api.put(`/packages/${editing.id}`, d) : api.post('/packages', d)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      setShowAdd(false); setEditing(null); setForm(blankForm); setAdvanced(false)
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/packages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  })

  const set = (patch: Partial<typeof blankForm>) => setForm((f: any) => ({ ...f, ...patch }))

  const openNew = () => { setEditing(null); setForm(blankForm); setAdvanced(false); setShowAdd(true) }

  const openEdit = (p: any) => {
    setEditing(p)
    // derive a single value+unit from whichever duration column is set
    let duration_value = '', duration_unit: DurationUnit = 'hours'
    if (p.duration_days) { duration_value = String(p.duration_days); duration_unit = 'days' }
    else if (p.duration_hours) { duration_value = String(p.duration_hours); duration_unit = 'hours' }
    else if (p.duration_minutes) { duration_value = String(p.duration_minutes); duration_unit = 'minutes' }

    const useGb = p.data_limit_mb && p.data_limit_mb % 1024 === 0 && p.data_limit_mb >= 1024
    setForm({
      name: p.name,
      type: p.type,
      duration_value,
      duration_unit,
      speed_up_mbps: p.speed_up ? String(p.speed_up / 1000) : '',
      speed_down_mbps: p.speed_down ? String(p.speed_down / 1000) : '',
      data_value: p.data_limit_mb ? String(useGb ? p.data_limit_mb / 1024 : p.data_limit_mb) : '',
      data_unit: useGb ? 'GB' : 'MB',
      price: String(p.price),
      billing_starts: p.billing_starts ?? 'first_use',
      burst_up: p.burst_up ? String(p.burst_up / 1000) : '',
      burst_down: p.burst_down ? String(p.burst_down / 1000) : '',
      pool_name: p.pool_name ?? '',
    })
    setAdvanced(!!(p.burst_up || p.burst_down || p.pool_name))
    setShowAdd(true)
  }

  const filtered = (packages as any[])
    .filter((p) => typeFilter === 'all' || p.type === typeFilter)
    .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      if (sort === 'name') return String(a.name).localeCompare(String(b.name))
      return (b.id ?? 0) - (a.id ?? 0)
    })

  const submit = () => {
    const v = Number(form.duration_value) || 0
    const payload: any = {
      name: form.name,
      type: form.type,
      price: Number(form.price) || 0,
      billing_starts: form.billing_starts,
      // Mbps → Kbps for the router
      speed_up: form.speed_up_mbps ? Math.round(Number(form.speed_up_mbps) * 1000) : null,
      speed_down: form.speed_down_mbps ? Math.round(Number(form.speed_down_mbps) * 1000) : null,
      // unit → MB
      data_limit_mb: form.data_value ? Math.round(Number(form.data_value) * (form.data_unit === 'GB' ? 1024 : 1)) : null,
      // reset all duration columns, set the chosen one (weeks/months fold into days)
      duration_days: form.duration_unit === 'days' ? v : form.duration_unit === 'weeks' ? v * 7 : form.duration_unit === 'months' ? v * 30 : null,
      duration_hours: form.duration_unit === 'hours' ? v : null,
      duration_minutes: form.duration_unit === 'minutes' ? v : null,
      burst_up: form.burst_up ? Math.round(Number(form.burst_up) * 1000) : null,
      burst_down: form.burst_down ? Math.round(Number(form.burst_down) * 1000) : null,
      pool_name: form.pool_name || null,
    }
    save.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Packages</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your Hotspot packages and PPPoE subscription plans.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> Create Package
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([['all', 'All'], ['hotspot', 'Hotspot'], ['pppoe', 'PPPoE']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}
            className="appearance-none border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <ChevronDown size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Listing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Package</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Speed</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Data Cap</th>
                <th className="px-5 py-3">Subscribers</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((pkg: any) => (
                <tr key={pkg.id} className="hover:bg-gray-50/70">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <PackageIcon size={15} />
                      </span>
                      <span className="font-medium text-gray-800">{pkg.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded capitalize">
                      {pkg.type === 'hotspot' ? <Wifi size={10} /> : <Router size={10} />}{pkg.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-brand-600">{formatCurrency(pkg.price, currency)}</td>
                  <td className="px-5 py-3 text-gray-600">{pkg.speed_label ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{pkg.duration_label ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{pkg.data_limit_mb ? `${(pkg.data_limit_mb / 1024).toFixed(1)} GB` : 'Unlimited'}</td>
                  <td className="px-5 py-3 text-gray-700">{pkg.subscribers_count ?? 0}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                      <button onClick={() => del.mutate(pkg.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                    {packages.length === 0 ? 'No packages yet. Create your first one.' : 'No packages match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">Showing {filtered.length} of {packages.length} packages</p>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Package' : 'Create Hotspot Package'}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submit() }} className="p-6 space-y-5">
              {/* Name */}
              <Label text="Package Name">
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} required placeholder="eg. Daily" className={inputCls} />
              </Label>

              {/* Duration */}
              <Label text="Package Duration">
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min="0" value={form.duration_value} onChange={(e) => set({ duration_value: e.target.value })} placeholder="0" className={inputCls} />
                  <Select value={form.duration_unit} onChange={(v) => set({ duration_unit: v as DurationUnit })}
                    options={[['minutes', 'Minutes'], ['hours', 'Hours'], ['days', 'Days'], ['weeks', 'Weeks'], ['months', 'Months']]} />
                </div>
              </Label>

              {/* Speed */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Speed Limits (Mbps)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Label text="Upload Speed" small>
                    <input type="number" min="0" value={form.speed_up_mbps} onChange={(e) => set({ speed_up_mbps: e.target.value })} placeholder="0" className={inputCls} />
                  </Label>
                  <Label text="Download Speed" small>
                    <input type="number" min="0" value={form.speed_down_mbps} onChange={(e) => set({ speed_down_mbps: e.target.value })} placeholder="0" className={inputCls} />
                  </Label>
                </div>
              </div>

              {/* Data limit */}
              <Label text="Data Limit">
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min="0" value={form.data_value} onChange={(e) => set({ data_value: e.target.value })} placeholder="0 = unlimited" className={inputCls} />
                  <Select value={form.data_unit} onChange={(v) => set({ data_unit: v as 'MB' | 'GB' })} options={[['MB', 'MB'], ['GB', 'GB']]} />
                </div>
              </Label>

              {/* Price */}
              <Label text="Price">
                <input type="number" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} required placeholder={`Min 500, Max 400000`} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Set the amount subscribers pay for this package ({currency}).</p>
              </Label>

              {/* Billing starts */}
              <Label text="Billing Starts On">
                <Select value={form.billing_starts} onChange={(v) => set({ billing_starts: v as any })}
                  options={[['first_use', 'Upon First Use'], ['on_purchase', 'On Purchase']]} />
              </Label>

              {/* Advanced */}
              <div className="border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setAdvanced((a) => !a)} className="w-full flex items-center justify-between text-sm font-medium text-gray-700">
                  Advanced Options
                  <ChevronDown size={16} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />
                </button>
                {advanced && (
                  <div className="mt-3 space-y-4">
                    <Label text="Package Type">
                      <Select value={form.type} onChange={(v) => set({ type: v })} options={[['hotspot', 'Hotspot'], ['pppoe', 'PPPoE']]} />
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Label text="Burst Upload (Mbps)" small>
                        <input type="number" min="0" value={form.burst_up} onChange={(e) => set({ burst_up: e.target.value })} className={inputCls} />
                      </Label>
                      <Label text="Burst Download (Mbps)" small>
                        <input type="number" min="0" value={form.burst_down} onChange={(e) => set({ burst_down: e.target.value })} className={inputCls} />
                      </Label>
                    </div>
                    <Label text="IP Pool (PPPoE)" small>
                      <input value={form.pool_name} onChange={(e) => set({ pool_name: e.target.value })} placeholder="optional" className={inputCls} />
                    </Label>
                  </div>
                )}
              </div>

              <button type="submit" disabled={save.isPending} className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-black disabled:opacity-50">
                {save.isPending ? 'Saving...' : editing ? 'Update Package' : 'Create Package'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function Label({ text, children, small }: { text: string; children: React.ReactNode; small?: boolean }) {
  return (
    <div>
      <label className={`block font-medium text-gray-700 mb-1.5 ${small ? 'text-xs' : 'text-sm'}`}>{text}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-9`}>
        {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
    </div>
  )
}
