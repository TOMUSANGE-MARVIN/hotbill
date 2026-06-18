'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Power } from 'lucide-react'

export default function AuthBrand() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-navy text-white p-12 overflow-hidden">
      {/* decorative glows */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple/30 blur-3xl" />
      <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-purple/20 blur-3xl" />

      {/* logo */}
      <Link href="/" className="relative flex items-center gap-2.5 w-fit">
        <span className="w-9 h-9 rounded-full bg-purple flex items-center justify-center">
          <Power size={18} className="text-white" strokeWidth={2.5} />
        </span>
        <span className="text-xl font-extrabold tracking-tight">HOTBILL</span>
      </Link>

      {/* center */}
      <div className="relative">
        <Image
          src="/network-shield.png"
          alt=""
          width={96}
          height={96}
          className="w-20 h-20 object-contain mb-8 drop-shadow-[0_10px_30px_rgba(79,74,215,0.5)]"
        />
        <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-[-1px]">
          Smart Hotspot.
          <br />
          Seamless Billing.
        </h2>
        <p className="text-white/55 mt-5 max-w-sm leading-relaxed">
          Manage your network for tomorrow&apos;s revenue today — provision routers, automate billing and grow your ISP from one dashboard.
        </p>

        <div className="flex items-center gap-8 mt-10">
          {[['5+', 'Years'], ['1,200+', 'Clients'], ['300+', 'Hotspots']].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-extrabold">{v}</div>
              <div className="text-xs text-white/45">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-sm text-white/40">© 2025 HotBill. All rights reserved.</p>
    </div>
  )
}
