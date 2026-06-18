'use client'

import { useAuthStore } from '@/store/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const { tenant, user } = useAuthStore()

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <PayoutSettings />

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Account info */}
        <div className="p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <Row label="Organization" value={tenant?.name ?? '—'} />
            <Row label="Plan" value={<span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs capitalize">{tenant?.plan}</span>} />
            <Row label="Currency" value={tenant?.currency ?? 'UGX'} />
            <Row label="Admin Email" value={user?.email ?? '—'} />
          </div>
        </div>

        {/* RADIUS */}
        <div className="p-6">
          <h2 className="font-semibold text-gray-800 mb-2">RADIUS Configuration</h2>
          <p className="text-xs text-gray-500 mb-4">
            Configure your FreeRADIUS server to use these endpoints:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono space-y-1 text-gray-700">
            <p><span className="text-gray-400"># authorize</span></p>
            <p>POST {process.env.NEXT_PUBLIC_API_URL}/radius/authorize</p>
            <p className="mt-2"><span className="text-gray-400"># accounting</span></p>
            <p>POST {process.env.NEXT_PUBLIC_API_URL}/radius/accounting</p>
            <p className="mt-2"><span className="text-gray-400"># header required</span></p>
            <p>X-Radius-Secret: your_secret_from_env</p>
          </div>
        </div>

        {/* Mobile Money */}
        <div className="p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Mobile Money</h2>
          <p className="text-xs text-gray-500">
            Configure MTN MoMo and Airtel Money credentials in your <code className="bg-gray-100 px-1 rounded">.env</code> file:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono mt-3 text-gray-700 space-y-1">
            <p>MTN_MOMO_SUBSCRIPTION_KEY=</p>
            <p>MTN_MOMO_API_USER=</p>
            <p>MTN_MOMO_API_KEY=</p>
            <p>AIRTEL_CLIENT_ID=</p>
            <p>AIRTEL_CLIENT_SECRET=</p>
          </div>
        </div>

        {/* SMS */}
        <div className="p-6">
          <h2 className="font-semibold text-gray-800 mb-4">SMS Gateway</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 space-y-1">
            <p>SMS_PROVIDER=africas_talking</p>
            <p>SMS_USERNAME=</p>
            <p>SMS_API_KEY=</p>
            <p>SMS_SENDER_ID=</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function PayoutSettings() {
  const qc = useQueryClient()
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState('mtn')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/tenant').then((r) => r.data),
  })

  useEffect(() => {
    if (data) {
      setPhone(data.payout_phone ?? '')
      setProvider(data.payout_provider ?? 'mtn')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => api.patch('/tenant', { payout_phone: phone, payout_provider: provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-800 mb-1">Payouts</h2>
      <p className="text-xs text-gray-500 mb-4">Where your wallet withdrawals are sent. Earnings from hotspot sales settle here.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="07XXXXXXXX"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="mtn">MTN MoMo</option>
            <option value="airtel">Airtel Money</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-green-600 text-sm">Saved</span>}
      </div>
    </div>
  )
}
