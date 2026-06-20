'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Play } from 'lucide-react'
import RotatingBadge from '@/components/landing/RotatingBadge'
import StatCounter from '@/components/landing/StatCounter'
import Reveal from '@/components/landing/Reveal'
import { loginUrl } from '@/lib/site'

export default function HomePage() {
  return (
    <>
      <Hero />
      <DarkVideo />
      <Marquee />
      <Services />
      <Gallery />
      <TrustedBy />
      <Projects />
      <Founder />
      <Testimonials />
    </>
  )
}

/* ───────────────────────── SECTION 2 — HERO ───────────────────────── */
function Hero() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const tl = isMobile ? 44 : 68
  const br = isMobile ? 72 : 104
  const cardMask = `radial-gradient(circle ${tl}px at left top, transparent 0 ${tl - 1}px, #000 ${tl}px), radial-gradient(circle ${br}px at right bottom, transparent 0 ${br - 1}px, #000 ${br}px)`

  return (
    <section className="bg-lightgray pt-16 pb-24 lg:pt-20 lg:pb-28">
      <div className="container-1200">
        {/* Giant headline */}
        <Reveal className="text-center mb-16 lg:mb-20">
          <h1 className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-extrabold uppercase tracking-[-1px] leading-[0.95] text-navy text-5xl sm:text-6xl lg:text-8xl">
            <span>Smart</span>
            <Image
              src="/network-shield.png"
              alt="HotBill network shield"
              width={112}
              height={112}
              className="inline-block w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 object-contain"
              priority
            />
            <span>Hotspot</span>
          </h1>
          <h2 className="mt-3 lg:mt-4 font-medium uppercase tracking-[-1px] text-navy/90 text-4xl sm:text-5xl lg:text-7xl">
            Billing System
          </h2>
        </Reveal>

        {/* Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)_minmax(0,0.7fr)] gap-10 lg:gap-8 items-center">
          {/* LEFT */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bold text-navy">Our story</span>
              <span className="h-px w-16 bg-navy/30" />
            </div>
            <div className="relative max-w-xs">
              {/* float spacer: reserves the bottom-left so the last lines wrap around the button */}
              <span
                aria-hidden
                className="block"
                style={{
                  float: 'left',
                  width: '4rem',
                  height: '8.2em',
                  shapeOutside: 'inset(3.4em 0 0 0)',
                  shapeMargin: '0.5rem',
                } as React.CSSProperties}
              />
              <p className="text-sm text-navy/60 leading-relaxed">
                A specialized platform that helps ISPs deploy, manage and bill their hotspot
                <br />
                <br />
                networks, establishing a strong, profitable online presence.
              </p>
              {/* arrow button nestled at the bottom-left, text wraps around it */}
              <span className="absolute bottom-0 left-0 inline-flex items-center justify-center w-14 h-14 rounded-btn bg-purple text-white">
                <ArrowUpRight size={20} strokeWidth={2.2} />
              </span>
            </div>
          </div>

          {/* CENTER — purple anchor card with concave top-left cutout */}
          <div className="order-1 lg:order-2 relative">
            <div
              className="relative bg-purple aspect-[16/11] overflow-hidden"
              style={{
                borderRadius: '20px',
                WebkitMaskImage: cardMask,
                maskImage: cardMask,
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect',
                filter: 'drop-shadow(0 30px 55px rgba(79,74,215,0.32))',
              } as React.CSSProperties}
            >
              <Image
                src="/router.avif"
                alt="MikroTik router"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* DEMO VIDEO badge nestled in the top-left concave cutout */}
            <div className="absolute z-20 left-2 top-2 scale-[0.62] origin-top-left sm:left-0 sm:top-0 sm:scale-100 sm:origin-center sm:-translate-x-1/2 sm:-translate-y-1/2">
              <RotatingBadge text="DEMO · VIDEO · " variant="light" size={96} />
            </div>

            {/* Get Started button nestled in the bottom-right concave cutout */}
            <Link
              href={loginUrl}
              className="absolute bottom-0 right-0 translate-x-[2px] translate-y-[18px] z-20 inline-flex items-center gap-2 bg-purple hover:bg-purple-dark text-white text-sm font-semibold px-7 py-4 rounded-btn shadow-[0_14px_30px_rgba(79,74,215,0.4)] transition-colors"
            >
              Get Started <ArrowUpRight size={16} />
            </Link>
          </div>

          {/* RIGHT — stats */}
          <div className="order-3 space-y-8 lg:space-y-10">
            <StatCounter value={5} label="Years Experience" />
            <StatCounter value={1200} label="Clients Connected" />
            <StatCounter value={300} label="Active Hotspots" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────── SECTION 3 — DARK TAGLINE + VIDEO ─────────────── */
function DarkVideo() {
  return (
    <section className="bg-navy text-white pt-24 pb-0 relative overflow-hidden">
      <div className="container-1200">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start mb-12">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-xl">
              Manage Your Network For Tomorrow&apos;s Revenue Today
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm lg:pt-2">
              HotBill automates hotspot billing end-to-end, from MikroTik provisioning to mobile-money collection. Spend less time configuring and more time earning.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Video card breaks into the next (light) section */}
      <div className="container-1200 relative -mb-28 lg:-mb-40">
        <Reveal className="relative rounded-[16px] overflow-hidden aspect-video bg-white/5">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&fit=crop"
            alt="HotBill team"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-navy/20" />
          <button className="absolute inset-0 flex items-center justify-center" aria-label="Play video">
            <span className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-navy text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
              <Play size={26} fill="currentColor" className="ml-1" />
            </span>
          </button>
        </Reveal>
        <div className="absolute -top-10 right-4 lg:right-8 z-10 hidden sm:block">
          <RotatingBadge text="EXPLORE · MORE · " variant="purple" size={120} />
        </div>
      </div>

      {/* spacer so the protruding card has room above the next section */}
      <div className="h-28 lg:h-40" />
    </section>
  )
}

/* ─────────────────────────── MARQUEE TICKER ────────────────────────── */
function Marquee() {
  const items = Array.from({ length: 8 })
  return (
    <div className="bg-white py-6 border-y border-black/10 overflow-hidden">
      <div className="flex w-max animate-marquee marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center shrink-0">
            {items.map((_, i) => (
              <span key={i} className="flex items-center text-2xl lg:text-3xl font-bold text-navy/80">
                <span className="px-6">Services</span>
                <span className="text-purple">·</span>
                <span className="px-6">Innovative Billing Solutions</span>
                <span className="text-purple">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────── SECTION 4 — SERVICES ───────────────────── */
const services = [
  {
    num: '001',
    name: 'Hotspot Management',
    desc: 'Spin up captive-portal logins, generate and print voucher batches, and onboard hotspot or PPPoE subscribers across every router, all from one dashboard.',
  },
  {
    num: '002',
    name: 'Billing & Invoicing',
    desc: 'Collect via MTN & Airtel mobile money or cash, track agent commissions, settle wallet payouts, and keep a complete, searchable transaction ledger.',
  },
  {
    num: '003',
    name: 'Bandwidth Control',
    desc: 'Define per-package speed limits, data caps and burst rules that push straight to your MikroTik routers, so every plan is enforced automatically.',
  },
  {
    num: '004',
    name: 'Analytics Reporting',
    desc: 'Watch revenue, data usage and subscriber growth in real time with clean charts that update the moment a payment lands.',
  },
]

function Services() {
  const [active, setActive] = useState(0)

  return (
    <section className="bg-white py-24 lg:py-28">
      <div className="container-1200">
        {/* Header pill */}
        <Reveal className="flex items-center gap-0 mb-12 max-w-3xl mx-auto lg:mx-0">
          <span className="shrink-0 border border-purple/40 rounded-pill px-6 py-3 text-sm font-medium text-navy bg-white -mr-4 z-10">
            Services
          </span>
          <div className="flex-1 border border-purple/30 rounded-pill px-8 py-3 pl-12">
            <h2 className="text-2xl lg:text-3xl font-medium text-navy">Innovative Billing Solutions</h2>
          </div>
        </Reveal>

        {/* Service list — click a row to expand its details */}
        <div className="border-t border-black/10">
          {services.map((s, i) => {
            const isActive = active === i
            return (
              <Reveal key={s.num} delay={i * 80} className="border-b border-black/10">
                <button
                  type="button"
                  onClick={() => setActive(isActive ? -1 : i)}
                  aria-expanded={isActive}
                  className="w-full flex items-center justify-between gap-4 py-6 text-left transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-6 lg:gap-10 min-w-0">
                    <span
                      className={`shrink-0 text-[11px] font-medium rounded-pill border px-3 py-1 transition-colors duration-200 ${
                        isActive ? 'border-purple text-purple' : 'border-navy/20 text-navy/40'
                      }`}
                    >
                      {s.num}
                    </span>
                    <span
                      className={`uppercase font-bold tracking-tight text-3xl lg:text-5xl truncate transition-colors duration-200 ${
                        isActive ? 'text-purple' : 'text-navy/30 group-hover:text-navy/50'
                      }`}
                    >
                      {s.name}
                    </span>
                  </div>
                  <span className={`transition-transform duration-300 ${isActive ? 'rotate-90' : ''}`}>
                    <ArrowBtn filled={isActive} />
                  </span>
                </button>

                {/* Expanding details */}
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-7 pl-0 lg:pl-[5.5rem] max-w-2xl text-base lg:text-lg text-navy/60 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── SECTION 4.5 — PRODUCT GALLERY ─────────────────── */
const galleryTop = [
  { src: '/gallery/dashboard.png', label: 'Dashboard' },
  { src: '/gallery/usage-analytics.png', label: 'Usage Analytics' },
  { src: '/gallery/transactions.png', label: 'Transactions' },
  { src: '/gallery/wallet.png', label: 'Wallet & Payouts' },
  { src: '/gallery/subscribers.png', label: 'Subscribers' },
]
const galleryBottom = [
  { src: '/gallery/packages.png', label: 'Packages' },
  { src: '/gallery/vouchers.png', label: 'Vouchers' },
  { src: '/gallery/agents.png', label: 'Agents' },
  { src: '/gallery/routers.png', label: 'Router Monitoring' },
  { src: '/gallery/router-setup.png', label: 'Automatic Router Setup' },
]

function GalleryCard({ src, label }: { src: string; label: string }) {
  return (
    <figure className="group relative shrink-0 w-[300px] sm:w-[400px] lg:w-[460px] aspect-[1919/927] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-navy">
      <Image
        src={src}
        alt={`HotBill ${label}`}
        fill
        sizes="(max-width: 640px) 300px, (max-width: 1024px) 400px, 460px"
        className="object-cover object-top"
      />
      <figcaption className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-navy/90 to-transparent px-4 py-3 text-sm font-medium text-white">
        {label}
      </figcaption>
    </figure>
  )
}

function GalleryRow({ items, reverse = false }: { items: typeof galleryTop; reverse?: boolean }) {
  // Duplicate the row so the -50% translate loops seamlessly.
  const loop = [...items, ...items]
  return (
    <div className="flex gap-5 w-max">
      <div className={`flex gap-5 marquee-track ${reverse ? 'animate-marquee-reverse' : 'animate-marquee-slow'}`}>
        {loop.map((it, i) => (
          <GalleryCard key={`${it.src}-${i}`} {...it} />
        ))}
      </div>
    </div>
  )
}

function Gallery() {
  return (
    <section className="bg-navy py-24 lg:py-28 overflow-hidden">
      <div className="container-1200 mb-12">
        {/* Header pill (dark variant of the Services header) */}
        <Reveal className="flex items-center gap-0 max-w-3xl mx-auto lg:mx-0">
          <span className="shrink-0 border border-white/30 rounded-pill px-6 py-3 text-sm font-medium text-white bg-navy -mr-4 z-10">
            Product
          </span>
          <div className="flex-1 border border-white/20 rounded-pill px-8 py-3 pl-12">
            <h2 className="text-2xl lg:text-3xl font-medium text-white">A look inside HotBill</h2>
          </div>
        </Reveal>
      </div>

      {/* Two rows scrolling in opposite directions */}
      <Reveal className="relative space-y-5">
        <GalleryRow items={galleryTop} />
        <GalleryRow items={galleryBottom} reverse />

        {/* Edge fades so cards melt into the section */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-navy to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-navy to-transparent" />
      </Reveal>
    </section>
  )
}

/* ───────────────────────── SECTION 5 — PROJECTS ────────────────────── */
const projects = [
  {
    name: 'City Mesh Network Rollout',
    location: 'Kampala, Uganda',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=380&fit=crop',
    offset: 'lg:mt-24',
  },
  {
    name: 'Campus Hotspot Deployment',
    location: 'Gulu, Uganda',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&h=380&fit=crop',
    offset: 'lg:mt-12',
  },
  {
    name: 'Fiber-to-Hotspot Billing',
    location: 'Jinja, Uganda',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500&h=380&fit=crop',
    offset: 'lg:mt-0',
  },
]

function Projects() {
  return (
    <section className="bg-purple text-white pt-24 lg:pt-28 pb-16">
      <div className="container-1200">
        <div className="grid lg:grid-cols-[0.7fr_2fr] gap-10 lg:gap-12">
          <Reveal>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight">
              Our Latest<br />Projects
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {projects.map((p, i) => (
              <Reveal key={p.name} delay={i * 110} className={p.offset}>
                <div className="flex items-start justify-between gap-3 border-t border-white/30 pt-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base leading-snug">{p.name}</h3>
                    <p className="text-xs text-white/60 mt-1">{p.location}</p>
                  </div>
                  <span className="shrink-0 w-9 h-9 rounded-btn bg-white text-purple flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
                <div className="rounded-card overflow-hidden aspect-[4/3] bg-white/15">
                  <Image src={p.image} alt={p.name} width={500} height={380} className="w-full h-full object-cover" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-6 mr-2 lg:mr-16">
          <RotatingBadge text="EXPLORE · MORE · " variant="purple" size={110} className="[&>div:first-child]:!bg-transparent [&>div:first-child]:!border-white/40" />
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── SECTION 6 — FOUNDER ─────────────────────── */
function Founder() {
  return (
    <section className="bg-purple text-white pb-0 relative overflow-hidden">
      <div className="container-1200">
        <div className="grid lg:grid-cols-2 gap-10 items-end">
          {/* Left — message */}
          <div className="pb-24 lg:pb-32">
            <span className="inline-block border border-white/40 rounded-pill px-5 py-1.5 text-xs font-medium mb-8">
              Message From Founder
            </span>
            <Reveal>
              <blockquote className="text-3xl sm:text-4xl lg:text-5xl leading-tight font-light text-white/80">
                <span className="text-white">&ldquo;</span>
                <span className="font-bold italic text-white">Elevate</span> Your Network
                <br />
                With <span className="font-bold italic text-white">Our System</span>
                <span className="text-white">&rdquo;</span>
              </blockquote>
            </Reveal>
            <div className="flex items-center gap-4 mt-10">
              <Link href="/about" className="text-sm font-semibold border-b border-white/40 hover:border-white pb-0.5 transition-colors">
                Visit Our Team
              </Link>
              <ArrowUpRight size={16} />
            </div>
          </div>

          {/* Right — founder */}
          <div className="relative flex items-end justify-center lg:justify-end">
            <div className="flex items-start gap-5 self-start pt-4">
              <span className="w-px h-16 bg-white/40 mt-1" />
              <div>
                <p className="font-bold text-lg leading-tight">Marvin Tomusange</p>
                <p className="text-xs tracking-[3px] text-white/60 mt-1">FOUNDER</p>
              </div>
            </div>
            <Reveal className="relative ml-auto">
              <div className="w-56 sm:w-72 lg:w-80 aspect-[3/4] flex items-end justify-center">
                <Image
                  src="/founder.png"
                  alt="Founder"
                  width={500}
                  height={650}
                  className="w-full h-full object-contain object-bottom drop-shadow-2xl"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── SECTION 7 — TESTIMONIALS ──────────────────── */
const testimonials = [
  {
    quote: 'HotBill transformed our WiFi business. Customers pay via mobile money and get instant access, no more manual vouchers. As an operator, it changed everything.',
    name: 'James Okello',
    role: 'ISP Operator',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    quote: 'The automated billing saves us hours every day. We went from manually managing 2 routers to 15, all from one clean dashboard that just works.',
    name: 'Sarah Nakamya',
    role: 'Network Manager',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    quote: 'We increased revenue by 40% in three months just by switching to HotBill. The analytics showed us exactly where we were leaking money.',
    name: 'David Ssempijja',
    role: 'CEO, ConnectUG',
    photo: 'https://randomuser.me/api/portraits/men/67.jpg',
  },
  {
    quote: 'Setup took under a minute. The provisioning script handled RADIUS, hotspot and the VPN tunnel, things that used to take me a whole afternoon.',
    name: 'Brian Kato',
    role: 'Network Engineer',
    photo: 'https://randomuser.me/api/portraits/men/52.jpg',
  },
  {
    quote: 'Our resellers love the voucher batches, and I love that every code is tracked. Reconciliation that used to take days now takes minutes.',
    name: 'Aisha Namuli',
    role: 'Operations Lead',
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
]

function Testimonials() {
  const [perView, setPerView] = useState(2)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setPerView(mq.matches ? 2 : 1)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const maxIndex = Math.max(0, testimonials.length - perView)
  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  const step = 100 / perView
  const prev = () => setIndex((i) => (i <= 0 ? maxIndex : i - 1))
  const next = () => setIndex((i) => (i >= maxIndex ? 0 : i + 1))

  return (
    <section id="testimonials" className="bg-white py-24 lg:py-28 overflow-hidden">
      <div className="container-1200">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <Reveal>
            <span className="inline-block border border-navy/20 rounded-pill px-5 py-1.5 text-xs font-medium mb-4">
              Testimonial
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-navy">Our Client&apos;s Kind Word</h2>
          </Reveal>
          <div className="flex items-center gap-3">
            <button onClick={prev} aria-label="Previous" className="w-11 h-11 rounded-btn border border-navy/20 flex items-center justify-center text-navy hover:bg-navy/5 transition-colors">
              <ArrowUpRight size={18} className="-scale-x-100" />
            </button>
            <button onClick={next} aria-label="Next" className="w-11 h-11 rounded-btn bg-purple text-white flex items-center justify-center hover:bg-purple-dark transition-colors">
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>

        {/* sliding track — shows two at a time, scrolls left on arrow click */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * step}%)` }}
          >
            {testimonials.map((t) => (
              <div key={t.name} className="w-full lg:w-1/2 shrink-0 lg:pr-7">
                <div className="flex items-end gap-0">
                  <div className="relative w-40 sm:w-52 shrink-0">
                    <div className="absolute inset-x-0 bottom-0 h-[88%] rounded-card bg-lightgray" />
                    <Image
                      src={t.photo}
                      alt={t.name}
                      width={220}
                      height={260}
                      className="relative z-10 w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 bg-lightgray rounded-card border border-black/[0.06] p-6 lg:p-7 -ml-4">
                    <p className="text-sm text-navy/70 leading-relaxed mb-5">{t.quote}</p>
                    <div className="border-t border-black/10 pt-3 text-center">
                      <p className="font-bold text-navy">{t.name}</p>
                      <p className="text-xs text-navy/50">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── SECTION 8 — COMPATIBLE WITH ───────────────── */
const brands = [
  { name: 'MikroTik', file: 'mikrotik.svg' },
  { name: 'Cisco', file: 'cisco.svg' },
  { name: 'Ubiquiti UniFi', file: 'ubiquiti-unifi.svg' },
  { name: 'TP-Link', file: 'tp-link.svg' },
  { name: 'D-Link', file: 'd-link.svg' },
  { name: 'Huawei', file: 'huawei.svg' },
  { name: 'Cambium Networks', file: 'cambium-networks.svg' },
  { name: 'Ruijie Reyee', file: 'ruijie-reyee.svg' },
]

function TrustedBy() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="container-1200">
        <Reveal>
          <p className="text-center font-bold text-navy mb-12">Compatible with</p>
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-10 gap-y-12 items-center justify-items-center">
          {brands.map((b, i) => (
            <Image
              key={b.name}
              src={`/orgs/${b.file}`}
              alt={b.name}
              width={150}
              height={48}
              style={{ animationDelay: `${i * 0.32}s` }}
              className="compat-icon h-8 lg:h-10 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-[filter,opacity] duration-200"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── shared ────────────────────────────────── */
function ArrowBtn({ filled = false }: { filled?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-btn transition-colors duration-200 ${
        filled ? 'bg-purple text-white' : 'border border-navy/20 text-navy bg-white'
      }`}
    >
      <ArrowUpRight size={18} strokeWidth={2.2} />
    </span>
  )
}
