'use client'

import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

/*
 * Chart system for the admin dashboard. Colours come from a validated,
 * colour-blind-safe categorical order (never cycled), a single-hue blue ramp
 * for magnitude, and reserved status colours that always travel with a label.
 * Every chart shows values in text as well, so colour never carries meaning alone.
 */
export const VIZ = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  other: '#b9b8b2',
  brand: '#4F4AD7',
  status: { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b', neutral: '#c3c2b7', faint: '#e1e0d9' },
  ramp: ['#f3f7fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
  grid: '#eeede8',
  axis: '#898781',
}

const axisProps = { tick: { fontSize: 11, fill: VIZ.axis }, axisLine: false, tickLine: false } as const
const short = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))

type TipRow = { label: string; value: string; color?: string }
function TipBox({ title, rows }: { title?: string; rows: TipRow[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs min-w-[150px]">
      {title && <div className="font-semibold text-gray-800 mb-1">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-gray-500">
            {r.color && <span className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium text-gray-900 tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}{i.value && <span className="font-medium text-gray-900">{i.value}</span>}
        </span>
      ))}
    </div>
  )
}

export function Empty({ text = 'No data for this period.', h = 220 }: { text?: string; h?: number }) {
  return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: h }}>{text}</div>
}

/* ── Daily sales: stacked columns, Mobile Money + vouchers ───────────── */
export function SalesByChannelChart({ data }: { data: { date: string; mobile_money: number; voucher: number; sales: number }[] }) {
  const total = data.reduce((s, d) => s + d.mobile_money + d.voucher, 0)
  const mm = data.reduce((s, d) => s + d.mobile_money, 0)
  if (total === 0) return <Empty h={280} />
  return (
    <div>
      <Legend items={[
        { label: 'Mobile Money', color: VIZ.series[0], value: ` ${formatCurrency(mm)}` },
        { label: 'Vouchers', color: VIZ.series[1], value: ` ${formatCurrency(total - mm)}` },
      ]} />
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={VIZ.grid} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={(v) => format(new Date(v), 'd MMM')} minTickGap={18} />
          <YAxis {...axisProps} width={44} tickFormatter={short} />
          <Tooltip
            cursor={{ fill: 'rgba(42,120,214,0.06)' }}
            content={({ active, payload, label }) => active && payload?.length ? (
              <TipBox title={format(new Date(String(label)), 'EEE d MMM')} rows={[
                { label: 'Mobile Money', value: formatCurrency(Number(payload[0]?.payload.mobile_money)), color: VIZ.series[0] },
                { label: 'Vouchers', value: formatCurrency(Number(payload[0]?.payload.voucher)), color: VIZ.series[1] },
                { label: 'Total', value: `${formatCurrency(Number(payload[0]?.payload.mobile_money) + Number(payload[0]?.payload.voucher))} · ${payload[0]?.payload.sales} sales` },
              ]} />
            ) : null}
          />
          <Bar dataKey="mobile_money" isAnimationActive={false} stackId="s" fill={VIZ.series[0]} stroke="#fff" strokeWidth={1} />
          <Bar dataKey="voucher" isAnimationActive={false} stackId="s" fill={VIZ.series[1]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Platform commission over time: single-series area ──────────────── */
export function CommissionChart({ data }: { data: { date: string; commission: number }[] }) {
  if (!data.some((d) => d.commission > 0)) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIZ.brand} stopOpacity={0.22} />
            <stop offset="100%" stopColor={VIZ.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={VIZ.grid} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={(v) => format(new Date(v), 'd MMM')} minTickGap={24} />
        <YAxis {...axisProps} width={44} tickFormatter={short} />
        <Tooltip
          cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
          content={({ active, payload, label }) => active && payload?.length ? (
            <TipBox title={format(new Date(String(label)), 'EEE d MMM')} rows={[{ label: 'Commission', value: formatCurrency(Number(payload[0].value)), color: VIZ.brand }]} />
          ) : null}
        />
        <Area type="monotone" dataKey="commission" isAnimationActive={false} stroke={VIZ.brand} strokeWidth={2} fill="url(#commissionFill)" activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Donut with a centred headline and a labelled legend ─────────────── */
export function Donut({ data, center, centerSub, money = true }: {
  data: { name: string; value: number; color: string }[]
  center: string
  centerSub: string
  money?: boolean
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const [hover, setHover] = useState<number | null>(null)
  if (total === 0) return <Empty />
  const fmt = (v: number) => (money ? formatCurrency(v) : v.toLocaleString())
  const h = hover != null ? data[hover] : null
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[180px] h-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              innerRadius={58}
              outerRadius={84}
              paddingAngle={data.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, i) => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color} opacity={hover == null || hover === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          <span className="text-lg font-bold text-gray-900 leading-tight">{h ? `${Math.round((h.value / total) * 100)}%` : center}</span>
          <span className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{h ? h.name : centerSub}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d, i) => (
          <li
            key={d.name}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center justify-between gap-3 text-sm rounded-md px-2 py-1 -mx-2 ${hover === i ? 'bg-gray-50' : ''}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-gray-700 truncate">{d.name}</span>
            </span>
            <span className="text-gray-900 font-medium tabular-nums whitespace-nowrap">
              {fmt(d.value)} <span className="text-gray-400 font-normal">{Math.round((d.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Mobile Money outcome per network: 100% bars, status colours ─────── */
export function NetworkSuccess({ data }: { data: { network: string; paid: number; failed: number; pending: number; success_rate: number | null }[] }) {
  if (data.length === 0) return <Empty h={120} />
  return (
    <div className="space-y-4">
      {data.map((n) => {
        const total = n.paid + n.failed + n.pending || 1
        const parts = [
          { k: 'Paid', v: n.paid, c: VIZ.status.good },
          { k: 'Failed', v: n.failed, c: VIZ.status.critical },
          { k: 'Pending', v: n.pending, c: VIZ.status.warning },
        ].filter((p) => p.v > 0)
        return (
          <div key={n.network}>
            <div className="flex items-baseline justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-800">{n.network}</span>
              <span className="text-gray-500 text-xs">
                <span className="font-semibold text-gray-900 text-sm">{n.success_rate ?? '-'}%</span> success · {n.paid} paid · {n.failed} failed{n.pending ? ` · ${n.pending} pending` : ''}
              </span>
            </div>
            <div className="flex h-3 gap-[2px] rounded-full overflow-hidden">
              {parts.map((p) => (
                <div key={p.k} title={`${p.k}: ${p.v}`} style={{ width: `${(p.v / total) * 100}%`, background: p.c }} />
              ))}
            </div>
          </div>
        )
      })}
      <Legend items={[
        { label: 'Paid', color: VIZ.status.good },
        { label: 'Failed', color: VIZ.status.critical },
        { label: 'Pending', color: VIZ.status.warning },
      ]} />
    </div>
  )
}

/* ── When customers buy: weekday x hour heatmap (one-hue ramp) ───────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export function BuyingHeatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat())
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  if (max === 0) return <Empty h={200} />
  const step = (v: number) => (v === 0 ? 0 : Math.min(VIZ.ramp.length - 1, 1 + Math.floor((v / max) * (VIZ.ramp.length - 2))))
  const busiest = grid.flatMap((row, d) => row.map((v, h) => ({ d, h, v }))).sort((a, b) => b.v - a.v)[0]
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: '36px repeat(24, minmax(0, 1fr))' }}>
            {grid.map((row, d) => (
              <div key={d} className="contents">
                <div className="text-[11px] text-gray-500 flex items-center">{DAYS[d]}</div>
                {row.map((v, h) => (
                  <div
                    key={h}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    className={`h-6 rounded-[3px] ${hover?.d === d && hover?.h === h ? 'ring-2 ring-gray-800' : ''}`}
                    style={{ background: VIZ.ramp[step(v)] }}
                    aria-label={`${DAYS[d]} ${h}:00, ${v} sales`}
                  />
                ))}
              </div>
            ))}
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-[10px] text-gray-400 text-center pt-1">{h % 3 === 0 ? h : ''}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-gray-500">
        <span>
          {hover
            ? <><span className="font-medium text-gray-900">{DAYS[hover.d]} {String(hover.h).padStart(2, '0')}:00</span> · {grid[hover.d][hover.h]} sales</>
            : <>Busiest: <span className="font-medium text-gray-900">{DAYS[busiest.d]} {String(busiest.h).padStart(2, '0')}:00</span> · {busiest.v} sales</>}
        </span>
        <span className="flex items-center gap-1.5">
          Fewer
          {VIZ.ramp.slice(1).map((c) => <span key={c} className="w-3 h-3 rounded-[2px]" style={{ background: c }} />)}
          More
        </span>
      </div>
    </div>
  )
}

/* ── Package mix: horizontal bars, one hue ───────────────────────────── */
export function PackageMix({ data }: { data: { bucket: string; sales: number; gross: number }[] }) {
  const max = Math.max(0, ...data.map((d) => d.gross))
  if (max === 0) return <Empty h={160} />
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.bucket}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{d.bucket}</span>
            <span className="text-gray-900 font-medium tabular-nums">{formatCurrency(d.gross)} <span className="text-gray-400 font-normal">· {d.sales} sold</span></span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.gross / max) * 100}%`, background: VIZ.series[0] }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Businesses on the platform: cumulative line ─────────────────────── */
export function GrowthChart({ data }: { data: { month: string; joined: number; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={VIZ.grid} />
        <XAxis dataKey="month" {...axisProps} tickFormatter={(m) => format(new Date(`${m}-01T12:00:00`), 'MMM')} />
        <YAxis {...axisProps} width={30} allowDecimals={false} />
        <Tooltip
          cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
          content={({ active, payload, label }) => active && payload?.length ? (
            <TipBox title={format(new Date(`${label}-01T12:00:00`), 'MMMM yyyy')} rows={[
              { label: 'Businesses', value: String(payload[0].payload.total), color: VIZ.series[2] },
              { label: 'Joined that month', value: String(payload[0].payload.joined) },
            ]} />
          ) : null}
        />
        <Line type="monotone" dataKey="total" isAnimationActive={false} stroke={VIZ.series[2]} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
          label={({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: unknown }) =>
            index === data.length - 1 ? <text x={Number(x)} y={Number(y) - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="#111">{String(value ?? "")}</text> : <g />}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ── Router fleet: segmented bar with status meaning ─────────────────── */
export function FleetBar({ fleet }: { fleet: { online: number; offline: number; inactive: number; never: number } }) {
  const parts = [
    { k: 'Online', v: fleet.online, c: VIZ.status.good, note: 'checked in within 3 min' },
    { k: 'Offline', v: fleet.offline, c: VIZ.status.critical, note: 'down, seen this week' },
    { k: 'Inactive', v: fleet.inactive, c: VIZ.status.neutral, note: 'not seen for 7+ days' },
    { k: 'Never connected', v: fleet.never, c: VIZ.status.faint, note: 'added but never set up' },
  ]
  const total = parts.reduce((s, p) => s + p.v, 0)
  if (total === 0) return <Empty h={100} />
  return (
    <div>
      <div className="flex h-4 gap-[2px] rounded-full overflow-hidden">
        {parts.filter((p) => p.v > 0).map((p) => (
          <div key={p.k} title={`${p.k}: ${p.v}`} style={{ width: `${(p.v / total) * 100}%`, background: p.c }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 mt-4">
        {parts.map((p) => (
          <li key={p.k} className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-sm mt-1.5 shrink-0" style={{ background: p.c }} />
            <span>
              <span className="block text-lg font-semibold text-gray-900 leading-tight">{p.v}</span>
              <span className="block text-xs text-gray-500">{p.k} · {p.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Tiny trend line for stat tiles ──────────────────────────────────── */
export function Sparkline({ data, dataKey, color = VIZ.brand }: { data: Record<string, number | string>[]; dataKey: string; color?: string }) {
  if (data.length < 2) return null
  return (
    <div className="h-10 -mx-1 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${dataKey})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
