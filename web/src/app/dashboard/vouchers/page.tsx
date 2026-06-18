'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency, formatDate, statusColor, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, Download, Search, Ticket } from 'lucide-react'

export default function VouchersPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'
  const [tab, setTab] = useState<'batches' | 'vouchers'>('batches')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', package_id: '', quantity: 10, code_length: 8, prefix: '' })

  const { data: batches } = useQuery({
    queryKey: ['voucher-batches'],
    queryFn: () => api.get('/voucher-batches').then((r) => r.data),
  })

  const { data: vouchers } = useQuery({
    queryKey: ['vouchers', search],
    queryFn: () => api.get('/vouchers', { params: { search } }).then((r) => r.data),
    enabled: tab === 'vouchers',
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data),
  })

  const createBatch = useMutation({
    mutationFn: (d: any) => api.post('/voucher-batches', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voucher-batches'] }); setShowCreate(false) },
  })

  const printBatch = (id: number) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/voucher-batches/${id}/print`, '_blank')
  }

  const batchList = batches?.data ?? []
  const voucherList = vouchers?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> Generate Batch
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {(['batches', 'vouchers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize',
              tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'batches' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Batch Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Total</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Used</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Remaining</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Unit Price</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batchList.map((batch: any) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <Ticket size={14} className="text-green-500" />
                      {batch.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{batch.package?.name}</td>
                  <td className="px-5 py-3 text-gray-600">{batch.quantity}</td>
                  <td className="px-5 py-3 text-gray-600">{batch.used_count}</td>
                  <td className="px-5 py-3">
                    <span className="text-green-600 font-medium">{batch.quantity - batch.used_count}</span>
                  </td>
                  <td className="px-5 py-3">{formatCurrency(batch.unit_price, currency)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => printBatch(batch.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Download size={12} /> Print PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code..." className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Price</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Used By</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Used At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {voucherList.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-bold text-gray-900 tracking-widest">{v.code}</td>
                    <td className="px-5 py-3 text-gray-600">{v.package?.name}</td>
                    <td className="px-5 py-3">{formatCurrency(v.price, currency)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', statusColor(v.status))}>{v.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{v.used_by_username ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{v.used_at ? formatDate(v.used_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">Generate Voucher Batch</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createBatch.mutate(form) }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Batch Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Package</label>
                <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select package</option>
                  {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price, currency)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input type="number" min="1" max="5000" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code Length</label>
                  <input type="number" min="6" max="16" value={form.code_length} onChange={(e) => setForm({ ...form, code_length: +e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prefix</label>
                  <input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} maxLength={5}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={createBatch.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                  {createBatch.isPending ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
