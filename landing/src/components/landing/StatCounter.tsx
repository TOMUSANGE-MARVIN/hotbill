'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  suffix?: string
  label: string
}

export default function StatCounter({ value, suffix = '+', label }: Props) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          const duration = 1400
          const start = performance.now()
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCount(Math.round(eased * value))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="text-right md:text-left">
      <div className="flex items-start justify-end md:justify-start">
        <span className="text-5xl lg:text-6xl font-extrabold text-navy tabular-nums leading-none">
          {count.toLocaleString()}
        </span>
        <span className="text-2xl font-bold text-purple ml-0.5">{suffix}</span>
      </div>
      <p className="text-xs text-navy/50 mt-2 font-medium">{label}</p>
    </div>
  )
}
