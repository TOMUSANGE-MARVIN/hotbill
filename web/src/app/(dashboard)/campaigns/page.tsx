'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'
import { cn, statusColor, formatDateTime } from '@/lib/utils'
import { Plus, Send } from 'lucide-react'

export default function CampaignsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', channel: 'sms', message: '', subject: '' })

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  })

  const add = useMutation({
    mutationFn: (d: any) => api.post('/campaigns', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setShowAdd(false) },
  })

  const send = useMutation({
    mutationFn: (id: number) => api.post(`/campaigns/${id}/send`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const list = campaigns?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Channel</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Recipients</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Sent</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs uppercase">{c.channel}</span></td>
                <td className="px-5 py-3 text-gray-600">{c.recipient_count}</td>
                <td className="px-5 py-3 text-gray-600">{c.sent_count}</td>
                <td className="px-5 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs', statusColor(c.status))}>{c.status}</span></td>
                <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(c.created_at)}</td>
                <td className="px-5 py-3">
                  {['draft', 'scheduled'].includes(c.status) && (
                    <button onClick={() => send.mutate(c.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Send size={12} /> Send
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">New Campaign</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); add.mutate(form) }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
                <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              {form.channel === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={add.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                  {add.isPending ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
