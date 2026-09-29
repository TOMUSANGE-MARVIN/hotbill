'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown } from 'lucide-react'

export function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${accent ? 'text-brand-100' : 'text-gray-500'}`}>{label}</span>
        <Icon size={16} className={accent ? 'text-brand-200' : 'text-gray-400'} />
      </div>
      <p className={`text-2xl font-bold mt-2 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-brand-100' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

export function Card({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">{title}</h2>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}

const HEALTH: Record<string, { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'bg-green-50 text-green-700' },
  quiet: { label: 'Quiet 7d+', cls: 'bg-amber-50 text-amber-700' },
  router_offline: { label: 'Router offline', cls: 'bg-red-50 text-red-600' },
  no_sales: { label: 'No sales yet', cls: 'bg-gray-100 text-gray-600' },
  setup: { label: 'No router', cls: 'bg-gray-100 text-gray-500' },
  suspended: { label: 'Suspended', cls: 'bg-red-100 text-red-700' },
}

export function HealthBadge({ health }: { health: string }) {
  const h = HEALTH[health] ?? { label: health, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${h.cls}`}>{h.label}</span>
}

export const HEALTH_OPTIONS = Object.entries(HEALTH).map(([value, h]) => ({ value, label: h.label }))

const PLANS = ['free', 'pro', 'enterprise'] as const
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

export function PlanBadge({ plan, onChange }: { plan: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {plan}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute z-10 top-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
          {PLANS.map((p) => (
            <button
              key={p}
              onClick={() => { onChange(p); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function VoucherCommissionControl({
  enabled,
  rate,
  onChange,
}: {
  enabled: boolean
  rate: number
  onChange: (payload: { voucher_commission_enabled?: boolean; voucher_commission_rate?: number }) => void
}) {
  const [draft, setDraft] = useState(String(rate))

  const commitRate = () => {
    const parsed = Math.min(100, Math.max(0, Number(draft)))
    if (Number.isFinite(parsed) && parsed !== rate) {
      onChange({ voucher_commission_rate: parsed })
    }
    setDraft(String(Number.isFinite(parsed) ? parsed : rate))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange({ voucher_commission_enabled: !enabled })}
        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${enabled ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}
      >
        {enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {enabled ? 'On' : 'Off'}
      </button>
      <div className={`flex items-center ${enabled ? '' : 'opacity-40'}`}>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          disabled={!enabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRate}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          className="w-14 text-xs border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-700 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-gray-400 ml-1">%</span>
      </div>
    </div>
  )
}

/** Suspending now really locks the business out of its dashboard, so ask first. */
export function StatusToggle({ active, name, onChange }: { active: boolean; name?: string; onChange: (v: boolean) => void }) {
  const toggle = () => {
    const msg = active
      ? `Suspend ${name ?? 'this business'}? Its team will be locked out of the dashboard and withdrawals. The hotspot keeps serving customers.`
      : `Reactivate ${name ?? 'this business'}?`
    if (confirm(msg)) onChange(!active)
  }
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${active ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}
    >
      {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {active ? 'Active' : 'Suspended'}
    </button>
  )
}

export function apiError(e: any, fallback = 'Something went wrong.'): string {
  return e?.response?.data?.message ?? fallback
}
