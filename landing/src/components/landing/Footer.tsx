'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Power, Facebook, Instagram, Youtube, Twitter, Phone, Mail } from 'lucide-react'

const footerLinks = [
  { label: 'How it works', href: '/features' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Services', href: '/features' },
  { label: 'Testimonial', href: '/#testimonials' },
  { label: 'FAQs', href: '/faqs' },
]

const socials = [
  { icon: Facebook, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Youtube, href: '#' },
  { icon: Twitter, href: '#' },
]

export default function Footer() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/register') return null

  return (
    <footer className="bg-navy text-white">
      <div className="container-1200 py-14">
        <div>
          <div className="grid lg:grid-cols-[1.2fr_1.6fr_1fr] gap-10">
            {/* Left — brand */}
            <div>
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-full bg-purple flex items-center justify-center">
                  <Power size={16} className="text-white" strokeWidth={2.5} />
                </span>
                <span className="text-lg font-extrabold tracking-tight">HOTBILL</span>
              </Link>
              <p className="text-sm text-white/55 max-w-[200px] leading-relaxed">
                Smart hotspot, seamless billing — making connectivity profitable for every ISP.
              </p>
            </div>

            {/* Center — links */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 lg:justify-center">
              {footerLinks.map((l) => (
                <Link key={l.label} href={l.href} className="text-sm text-white/70 hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right — socials */}
            <div className="flex gap-3 lg:justify-end items-start">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-navy transition-colors"
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/15 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
              <span className="flex items-center gap-2"><Phone size={13} /> +256 700 000 000</span>
              <span className="flex items-center gap-2"><Mail size={13} /> hello@hotbill.io</span>
            </div>
            <p className="text-sm text-white/55">Copyright © 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
