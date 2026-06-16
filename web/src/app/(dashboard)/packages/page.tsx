'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, Pencil, Trash2, Wifi, Router, ChevronDown } from 'lucide-react'

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
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus size={16} /> Create Package
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
                <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Pencil size={12} /></button>
                <button onClick={() => del.mutate(pkg.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-3">{formatCurrency(pkg.price, currency)}</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex justify-between"><span>Speed</span><span className="font-medium text-gray-700">{pkg.speed_label}</span></div>
              <div className="flex justify-between"><span>Duration</span><span className="font-medium text-gray-700">{pkg.duration_label}</span></div>
              {pkg.data_limit_mb && (
                <div className="flex justify-between"><span>Data Cap</span><span className="font-medium text-gray-700">{(pkg.data_limit_mb / 1024).toFixed(1)} GB</span></div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100"><span>Subscribers</span><span className="font-medium text-gray-700">{pkg.subscribers_count ?? 0}</span></div>
            </div>
          </div>
        ))}
      </div>

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

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

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
