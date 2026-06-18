'use client'

import { ArrowUpRight } from 'lucide-react'

interface Props {
  text?: string
  variant?: 'light' | 'purple'
  size?: number
  className?: string
}

export default function RotatingBadge({
  text = 'EXPLORE · MORE · ',
  variant = 'purple',
  size = 110,
  className = '',
}: Props) {
  const repeated = text.repeat(2)
  const isPurple = variant === 'purple'

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 rounded-full border ${
          isPurple ? 'bg-purple border-white/30' : 'border-navy/20'
        }`}
      />
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-spinSlow"
      >
        <defs>
          <path id="badge-circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text
          className={`${isPurple ? 'fill-white' : 'fill-navy'}`}
          style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1px' }}
        >
          <textPath href="#badge-circle" startOffset="0%">
            {repeated}
          </textPath>
        </text>
      </svg>
      <span
        className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full ${
          isPurple ? 'bg-white text-purple' : 'bg-navy text-white'
        }`}
      >
        <ArrowUpRight size={18} strokeWidth={2.2} />
      </span>
    </div>
  )
}
