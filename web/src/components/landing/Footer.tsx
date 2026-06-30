'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Phone, Mail } from 'lucide-react'

const footerLinks = [
  { label: 'How it works', href: '/features' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Services', href: '/features' },
  { label: 'Testimonial', href: '/#testimonials' },
  { label: 'FAQs', href: '/faqs' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Return & Refund Policy', href: '/refund-policy' },
]

function FacebookIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" /></svg>
}
function InstagramIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" /></svg>
}
function YoutubeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.5a3.02 3.02 0 0 0-2.12-2.14C19.5 3.85 12 3.85 12 3.85s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.5C0 8.38 0 12 0 12s0 3.62.5 5.5a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.62 24 12 24 12s0-3.62-.5-5.5zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" /></svg>
}
function TwitterIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3L17.61 20.65z" /></svg>
}

const socials = [FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon]

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
                <Image src="/hotbill-logo.png" alt="HotBill" width={176} height={107} className="h-8 w-auto object-contain" />
                <span className="text-lg font-extrabold tracking-tight">HOTBILL</span>
              </Link>
              <p className="text-sm text-white/55 max-w-[200px] leading-relaxed">
                Smart hotspot, seamless billing, making connectivity profitable for every ISP.
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
              {socials.map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-navy transition-colors"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Legal links */}
          <div className="border-t border-white/15 mt-10 pt-6 flex flex-wrap gap-x-8 gap-y-3">
            {legalLinks.map((l) => (
              <Link key={l.label} href={l.href} className="text-sm text-white/70 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
              <a href="https://wa.me/256705240647" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                +256 705 240 647
              </a>
              <a href="tel:+256761700498" className="flex items-center gap-2 hover:text-white transition-colors"><Phone size={13} /> +256 761 700 498</a>
              <a href="mailto:info@hotbill.app" className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={13} /> info@hotbill.app</a>
            </div>
            <p className="text-sm text-white/55">Copyright © {new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
