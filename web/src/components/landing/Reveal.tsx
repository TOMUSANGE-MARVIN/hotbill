'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Wraps content in a scroll-reveal that bounces up into place.
 * Unlike a one-shot reveal, this toggles on *every* enter/exit of the
 * viewport, so the animation replays each time you scroll back to it.
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${visible ? 'reveal-in' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
