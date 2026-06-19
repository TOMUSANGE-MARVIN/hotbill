'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useMemo, useRef, useState, useEffect } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { format } from 'date-fns'
import {
  Plus, Search, LayoutGrid, FileText, Download, SlidersHorizontal,
  Calendar, ChevronDown, MoreHorizontal, Check, X,
} from 'lucide-react'

type TabKey = 'all' | 'admin' | 'system' | 'trash'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Created by Admin' },
  { key: 'system', label: 'System Generated' },
  { key: 'trash', label: 'Trash' },
]

const ALL_COLUMNS = [
  { key: 'username', label: 'Username' },
  { key: 'package', label: 'Package' },
  { key: 'status', label: 'Status' },
  { key: 'first_login', label: 'First Login' },
  { key: 'expires_on', label: 'Expires On' },
  { key: 'use_case', label: 'Use Case' },
  { key: 'note', label: 'Note' },
  { key: 'created_on', label: 'Created On' },
] as const
type ColKey = (typeof ALL_COLUMNS)[number]['key']

function statusPill(status: string) {
  switch (status) {
    case 'unused':
      return { label: 'PROVISIONED', cls: 'bg-gray-900 text-white' }
    case 'active':
      return { label: 'ACTIVE', cls: 'bg-brand-100 text-brand-700' }
    case 'expired':
      return { label: 'EXPIRED', cls: 'bg-red-100 text-red-700' }
    case 'revoked':
      return { label: 'REVOKED', cls: 'bg-gray-200 text-gray-500' }
    default:
      return { label: status.toUpperCase(), cls: 'bg-gray-100 text-gray-600' }
  }
}

export default function VouchersPage() {
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const currency = tenant?.currency ?? 'UGX'

  const [tab, setTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [packageFilter, setPackageFilter] = useState<string>('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  )
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', package_id: '', quantity: 10, code_length: 8, prefix: '' })

  const { data: vouchersRes } = useQuery({
    queryKey: ['vouchers'],
    queryFn: () => api.get('/vouchers').then((r) => r.data),
  })
  const { data: batchesRes } = useQuery({
    queryKey: ['voucher-batches'],
    queryFn: () => api.get('/voucher-batches').then((r) => r.data),
  })
  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then((r) => r.data),
  })

  const createBatch = useMutation({
    mutationFn: (d: any) => api.post('/voucher-batches', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voucher-batches'] })
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      setShowCreate(false)
    },
  })

  const vouchers: any[] = vouchersRes?.data ?? []
  const batches: any[] = batchesRes?.data ?? []

  const filtered = useMemo(() => {
    let list = vouchers
    if (tab === 'trash') list = list.filter((v) => v.status === 'revoked')
    else if (tab === 'system') list = list.filter((v) => !v.batch_id)
    else list = list.filter((v) => v.status !== 'revoked') // all + admin

    if (packageFilter) list = list.filter((v) => String(v.package_id) === packageFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (v) =>
          v.code?.toLowerCase().includes(q) ||
          v.batch?.name?.toLowerCase().includes(q) ||
          v.used_by_username?.toLowerCase().includes(q)
      )
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortDir === 'desc' ? db - da : da - db
    })
  }, [vouchers, tab, packageFilter, search, sortDir])

  const counts = useMemo(() => {
    const active = vouchers.filter((v) => v.status !== 'revoked')
    return {
      all: active.length,
      admin: active.filter((v) => v.batch_id).length,
      system: vouchers.filter((v) => !v.batch_id).length,
      trash: vouchers.filter((v) => v.status === 'revoked').length,
    }
  }, [vouchers])

  const allChecked = filtered.length > 0 && filtered.every((v) => selected.has(v.id))
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(filtered.map((v) => v.id)))
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exportCsv = () => {
    const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))
    const rows = (selected.size ? filtered.filter((v) => selected.has(v.id)) : filtered)
    const header = cols.map((c) => c.label).join(',')
    const body = rows
      .map((v) =>
        cols
          .map((c) => {
            const val = cellValue(v, c.key, currency)
            return `"${String(val).replace(/"/g, '""')}"`
          })
          .join(',')
      )
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vouchers-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printBatch = (id: number) =>
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/voucher-batches/${id}/print`, '_blank')

  const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))
  const dateRange = useMemo(() => {
    if (!vouchers.length) return null
    const times = vouchers.map((v) => new Date(v.created_at).getTime())
    return { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) }
  }, [vouchers])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>

      {/* ── Tabs + date range ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <div className="flex items-center gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(new Set()) }}
              className={cn(
                'relative pb-3 text-sm font-medium transition-colors',
                tab === t.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-gray-400">{counts[t.key]}</span>
              {tab === t.key && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 mb-2">
          <Calendar size={14} className="text-gray-400" />
          {dateRange
            ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
            : '—'}
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, note, ..."
              className="w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <PackageMenu
            packages={packages}
            value={packageFilter}
            onChange={setPackageFilter}
            currency={currency}
          />
        </div>

        <div className="flex items-center gap-2">
          <ToolbarButton icon={LayoutGrid} label="Generate" onClick={() => setShowCreate(true)} primary />
          <DownloadByNoteMenu batches={batches} onPrint={printBatch} />
          <ToolbarButton icon={Download} label="Export CSV" onClick={exportCsv} />
          <ViewMenu visible={visibleCols} setVisible={setVisibleCols} />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 accent-brand-600"
                />
              </th>
              {cols.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                  {c.key === 'created_on' ? (
                    <button
                      onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      {c.label}
                      <ChevronDown
                        size={13}
                        className={cn('transition-transform', sortDir === 'asc' && 'rotate-180')}
                      />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const checked = selected.has(v.id)
              return (
                <tr
                  key={v.id}
                  className={cn('border-b border-gray-100 hover:bg-gray-50/70', checked && 'bg-brand-50/40')}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(v.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand-600"
                    />
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-4 py-3 whitespace-nowrap">
                      <Cell voucher={v} col={c.key} currency={currency} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={cols.length + 2} className="px-4 py-16 text-center text-sm text-gray-400">
                  No vouchers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold">Generate Voucher Batch</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createBatch.mutate(form) }} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Batch Name / Note</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Package</label>
                <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="">Select package</option>
                  {packages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price, currency)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
                  <input type="number" min="1" max="5000" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Code Length</label>
                  <input type="number" min="6" max="16" value={form.code_length}
                    onChange={(e) => setForm({ ...form, code_length: +e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Prefix</label>
                  <input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} maxLength={5}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={createBatch.isPending}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-sm text-white hover:bg-brand-700">
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

/* ── Helpers / sub-components ──────────────────────────────── */

function cellValue(v: any, col: ColKey, currency: string): string {
  switch (col) {
    case 'username': return v.code
    case 'package': return v.package?.name ?? '—'
    case 'status': return statusPill(v.status).label
    case 'first_login': return v.used_at ? format(new Date(v.used_at), 'EEE dd/MM/yyyy HH:mm') : 'Never'
    case 'expires_on': return v.expires_at ? format(new Date(v.expires_at), 'EEE dd/MM/yyyy HH:mm') : 'Never'
    case 'use_case': return v.batch_id ? 'Batch Create' : 'System'
    case 'note': return v.batch?.name ?? '—'
    case 'created_on': return format(new Date(v.created_at), 'EEE dd/MM/yyyy HH:mm')
    default: return ''
  }
}

function Cell({ voucher: v, col, currency }: { voucher: any; col: ColKey; currency: string }) {
  if (col === 'username') return <span className="font-semibold text-gray-900">{v.code}</span>
  if (col === 'package') return <span className="text-gray-600">{v.package?.name ?? '—'}</span>
  if (col === 'status') {
    const p = statusPill(v.status)
    return <span className={cn('inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide', p.cls)}>{p.label}</span>
  }
  if (col === 'expires_on' && !v.expires_at) return <span className="text-gray-400">Never</span>
  if (col === 'first_login' && !v.used_at) return <span className="text-gray-700">Never</span>
  if (col === 'note') return <span className="text-gray-600">{v.batch?.name ?? '—'}</span>
  return <span className="text-gray-700">{cellValue(v, col, currency)}</span>
}

function ToolbarButton({
  icon: Icon, label, onClick, primary,
}: { icon: any; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
        primary
          ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      )}
    >
      <Icon size={15} className="text-gray-500" />
      {label}
    </button>
  )
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return ref
}

function PackageMenu({
  packages, value, onChange, currency,
}: { packages: any[]; value: string; onChange: (v: string) => void; currency: string }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const active = packages.find((p) => String(p.id) === value)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium',
          value ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        )}
      >
        <Plus size={15} className={value ? 'text-brand-600' : 'text-gray-500'} />
        {active ? active.name : 'Package'}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            All packages
            {!value && <Check size={14} className="text-brand-600" />}
          </button>
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(String(p.id)); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span>{p.name}</span>
              {String(p.id) === value && <Check size={14} className="text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DownloadByNoteMenu({ batches, onPrint }: { batches: any[]; onPrint: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <FileText size={15} className="text-gray-500" />
        Download by Note
        <ChevronDown size={13} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {batches.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No batches yet.</p>}
          {batches.map((b) => (
            <button
              key={b.id}
              onClick={() => { onPrint(b.id); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="truncate">{b.name}</span>
              <Download size={13} className="ml-2 shrink-0 text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ViewMenu({
  visible, setVisible,
}: { visible: Set<ColKey>; setVisible: (s: Set<ColKey>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const toggle = (key: ColKey) => {
    const next = new Set(visible)
    next.has(key) ? next.delete(key) : next.add(key)
    setVisible(next)
  }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal size={15} className="text-gray-500" />
        View
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase text-gray-400">Columns</p>
          {ALL_COLUMNS.map((c) => (
            <button
              key={c.key}
              onClick={() => toggle(c.key)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {c.label}
              {visible.has(c.key) && <Check size={14} className="text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
