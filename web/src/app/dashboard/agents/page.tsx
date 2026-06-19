'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Plus, UserCheck } from 'lucide-react'

export default function AgentsPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', location: '', commission_rate: '0' })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then((r) => r.data),
  })

  const add = useMutation({
    mutationFn: (d: any) => api.post('/agents', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setShowAdd(false) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
          <Plus size={16} /> Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                <UserCheck size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.phone}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Balance</span>
                <span className="font-semibold text-brand-600">{formatCurrency(agent.balance, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Sales</span>
                <span className="font-medium">{formatCurrency(agent.total_sales, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission Rate</span>
                <span className="font-medium">{agent.commission_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subscribers</span>
                <span className="font-medium">{agent.subscribers_count ?? 0}</span>
              </div>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">No agents yet.</div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">Add Agent</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); add.mutate(form) }} className="p-6 space-y-4">
              {[
                { label: 'Full Name', key: 'name', required: true },
                { label: 'Phone', key: 'phone', required: true },
                { label: 'Email', key: 'email' },
                { label: 'Location', key: 'location' },
                { label: 'Commission Rate (%)', key: 'commission_rate' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={add.isPending} className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm">
                  {add.isPending ? 'Adding...' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
