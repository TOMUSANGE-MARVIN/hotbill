'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from 'date-fns'

/**
 * Reporting periods. Money and dashboards default to "This month" so every
 * new month starts fresh; earlier periods are one click away. The current
 * date is re-read every minute, so a page left open over midnight on the 1st
 * rolls over to the new month on its own.
 */
export type PeriodPreset = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_30' | 'this_year' | 'custom'

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export function rangeFor(preset: Exclude<PeriodPreset, 'custom'>, now: Date): { start: string; end: string } {
  switch (preset) {
    case 'today': return { start: ymd(now), end: ymd(now) }
    case 'yesterday': { const y = subDays(now, 1); return { start: ymd(y), end: ymd(y) } }
    case 'last_month': { const m = subMonths(now, 1); return { start: ymd(startOfMonth(m)), end: ymd(endOfMonth(m)) } }
    case 'last_30': return { start: ymd(subDays(now, 29)), end: ymd(now) }
    case 'this_year': return { start: ymd(startOfYear(now)), end: ymd(now) }
    case 'this_month':
    default: return { start: ymd(startOfMonth(now)), end: ymd(now) }
  }
}

export function usePeriod(initial: Exclude<PeriodPreset, 'custom'> = 'this_month') {
  const [preset, setPresetState] = useState<PeriodPreset>(initial)
  const [custom, setCustomState] = useState(() => rangeFor(initial, new Date()))
  const [today, setToday] = useState(() => ymd(new Date()))

  useEffect(() => {
    const id = setInterval(() => setToday(ymd(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])

  // `today` is a dependency in spirit: re-deriving from it is what rolls the
  // period over when the date changes.
  const range = preset === 'custom' ? custom : rangeFor(preset, new Date(`${today}T12:00:00`))

  const setPreset = (p: PeriodPreset) => {
    if (p === 'custom') setCustomState(range) // start editing from what is on screen
    setPresetState(p)
  }
  const setCustom = (next: Partial<{ start: string; end: string }>) => {
    setCustomState((c) => ({ ...(preset === 'custom' ? c : range), ...next }))
    setPresetState('custom')
  }

  const label = preset === 'custom'
    ? `${range.start} – ${range.end}`
    : PERIOD_PRESETS.find((p) => p.value === preset)!.label

  return { preset, start: range.start, end: range.end, label, setPreset, setCustom }
}

export type Period = ReturnType<typeof usePeriod>
