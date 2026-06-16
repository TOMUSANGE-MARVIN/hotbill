'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { cn, statusColor, formatDateTime } from '@/lib/utils'
import {
  Plus, Copy, Check, Terminal, MoreVertical, Pencil, Settings2, Globe,
  Activity, KeyRound, Power, Trash2, Wifi, WifiOff,
} from 'lucide-react'

export default function RoutersSettingsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [scriptRouter, setScriptRouter] = useState<any>(null)
  const [renameRouter, setRenameRouter] = useState<any>(null)
  const [pwRouter, setPwRouter] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', ip_address: '', api_port: 8728, api_username: 'admin', api_password: '' })

  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
    refetchInterval: 30000,
  })

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const invalidate = () => qc.invalidateQueries({ queryKey: ['routers'] })

  const addRouter = useMutation({
    mutationFn: (data: any) => api.post('/routers', data),
    onSuccess: () => { invalidate(); setShowAdd(false); flash('Router added') },
  })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.patch(`/routers/${id}`, { name }),
    onSuccess: () => { invalidate(); setRenameRouter(null); flash('Router renamed') },
  })
  const testConnection = useMutation({
    mutationFn: (id: number) => api.post(`/routers/${id}/test-connection`),
    onSuccess: (r: any) => { invalidate(); flash(r.data?.success ? `Connected: ${r.data.identity}` : 'Connection failed') },
    onError: (e: any) => flash(e.response?.data?.message ?? 'Connection failed'),
  })
  const reboot = useMutation({
    mutationFn: (id: number) => api.post(`/routers/${id}/reboot`),
    onSuccess: () => { invalidate(); flash('Reboot command sent') },
    onError: (e: any) => flash(e.response?.data?.message ?? 'Reboot failed'),
  })
  const updatePassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => api.post(`/routers/${id}/admin-password`, { password }),
    onSuccess: (r: any) => { setPwRouter(null); flash(r.data?.message ?? 'Password updated') },
    onError: (e: any) => flash(e.response?.data?.message ?? 'Update failed'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/routers/${id}`),
    onSuccess: () => { invalidate(); flash('Router deleted') },
  })

  const fetchScript = async (router: any) => {
    const res = await api.get(`/routers/${router.id}/script`)
    setScriptRouter({ ...router, script: res.data.script })
  }
  const copyScript = () => {
    navigator.clipboard.writeText(scriptRouter?.script ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const copyAddress = (router: any) => {
    navigator.clipboard.writeText(router.vpn_ip || router.ip_address || '')
    flash('Address copied')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your network infrastructure. Add, configure, and monitor your physical routers.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> Add Router
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Router</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Model / Version</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">CPU Load</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Uptime</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {routers.map((router: any) => (
              <tr key={router.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', router.status === 'online' ? 'bg-green-50' : 'bg-gray-100')}>
                      {router.status === 'online' ? <Wifi size={15} className="text-green-500" /> : <WifiOff size={15} className="text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{router.name}</p>
                      <p className="text-xs text-gray-400 uppercase">{router.identity ?? 'MIKROTIK'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <p className="text-gray-900">{router.model ?? '—'}</p>
                  <p className="text-xs text-gray-400">{router.ros_version ?? ''}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusColor(router.status))}>
                    <Activity size={11} /> {router.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{router.cpu_load != null ? `${router.cpu_load}%` : '—'}</td>
                <td className="px-5 py-3 text-gray-600">{router.uptime ?? '—'}</td>
                <td className="px-5 py-3 text-right">
                  <ActionsMenu
                    router={router}
                    onRename={() => setRenameRouter(router)}
                    onCopyAddress={() => copyAddress(router)}
                    onTest={() => testConnection.mutate(router.id)}
                    onScript={() => fetchScript(router)}
                    onPassword={() => setPwRouter(router)}
                    onReboot={() => { if (confirm(`Reboot "${router.name}"? It will be offline for ~1 minute.`)) reboot.mutate(router.id) }}
                    onDelete={() => { if (confirm(`Delete "${router.name}"? This cannot be undone.`)) remove.mutate(router.id) }}
                  />
                </td>
              </tr>
            ))}
            {!isLoading && routers.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No routers yet. Add your first MikroTik router.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Router" onClose={() => setShowAdd(false)}>
          <form onSubmit={(e) => { e.preventDefault(); addRouter.mutate(form) }} className="space-y-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="IP Address (optional)" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="API Port" value={String(form.api_port)} onChange={(v) => setForm({ ...form, api_port: +v })} />
              <Field label="API Username" value={form.api_username} onChange={(v) => setForm({ ...form, api_username: v })} />
            </div>
            <Field label="API Password" type="password" value={form.api_password} onChange={(v) => setForm({ ...form, api_password: v })} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
              <button type="submit" disabled={addRouter.isPending} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">
                {addRouter.isPending ? 'Adding...' : 'Add Router'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renameRouter && (
        <Modal title={`Rename — ${renameRouter.name}`} onClose={() => setRenameRouter(null)}>
          <RenameForm initial={renameRouter.name} pending={rename.isPending} onSubmit={(name) => rename.mutate({ id: renameRouter.id, name })} />
        </Modal>
      )}

      {pwRouter && (
        <Modal title={`Update Admin Password — ${pwRouter.name}`} onClose={() => setPwRouter(null)}>
          <PasswordForm pending={updatePassword.isPending} onSubmit={(password) => updatePassword.mutate({ id: pwRouter.id, password })} />
        </Modal>
      )}

      {scriptRouter && (
        <Modal title={`Install Script — ${scriptRouter.name}`} onClose={() => setScriptRouter(null)}>
          <p className="text-xs text-gray-500 mb-3">Paste this into your MikroTik terminal (New Terminal). It provisions the API user, RADIUS, WireGuard tunnel, and heartbeat.</p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono">{scriptRouter.script}</pre>
            <button onClick={copyScript} className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded text-white hover:bg-gray-600">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">{toast}</div>
      )}
    </div>
  )
}

function ActionsMenu({ router, onRename, onCopyAddress, onTest, onScript, onPassword, onReboot, onDelete }: {
  router: any; onRename: () => void; onCopyAddress: () => void; onTest: () => void
  onScript: () => void; onPassword: () => void; onReboot: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isOS7 = (router.ros_version ?? '').startsWith('7')

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const run = (fn: () => void) => { setOpen(false); fn() }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 z-50 text-sm">
          <p className="px-3 py-1 text-xs font-semibold text-gray-400">Actions</p>
          <MenuItem icon={Pencil} label="Rename" onClick={() => run(onRename)} />
          <Link href={`/routers/${router.id}/setup`} className="flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50">
            <Settings2 size={15} className="text-gray-400" /> Configuration
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <p className="px-3 py-1 text-xs font-semibold text-gray-400">Remote Access</p>
          <MenuItem icon={Copy} label="Copy Address" onClick={() => run(onCopyAddress)} />
          <button
            disabled={!isOS7}
            title={isOS7 ? 'Coming soon' : 'OS 7 Required'}
            className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-gray-400 cursor-not-allowed"
          >
            <span className="flex items-center gap-2.5"><Globe size={15} /> Winbox Web</span>
            <span className="text-[10px] uppercase">{isOS7 ? 'Soon' : 'OS 7 Required'}</span>
          </button>
          <MenuItem icon={Activity} label="Test Connection" onClick={() => run(onTest)} />
          <MenuItem icon={Terminal} label="Install Script" onClick={() => run(onScript)} />
          <div className="border-t border-gray-100 my-1" />
          <MenuItem icon={KeyRound} label="Update Admin Password" onClick={() => run(onPassword)} />
          <MenuItem icon={Power} label="Reboot Router" onClick={() => run(onReboot)} className="text-orange-600 hover:bg-orange-50" iconClass="text-orange-500" />
          <div className="border-t border-gray-100 my-1" />
          <MenuItem icon={Trash2} label="Delete" onClick={() => run(onDelete)} className="text-red-600 hover:bg-red-50" iconClass="text-red-500" />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, className, iconClass }: {
  icon: any; label: string; onClick: () => void; className?: string; iconClass?: string
}) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50', className)}>
      <Icon size={15} className={cn('text-gray-400', iconClass)} /> {label}
    </button>
  )
}

function RenameForm({ initial, pending, onSubmit }: { initial: string; pending: boolean; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(initial)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name) }} className="space-y-4">
      <Field label="Router Name" value={name} onChange={setName} required />
      <button type="submit" disabled={pending || !name.trim()} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
        {pending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}

function PasswordForm({ pending, onSubmit }: { pending: boolean; onSubmit: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(pw) }} className="space-y-4">
      <p className="text-xs text-gray-500">Sets a new password for the router&apos;s <code className="bg-gray-100 px-1 rounded">admin</code> user. Applied live over the secure tunnel.</p>
      <Field label="New Password" type="password" value={pw} onChange={setPw} required />
      <button type="submit" disabled={pending || pw.length < 4} className="w-full bg-green-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
        {pending ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}
