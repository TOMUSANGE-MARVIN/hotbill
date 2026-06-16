'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Wifi, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const http = axios.create({ baseURL: API, headers: { Accept: 'application/json' } })

export default function PortalPage() {
  return (
    <Suspense fallback={<Splash><Loader2 className="animate-spin" /> Loading…</Splash>}>
      <Portal />
    </Suspense>
  )
}

function Portal() {
  const params = useParams()
  const search = useSearchParams()
  const routerId = String(params.router)
  const ref = search.get('ref')
  const mac = search.get('mac') ?? undefined
  const ip = search.get('ip') ?? undefined
  const linkLogin = search.get('link-login-only') ?? undefined

  // returning from PesaPal → verification flow
  if (ref) return <Verify reference={ref} />

  return <Select routerId={routerId} mac={mac} ip={ip} linkLogin={linkLogin} />
}

function Select({ routerId, mac, ip, linkLogin }: { routerId: string; mac?: string; ip?: string; linkLogin?: string }) {
  const [data, setData] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    http.get(`/portal/routers/${routerId}/packages`)
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load packages for this network.'))
      .finally(() => setLoading(false))
  }, [routerId])

  const pay = async () => {
    if (!selected || !phone.trim()) return
    setPaying(true); setError(null)
    try {
      const res = await http.post('/portal/pay', {
        router_id: Number(routerId),
        package_id: selected.id,
        phone: phone.trim(),
        provider,
        mac, ip, link_login: linkLogin,
      })
      window.location.href = res.data.redirect_url
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Could not start payment. Please try again.')
      setPaying(false)
    }
  }

  if (loading) return <Splash><Loader2 className="animate-spin" /> Loading packages…</Splash>

  return (
    <Shell org={data?.organization}>
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      <h2 className="text-sm font-medium text-gray-500 mb-3">Choose a package</h2>
      <div className="space-y-2.5">
        {(data?.packages ?? []).map((p: any) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className={`w-full text-left rounded-xl border p-4 transition ${selected?.id === p.id ? 'border-green-500 ring-2 ring-green-100 bg-green-50/40' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.duration_label} · {p.speed_label}
                  {p.data_limit_mb ? ` · ${(p.data_limit_mb / 1024).toFixed(1)} GB` : ' · Unlimited data'}
                </p>
              </div>
              <span className="font-bold text-green-600 whitespace-nowrap">
                {data?.currency} {Number(p.price).toLocaleString()}
              </span>
            </div>
          </button>
        ))}
        {data?.packages?.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No packages available right now.</p>
        )}
      </div>

      {selected && (
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay with</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('mtn')}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition ${provider === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-100' : 'border-gray-200 text-gray-600'}`}
              >
                MTN MoMo
              </button>
              <button
                type="button"
                onClick={() => setProvider('airtel')}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition ${provider === 'airtel' ? 'border-red-400 bg-red-50 text-red-600 ring-2 ring-red-100' : 'border-gray-200 text-gray-600'}`}
              >
                Airtel Money
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{provider === 'mtn' ? 'MTN' : 'Airtel'} Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder={provider === 'mtn' ? '077XXXXXXX / 078XXXXXXX' : '070XXXXXXX / 075XXXXXXX'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={pay}
            disabled={paying || !phone.trim()}
            className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? <><Loader2 size={16} className="animate-spin" /> Starting payment…</> : `Pay ${data?.currency} ${Number(selected.price).toLocaleString()}`}
          </button>
          <p className="text-[11px] text-gray-400 text-center">Approve the prompt on your phone to complete payment. A PesaPal page may open first.</p>
        </div>
      )}
    </Shell>
  )
}

function Verify({ reference }: { reference: string }) {
  const [order, setOrder] = useState<any>(null)
  const [failed, setFailed] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const r = await http.get(`/portal/orders/${reference}/status`)
        if (!active) return
        if (r.data.status === 'paid') { setOrder(r.data); return }
        if (r.data.status === 'failed' || r.data.status === 'expired') { setFailed(true); return }
        setTimeout(poll, 4000)
      } catch {
        if (active) setTimeout(poll, 5000)
      }
    }
    poll()
    return () => { active = false }
  }, [reference])

  // Auto-submit the hotspot login once we have credentials + a login URL.
  useEffect(() => {
    if (order?.username && order?.link_login && formRef.current) {
      const t = setTimeout(() => formRef.current?.submit(), 1200)
      return () => clearTimeout(t)
    }
  }, [order])

  if (failed) {
    return (
      <Shell>
        <div className="text-center py-8">
          <XCircle className="mx-auto text-red-500 mb-3" size={40} />
          <p className="font-semibold text-gray-900">Payment not completed</p>
          <p className="text-sm text-gray-500 mt-1">Your payment didn&apos;t go through. Please try again.</p>
          <button onClick={() => history.back()} className="mt-4 text-green-600 text-sm font-medium">← Back to packages</button>
        </div>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell>
        <div className="text-center py-10">
          <Loader2 className="mx-auto animate-spin text-green-600 mb-3" size={40} />
          <p className="font-semibold text-gray-900">Confirming your payment…</p>
          <p className="text-sm text-gray-500 mt-1">This can take a few moments after you approve on your phone.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="text-center py-6">
        <CheckCircle2 className="mx-auto text-green-500 mb-3" size={44} />
        <p className="font-semibold text-gray-900 text-lg">You&apos;re connected!</p>
        <p className="text-sm text-gray-500 mt-1">{order.package} is now active.</p>

        {order.link_login ? (
          <>
            <p className="text-xs text-gray-400 mt-4">Logging you in…</p>
            <form ref={formRef} action={order.link_login} method="post">
              <input type="hidden" name="username" value={order.username} />
              <input type="hidden" name="password" value={order.password} />
              <input type="hidden" name="dst" value="https://www.google.com" />
              <button type="submit" className="mt-3 bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-green-700">
                Connect Now
              </button>
            </form>
          </>
        ) : (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
            <p className="text-gray-500 mb-2">Use these details on the WiFi login page:</p>
            <p>Username: <span className="font-mono font-semibold">{order.username}</span></p>
            <p>Password: <span className="font-mono font-semibold">{order.password}</span></p>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ org, children }: { org?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white">
            <Wifi size={18} />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{org ?? 'WiFi Hotspot'}</p>
            <p className="text-[11px] text-gray-400">Powered by HotBill</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 gap-2 text-sm">{children}</div>
  )
}
