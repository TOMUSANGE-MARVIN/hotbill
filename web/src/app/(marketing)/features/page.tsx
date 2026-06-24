'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Shield, Globe, Settings, CloudCog, Monitor, Bell, Lock,
  Smartphone, ArrowUpRight, Check
} from 'lucide-react'
import { loginUrl } from '@/lib/site'
import Reveal from '@/components/landing/Reveal'

const featureGroups = [
  {
    id: 'routers',
    badge: 'Router Management',
    title: 'Complete MikroTik Router Control',
    description: 'Auto-discover, provision, and monitor all your routers from a single dashboard. No SSH, no Winbox, just click and go.',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=700&h=450&fit=crop',
    features: [
      'One-click router provisioning with auto RADIUS setup',
      'Real-time router status monitoring (CPU, memory, uptime)',
      'Remote interface and bridge management',
      'Automatic hotspot and walled-garden configuration',
      'WireGuard VPN tunnel for secure remote access',
      'Support for all MikroTik RouterOS 7.x hardware',
    ],
  },
  {
    id: 'billing',
    badge: 'Automated Billing',
    title: 'Collect Payments on Autopilot',
    description: 'Mobile money, card payments, and vouchers, all automated. Your customers pay, get instant internet, and you earn while you sleep.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=700&h=450&fit=crop',
    features: [
      'MarzPay integration (MTN MoMo, Airtel Money, cards)',
      'Automatic package activation via RADIUS on payment',
      'Customizable captive portal with your branding',
      'Real-time payment tracking and reconciliation',
      'Automatic receipt and notification delivery',
      'Support for daily, weekly, and monthly packages',
    ],
  },
  {
    id: 'vouchers',
    badge: 'Voucher System',
    title: 'Generate & Sell Vouchers at Scale',
    description: 'Create printable voucher batches, distribute them to resellers, and track every code from generation to redemption.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&h=450&fit=crop',
    features: [
      'Batch generation with custom prefixes and code lengths',
      'One-click PDF printing for physical distribution',
      'Per-batch revenue and usage analytics',
      'Expired and unused voucher tracking',
      'Reseller distribution management',
      'Fraud prevention with single-use enforcement',
    ],
  },
  {
    id: 'analytics',
    badge: 'Analytics & Insights',
    title: 'Make Data-Driven Decisions',
    description: 'Comprehensive dashboards showing revenue trends, subscriber growth, router performance, and business health at a glance.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&h=450&fit=crop',
    features: [
      'Real-time revenue dashboards with date ranges',
      'Subscriber growth and churn analytics',
      'Per-router and per-package performance metrics',
      'Expense tracking and profit margin reports',
      'Exportable reports for accounting',
      'Campaign performance tracking',
    ],
  },
]

const extraFeatures = [
  { icon: Shield, title: 'Multi-Tenant Architecture', desc: 'Isolated environments for each ISP operator with dedicated billing and settings.' },
  { icon: Lock, title: 'Enterprise Security', desc: 'Role-based access control, encrypted credentials, and secure API authentication.' },
  { icon: Smartphone, title: 'Mobile Responsive', desc: 'Manage your entire ISP business from your phone, dashboard, billing, and all.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Get alerted when routers go offline, payments fail, or subscribers churn.' },
  { icon: Globe, title: 'Custom Branding', desc: 'White-label captive portal with your logo, colors, and domain name.' },
  { icon: CloudCog, title: 'REST API', desc: 'Full API access for integrations, custom apps, and automation workflows.' },
  { icon: Monitor, title: 'Remote Access', desc: 'WireGuard VPN tunnels let you manage routers behind NAT from anywhere.' },
  { icon: Settings, title: 'Auto Provisioning', desc: 'One script configures RADIUS, hotspot, firewall, and VPN on any MikroTik router.' },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <Reveal className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            Services
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-1px] text-navy mb-6">
            Built for African ISPs,{' '}
            <span className="text-purple">by operators</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto leading-relaxed">
            Every feature is designed to solve the real challenges of running a hotspot business, from router management to payment collection.
          </p>
        </Reveal>
      </section>

      {featureGroups.map((group, i) => (
        <section
          key={group.id}
          id={group.id}
          className={`py-20 lg:py-24 ${i % 2 === 1 ? 'bg-lightgray' : 'bg-white'}`}
        >
          <div className="container-1200">
            <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center`}>
              <Reveal className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <span className="inline-block border border-purple/40 text-purple text-xs font-semibold px-4 py-1.5 rounded-pill mb-5">
                  {group.badge}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">{group.title}</h2>
                <p className="text-navy/60 text-lg mb-8 leading-relaxed">{group.description}</p>
                <ul className="space-y-3">
                  {group.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-purple/10 flex items-center justify-center mt-0.5">
                        <Check size={12} className="text-purple" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-navy/70">{f}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120} className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="rounded-card overflow-hidden border border-black/[0.06] shadow-[0_20px_50px_rgba(0,1,42,0.1)]">
                  <Image src={group.image} alt={group.title} width={700} height={450} className="w-full" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-white py-20 lg:py-28">
        <div className="container-1200">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">And so much more</h2>
            <p className="text-navy/60 max-w-xl mx-auto">
              Every detail is crafted to help you run a more efficient ISP business.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {extraFeatures.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <div className="p-6 rounded-card border border-black/[0.08] bg-white hover:-translate-y-1 transition-transform duration-200 h-full">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-btn bg-purple/10 mb-4">
                    <f.icon size={20} className="text-purple" />
                  </span>
                  <h3 className="font-bold text-sm text-navy mb-1">{f.title}</h3>
                  <p className="text-xs text-navy/55 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-20 lg:py-24 text-center">
        <Reveal className="container-1200">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to see it in action?</h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8">
            Start your free trial and provision your first router in under 60 seconds.
          </p>
          <Link
            href={loginUrl}
            className="inline-flex items-center gap-2 bg-purple hover:bg-purple-dark text-white px-7 py-3.5 rounded-btn text-sm font-semibold transition-colors"
          >
            Start Free Trial <ArrowUpRight size={16} />
          </Link>
        </Reveal>
      </section>
    </>
  )
}
