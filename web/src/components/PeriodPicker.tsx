'use client'

import { CalendarDays } from 'lucide-react'
import { PERIOD_PRESETS, type Period, type PeriodPreset } from '@/lib/period'

/** Preset dropdown plus from/to dates; editing a date switches to Custom. */
export default function PeriodPicker({ period }: { period: Period }) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
      <CalendarDays size={15} className="text-gray-400 ml-1" />
      <select
        value={period.preset}
        onChange={(e) => period.setPreset(e.target.value as PeriodPreset)}
        className="text-sm font-medium text-gray-700 bg-transparent px-1 py-1 rounded-lg outline-none"
        aria-label="Period"
      >
        {PERIOD_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <span className="h-5 w-px bg-gray-200" />
      <input
        type="date"
        value={period.start}
        max={period.end}
        onChange={(e) => e.target.value && period.setCustom({ start: e.target.value })}
        className="text-sm text-gray-600 bg-transparent px-1 py-1 rounded-lg outline-none"
        aria-label="From"
      />
      <span className="text-gray-300">→</span>
      <input
        type="date"
        value={period.end}
        min={period.start}
        onChange={(e) => e.target.value && period.setCustom({ end: e.target.value })}
        className="text-sm text-gray-600 bg-transparent px-1 py-1 rounded-lg outline-none"
        aria-label="To"
      />
    </div>
  )
}
