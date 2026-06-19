'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Copy, Check, Loader2, ShieldCheck, Settings as SettingsIcon, Cable, Wifi,
  ArrowRight, ArrowLeft, CheckCircle2, Terminal, Layers, Plus,
} from 'lucide-react'

const SUBNET_OPTIONS = [
  { prefix: 16, hosts: 65534 },
  { prefix: 17, hosts: 32766 },
  { prefix: 18, hosts: 16382 },
  { prefix: 19, hosts: 8190 },
  { prefix: 20, hosts: 4094 },
  { prefix: 21, hosts: 2046 },
  { prefix: 22, hosts: 1022 },
  { prefix: 23, hosts: 510 },
  { prefix: 24, hosts: 254 },
  { prefix: 25, hosts: 126 },
  { prefix: 26, hosts: 62 },
  { prefix: 27, hosts: 30 },
  { prefix: 28, hosts: 14 },
  { prefix: 29, hosts: 6 },
]

const FALLBACK_INTERFACES: IfaceInfo[] = [
  { name: 'ether1', type: 'ether', running: true, disabled: false, is_wan: true },
  { name: 'ether2', type: 'ether', running: false, disabled: false },
  { name: 'ether3', type: 'ether', running: false, disabled: false },
  { name: 'ether4', type: 'ether', running: false, disabled: false },
  { name: 'ether5', type: 'ether', running: false, disabled: false },
  { name: 'wlan1', type: 'wlan', running: false, disabled: true },
]

interface IfaceInfo {
  name: string
  type: string
  running: boolean
  disabled: boolean
  is_wan?: boolean
}

interface BridgeDraft {
  id: string
  name: string
  gatewayIp: string
  subnetPrefix: number
  ports: string[]
  hotspotEnabled: boolean
  pppoeEnabled: boolean
  preventLogin: boolean
  status: 'draft' | 'deploying' | 'deployed' | 'failed'
  bootstrapScript?: string
  error?: string
}

type Step = 1 | 2 | 3 | 'manual'

export function RouterSetupWizard({ routerId, onFinish }: { routerId: string; onFinish: () => void }) {
  const [step, setStep] = useState<Step>(1)
  const [method, setMethod] = useState<'automatic' | 'manual'>('automatic')
  const [copied, setCopied] = useState(false)

  const { data: routerData } = useQuery({
    queryKey: ['router', routerId],
    queryFn: () => api.get(`/routers/${routerId}`).then((r) => r.data),
    refetchInterval: step === 1 ? 5000 : false,
  })

  const { data: scriptData } = useQuery({
    queryKey: ['router-script', routerId],
    queryFn: () => api.get(`/routers/${routerId}/script`).then((r) => r.data),
  })

  const copyScript = () => {
    navigator.clipboard.writeText(scriptData?.script ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayStep = step === 'manual' ? 3 : step

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Automatic Router Setup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your MikroTik RouterOS device with HotBill
          {routerData?.name ? ` — ${routerData.name}` : ''}. First, install the secure
          remote access agent, then visually design your network topology.
        </p>
      </div>

      <StepIndicator step={displayStep} />

      {step === 1 && (
        <Step1
          script={scriptData?.script ?? 'Loading...'}
          copied={copied}
          onCopy={copyScript}
          isOnline={!!routerData?.is_online}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2
          method={method}
          setMethod={setMethod}
          onBack={() => setStep(1)}
          onContinue={() => setStep(method === 'automatic' ? 3 : 'manual')}
        />
      )}

      {step === 'manual' && (
        <ManualPanel onBack={() => setStep(2)} onFinish={onFinish} />
      )}

      {step === 3 && (
        <Step3 routerId={routerId} onBack={() => setStep(2)} onFinish={onFinish} />
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {[1, 2, 3].map((n, idx) => (
        <div key={n} className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
              step > n ? 'bg-brand-500 text-white' : step === n ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
            )}
          >
            {step > n ? <Check size={15} /> : n}
          </div>
          {idx < 2 && <div className={cn('w-16 h-0.5 mx-1', step > n + 0.5 ? 'bg-brand-500' : 'bg-gray-200')} />}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Secure Remote Access ──────────────────────────────

function Step1({ script, copied, onCopy, isOnline, onContinue }: {
  script: string
  copied: boolean
  onCopy: () => void
  isOnline: boolean
  onContinue: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-start gap-3 p-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Step 1: Secure Remote Access</h2>
          <p className="text-sm text-gray-500">Install the HotBill management agent on your router</p>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-800">Remote Access Installation Script</p>
          <p className="text-xs text-gray-500 mb-3">
            Copy this command and paste it into your MikroTik RouterOS terminal (Winbox &gt; New Terminal).
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-brand-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
              {script}
            </pre>
            <button
              onClick={onCopy}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded text-white hover:bg-gray-600"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs rounded-lg p-3">
          <span className="font-semibold">Note:</span> If you receive a &quot;not allowed by device mode&quot; error,
          run{' '}
          <code className="bg-yellow-100 px-1 rounded">/system/device-mode/update mode=advanced</code>{' '}
          to unlock script execution capabilities, then reboot and try again.
        </div>
      </div>

      <div className="flex items-center justify-between p-6 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isOnline ? (
            <>
              <CheckCircle2 size={15} className="text-brand-500" /> Router connected
            </>
          ) : (
            <>
              <Loader2 size={15} className="animate-spin" /> Waiting for router to connect...
            </>
          )}
        </div>
        <button
          onClick={onContinue}
          disabled={!isOnline}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue to Configuration Method <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Configuration Method ──────────────────────────────

function Step2({ method, setMethod, onBack, onContinue }: {
  method: 'automatic' | 'manual'
  setMethod: (m: 'automatic' | 'manual') => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-start gap-3 p-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
          <SettingsIcon size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Step 2: Configuration Method</h2>
          <p className="text-sm text-gray-500">Choose how you want to configure your HotBill services</p>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <button
          onClick={() => setMethod('automatic')}
          className={cn(
            'w-full text-left p-4 rounded-lg border-2 transition-colors',
            method === 'automatic' ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">Automatic Deployment</span>
            <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded">RECOMMENDED</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Use our interactive visual Topology Designer to map your ports, bridges, Hotspot, and PPPoE
            settings right from this dashboard.
          </p>
        </button>

        <button
          onClick={() => setMethod('manual')}
          className={cn(
            'w-full text-left p-4 rounded-lg border-2 transition-colors',
            method === 'manual' ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <span className="font-semibold text-gray-900">Manual (Advanced)</span>
          <p className="text-sm text-gray-500 mt-1">
            Configure Hotspot and routing manually via Winbox or WebFig using our provided bootstrap
            scripts and step-by-step instructions.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between p-6 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back to Remote Access
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black"
        >
          Continue to Configuration <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Manual configuration panel ────────────────────────────────

function ManualPanel({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
          <Terminal size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Manual Configuration</h2>
          <p className="text-sm text-gray-500">Use Winbox or WebFig to configure your hotspot/PPPoE setup directly.</p>
        </div>
      </div>

      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 pl-1">
        <li>Open Winbox and connect to your router using the credentials you saved when adding it to HotBill.</li>
        <li>
          Create a bridge (e.g. <code className="bg-gray-100 px-1 rounded">HOTBILL-BRIDGE</code>) and add your
          LAN/WLAN ports to it.
        </li>
        <li>
          Assign a gateway IP and subnet to the bridge under{' '}
          <code className="bg-gray-100 px-1 rounded">IP &gt; Addresses</code>.
        </li>
        <li>
          Set up an IP pool, DHCP server, and Hotspot server (
          <code className="bg-gray-100 px-1 rounded">IP &gt; Hotspot &gt; Setup</code>) bound to the bridge.
        </li>
        <li>
          Enable RADIUS on the hotspot profile (<code className="bg-gray-100 px-1 rounded">use-radius=yes</code>) —
          HotBill already registered this router as a RADIUS client in Step 1.
        </li>
        <li>
          Add a walled-garden entry allowing access to your HotBill portal domain so unauthenticated users can
          reach the captive portal / payment page.
        </li>
      </ol>

      <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-lg p-3">
        Need help? Switch back to <span className="font-medium">Automatic Deployment</span> at any time —
        HotBill will configure the bridge, hotspot, and RADIUS wiring for you.
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={onFinish} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          Done
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Topology Designer ─────────────────────────────────

function Step3({ routerId, onBack, onFinish }: { routerId: string; onBack: () => void; onFinish: () => void }) {
  const [scanning, setScanning] = useState(true)
  const [offline, setOffline] = useState(false)
  const [info, setInfo] = useState<{ identity?: string; model?: string; version?: string; uptime?: string }>({})
  const [interfaces, setInterfaces] = useState<IfaceInfo[]>([])
  const [bridges, setBridges] = useState<BridgeDraft[]>([])
  const [configBridgeId, setConfigBridgeId] = useState<string | null>(null)
  const [scriptModal, setScriptModal] = useState<{ bridgeName: string; script: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const ifaceRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bridgeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [lines, setLines] = useState<{ key: string; x1: number; y1: number; x2: number; y2: number }[]>([])

  useEffect(() => {
    let cancelled = false
    setScanning(true)
    api
      .get(`/routers/${routerId}/topology`)
      .then((res) => {
        if (cancelled) return
        setInfo({
          identity: res.data.identity,
          model: res.data.model,
          version: res.data.version,
          uptime: res.data.uptime,
        })
        setInterfaces(res.data.interfaces?.length ? res.data.interfaces : FALLBACK_INTERFACES)
        setBridges([defaultBridge()])
        setScanning(false)
      })
      .catch(() => {
        if (cancelled) return
        setOffline(true)
        setInterfaces(FALLBACK_INTERFACES)
        setBridges([defaultBridge()])
        setScanning(false)
      })
    return () => {
      cancelled = true
    }
  }, [routerId])

  const recomputeLines = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const next: typeof lines = []

    bridges.forEach((bridge) => {
      const bridgeEl = bridgeRefs.current[bridge.id]
      if (!bridgeEl) return
      const bRect = bridgeEl.getBoundingClientRect()
      bridge.ports.forEach((port) => {
        const ifaceEl = ifaceRefs.current[port]
        if (!ifaceEl) return
        const iRect = ifaceEl.getBoundingClientRect()
        next.push({
          key: `${bridge.id}-${port}`,
          x1: iRect.left + iRect.width / 2 - containerRect.left,
          y1: iRect.bottom - containerRect.top,
          x2: bRect.left + bRect.width / 2 - containerRect.left,
          y2: bRect.top - containerRect.top,
        })
      })
    })

    setLines(next)
  }, [bridges])

  useLayoutEffect(() => {
    recomputeLines()
    window.addEventListener('resize', recomputeLines)
    return () => window.removeEventListener('resize', recomputeLines)
  }, [recomputeLines, interfaces])

  const toggleInterface = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.post(`/routers/${routerId}/interfaces/toggle`, { name, enabled }),
  })

  const handleDoubleClickInterface = (iface: IfaceInfo) => {
    if (!isWireless(iface.type)) return
    const willEnable = !!iface.disabled
    setInterfaces((prev) =>
      prev.map((i) => (i.name === iface.name ? { ...i, disabled: !willEnable, running: willEnable } : i))
    )
    toggleInterface.mutate({ name: iface.name, enabled: willEnable })
  }

  const handleDrop = (bridgeId: string, e: React.DragEvent) => {
    e.preventDefault()
    const portName = e.dataTransfer.getData('text/plain')
    if (!portName) return
    // Never allow the WAN/uplink onto a bridge.
    if (interfaces.find((i) => i.name === portName)?.is_wan) return
    setBridges((prev) =>
      prev.map((b) => {
        if (b.id === bridgeId) {
          return b.ports.includes(portName) ? b : { ...b, ports: [...b.ports, portName] }
        }
        return { ...b, ports: b.ports.filter((p) => p !== portName) }
      })
    )
  }

  const disconnectPort = (bridgeId: string, portName: string) => {
    setBridges((prev) =>
      prev.map((b) => (b.id === bridgeId ? { ...b, ports: b.ports.filter((p) => p !== portName) } : b))
    )
  }

  const updateBridge = (id: string, patch: Partial<BridgeDraft>) => {
    setBridges((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const addBridge = () => {
    setBridges((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `HOTBILL-BRIDGE-${prev.length + 1}`,
        gatewayIp: `10.20${prev.length}.0.1`,
        subnetPrefix: 24,
        ports: [],
        hotspotEnabled: true,
        pppoeEnabled: false,
        preventLogin: true,
        status: 'draft',
      },
    ])
  }

  const deployBridge = useMutation({
    mutationFn: (bridge: BridgeDraft) =>
      api.post(`/routers/${routerId}/bridges`, {
        name: bridge.name,
        gateway_ip: bridge.gatewayIp,
        subnet_prefix: bridge.subnetPrefix,
        ports: bridge.ports,
        wlan_enabled: bridge.ports.some((p) => isWireless(interfaces.find((i) => i.name === p)?.type ?? '')),
        hotspot_enabled: bridge.hotspotEnabled,
        pppoe_enabled: bridge.pppoeEnabled,
      }),
  })

  const handleDeploy = async (bridge: BridgeDraft) => {
    setBridges((prev) => prev.map((b) => (b.id === bridge.id ? { ...b, status: 'deploying', error: undefined } : b)))
    try {
      const res = await deployBridge.mutateAsync(bridge)
      setBridges((prev) =>
        prev.map((b) =>
          b.id === bridge.id ? { ...b, status: 'deployed', bootstrapScript: res.data.bootstrap_script } : b
        )
      )
      setScriptModal({ bridgeName: bridge.name, script: res.data.bootstrap_script })
    } catch (err: any) {
      setBridges((prev) =>
        prev.map((b) =>
          b.id === bridge.id ? { ...b, status: 'failed', error: err.response?.data?.message ?? 'Deployment failed' } : b
        )
      )
    }
  }

  const anyDeployed = bridges.some((b) => b.status === 'deployed')

  if (scanning) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Scanning router topology...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-start gap-3 p-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
          <Layers size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Step 3: Service Setup</h2>
          <p className="text-sm text-gray-500">Design your network layout and deploy Hotspot/PPPoE services</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {offline && (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg p-3">
            Couldn&apos;t reach the router live — showing a sample port layout so you can design the topology.
            It will be applied next time the router connects.
          </div>
        )}

        {info.identity && (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <span className="font-medium text-gray-700">{info.identity}</span>
            {info.model && <span> · {info.model}</span>}
            {info.version && <span> · v{info.version}</span>}
            {info.uptime && <span> · uptime {info.uptime}</span>}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Controls</p>
          <p className="text-xs text-gray-500">
            Drag connections between ports and bridges. Each physical port can only belong to one bridge.
            Double-click a wireless port to activate it. Click a connected port&apos;s tag to disconnect it.
          </p>
        </div>

        {/* Designer canvas */}
        <div ref={containerRef} className="relative rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {lines.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#4F4AD7"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            ))}
          </svg>

          {/* Interface row */}
          <div className="relative flex flex-wrap gap-3 mb-8">
            {interfaces.map((iface) => {
              const Icon = isWireless(iface.type) ? Wifi : Cable
              const wireless = isWireless(iface.type)
              const active = !iface.disabled
              const isWan = !!iface.is_wan
              return (
                <div
                  key={iface.name}
                  ref={(el) => {
                    ifaceRefs.current[iface.name] = el
                  }}
                  draggable={!isWan}
                  onDragStart={(e) => {
                    if (isWan) { e.preventDefault(); return }
                    e.dataTransfer.setData('text/plain', iface.name)
                  }}
                  onDoubleClick={() => { if (!isWan) handleDoubleClickInterface(iface) }}
                  className={cn(
                    'relative w-24 px-3 py-3 rounded-lg border bg-white text-center select-none transition-colors',
                    isWan
                      ? 'border-gray-200 opacity-50 cursor-not-allowed bg-gray-50'
                      : 'cursor-grab hover:border-gray-400',
                    wireless && active && !isWan ? 'border-brand-400 ring-1 ring-brand-200' : 'border-gray-200'
                  )}
                  title={
                    isWan
                      ? 'WAN / internet uplink — locked. Bridging it would cut the router’s internet.'
                      : wireless
                      ? 'Double-click to toggle wireless'
                      : 'Drag onto a bridge to connect'
                  }
                >
                  {isWan && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded">
                      WAN
                    </span>
                  )}
                  <Icon size={20} className={cn('mx-auto mb-1', wireless && active && !isWan ? 'text-brand-500' : 'text-gray-400')} />
                  <p className="text-xs font-medium text-gray-700">{iface.name}</p>
                  {isWan
                    ? <p className="text-[10px] text-gray-400">locked</p>
                    : wireless && <p className="text-[10px] text-gray-400">{active ? 'active' : 'inactive'}</p>}
                </div>
              )
            })}
          </div>

          {/* Bridges */}
          <div className="relative flex flex-wrap gap-4">
            {bridges.map((bridge) => (
              <div
                key={bridge.id}
                ref={(el) => {
                  bridgeRefs.current[bridge.id] = el
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(bridge.id, e)}
                onDoubleClick={() => setConfigBridgeId(bridge.id)}
                className="w-72 bg-white rounded-lg border-2 border-dashed border-brand-300 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-brand-600" />
                    <span className="font-semibold text-sm text-gray-900">{bridge.name}</span>
                  </div>
                  <button
                    onClick={() => setConfigBridgeId(bridge.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    title="Configure bridge"
                  >
                    <SettingsIcon size={14} />
                  </button>
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  Gateway IP:{' '}
                  <span className="font-mono text-gray-700">
                    {bridge.gatewayIp}/{bridge.subnetPrefix}
                  </span>
                </div>

                <div className="flex gap-1.5 mb-3">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      bridge.hotspotEnabled ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {bridge.hotspotEnabled ? 'Hotspot' : 'No Hotspot'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      bridge.pppoeEnabled ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {bridge.pppoeEnabled ? 'PPPoE' : 'No PPPoE'}
                  </span>
                </div>

                {bridge.ports.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic mb-3">Drag ports here to connect them to this bridge</p>
                ) : (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bridge.ports.map((p) => (
                      <button
                        key={p}
                        onClick={() => disconnectPort(bridge.id, p)}
                        className="text-[10px] bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 px-2 py-0.5 rounded-full"
                        title="Click to disconnect"
                      >
                        {p} ×
                      </button>
                    ))}
                  </div>
                )}

                {bridge.status === 'deployed' ? (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
                      <CheckCircle2 size={14} /> Deployed
                    </span>
                    <button
                      onClick={() => setScriptModal({ bridgeName: bridge.name, script: bridge.bootstrapScript ?? '' })}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      View setup script
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeploy(bridge)}
                    disabled={bridge.ports.length === 0 || bridge.status === 'deploying'}
                    className="w-full bg-gray-900 text-white text-xs font-medium rounded-lg py-2 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {bridge.status === 'deploying' ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Deploying bridge...
                      </>
                    ) : (
                      'Deploy Bridge'
                    )}
                  </button>
                )}
                {bridge.status === 'failed' && <p className="text-[11px] text-red-500 mt-2">{bridge.error}</p>}
              </div>
            ))}

            <button
              onClick={addBridge}
              className="w-72 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 min-h-[120px]"
            >
              <Plus size={15} /> Add New Bridge
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-6 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={onFinish}
          disabled={!anyDeployed}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40"
        >
          Finish Setup <ArrowRight size={15} />
        </button>
      </div>

      {/* Configure bridge modal */}
      {configBridgeId &&
        (() => {
          const bridge = bridges.find((b) => b.id === configBridgeId)
          if (!bridge) return null
          return (
            <Modal title="Configure Bridge Interface" onClose={() => setConfigBridgeId(null)}>
              <p className="text-xs text-gray-500 mb-4">
                Set the gateway IP, subnet size, and the services that should run on this bridge.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    value={bridge.name}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">The primary bridge cannot be renamed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gateway IP</label>
                  <input
                    value={bridge.gatewayIp}
                    onChange={(e) => updateBridge(bridge.id, { gatewayIp: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subnet Size</label>
                  <select
                    value={bridge.subnetPrefix}
                    onChange={(e) => updateBridge(bridge.id, { subnetPrefix: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {SUBNET_OPTIONS.map((o) => (
                      <option key={o.prefix} value={o.prefix}>
                        /{o.prefix} ({o.hosts} Hosts)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Bridge Services</p>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-800">Hotspot Server</p>
                      <p className="text-xs text-gray-400">Set up a HotBill captive portal on this bridge</p>
                    </div>
                    <Toggle checked={bridge.hotspotEnabled} onChange={(v) => updateBridge(bridge.id, { hotspotEnabled: v })} />
                  </div>
                  {bridge.hotspotEnabled && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <input
                        type="checkbox"
                        checked={bridge.preventLogin}
                        onChange={(e) => updateBridge(bridge.id, { preventLogin: e.target.checked })}
                      />
                      Prevent hotspot login until a package is purchased
                    </label>
                  )}

                  <div className="flex items-center justify-between py-2 opacity-50">
                    <div>
                      <p className="text-sm text-gray-800">PPPoE Server</p>
                      <p className="text-xs text-gray-400">Enable PPPoE authentication on this bridge</p>
                    </div>
                    <Toggle checked={false} onChange={() => {}} disabled />
                  </div>
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded p-2">
                    PPPoE is not currently available — contact support.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setConfigBridgeId(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfigBridgeId(null)}
                    disabled={bridge.ports.length === 0}
                    className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
                {bridge.ports.length === 0 && (
                  <p className="text-[11px] text-amber-600 text-center">
                    Connect at least one interface to the bridge before saving.
                  </p>
                )}
              </div>
            </Modal>
          )
        })()}

      {/* Bootstrap script modal */}
      {scriptModal && (
        <Modal title="Service Installation Required" onClose={() => setScriptModal(null)}>
          <p className="text-sm text-gray-600 mb-4">
            The <span className="font-mono">{scriptModal.bridgeName}</span> bridge has been deployed. Now copy and
            run this command in your MikroTik terminal to finish wiring up RADIUS and the captive portal.
          </p>
          <div className="relative mb-3">
            <pre className="bg-gray-900 text-brand-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
              {scriptModal.script}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(scriptModal.script)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded text-white hover:bg-gray-600"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-lg p-3 mb-4">
            This script enables NAT for your hotspot subnet, wires the RADIUS-based captive portal, and
            configures the walled garden.
          </div>
          <button
            onClick={() => setScriptModal(null)}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold"
          >
            I&apos;ve run the command
          </button>
        </Modal>
      )}
    </div>
  )
}

function defaultBridge(): BridgeDraft {
  return {
    id: crypto.randomUUID(),
    name: 'HOTBILL-BRIDGE',
    gatewayIp: '10.200.5.1',
    subnetPrefix: 19,
    ports: [],
    hotspotEnabled: true,
    pppoeEnabled: false,
    preventLogin: true,
    status: 'draft',
  }
}

function isWireless(type: string): boolean {
  return type.includes('wlan') || type.includes('wifi')
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full transition-colors relative shrink-0',
        checked ? 'bg-brand-500' : 'bg-gray-200',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
