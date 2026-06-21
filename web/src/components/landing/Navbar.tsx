'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/about', label: 'About Us' },
  { href: '/features', label: 'Services' },
  { href: '/blogs', label: 'Blogs' },
  { href: '/faqs', label: 'FAQs' },
]

const hiddenOn = ['/login', '/register']

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (hiddenOn.includes(pathname)) return null

  return (
    <div className="sticky top-0 z-50 px-4 pt-4">
      <header
        className={`mx-auto rounded-full bg-white/80 backdrop-blur-xl border border-black/[0.06] transition-all duration-300 ease-out ${
          scrolled
            ? 'max-w-[860px] shadow-[0_12px_34px_rgba(0,1,42,0.16)]'
            : 'max-w-[1040px] shadow-[0_6px_24px_rgba(0,1,42,0.08)]'
        }`}
      >
        <div className="flex items-center justify-between h-14 pl-5 pr-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/hotbill-logo.png" alt="HotBill" width={176} height={107} priority className="h-8 w-auto object-contain" />
            <span className="text-base font-extrabold tracking-tight text-navy">HOTBILL</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-navy/75 hover:text-purple transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              href="/contact"
              className="inline-flex items-center bg-purple hover:bg-purple-dark text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors duration-200"
            >
              Contact Us
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-navy hover:bg-black/5 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="md:hidden mx-auto max-w-[1040px] mt-2 bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_12px_34px_rgba(0,1,42,0.14)] p-3">
          <div className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 rounded-full text-sm font-medium text-navy/75 hover:bg-black/5 hover:text-purple transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="block text-center bg-purple text-white text-sm font-semibold px-5 py-3 rounded-full mt-1"
            >
              Contact Us
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
