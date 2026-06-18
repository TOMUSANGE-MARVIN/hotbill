'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'

const faqGroups = [
  {
    category: 'Getting Started',
    items: [
      { q: 'What routers does HotBill support?', a: 'HotBill is built specifically for MikroTik routers running RouterOS 7.x. We support all MikroTik hardware — from the hAP series to CCR enterprise routers.' },
      { q: 'How long does setup take?', a: 'Under 60 seconds. Add your router, run our one-click provisioning script, and it automatically configures RADIUS, hotspot, firewall and the VPN tunnel for you.' },
      { q: 'Do I need technical knowledge to use HotBill?', a: 'No SSH or Winbox required for day-to-day work. Everything is managed from a clean dashboard. Basic familiarity with your MikroTik router helps for the initial connect.' },
    ],
  },
  {
    category: 'Billing & Payments',
    items: [
      { q: 'How does the automatic billing work?', a: 'When a customer connects to your hotspot, they see a captive portal with your packages. They choose a plan, pay via mobile money (MTN MoMo, Airtel Money) or voucher, and the system automatically activates their internet access through RADIUS.' },
      { q: 'What payment methods do you support?', a: 'Mobile money (MTN MoMo, Airtel Money) and cards via PesaPal, plus voucher codes. Enterprise plans can add bank transfers.' },
      { q: 'How do I get paid?', a: 'Payments from your customers go directly to your configured mobile money or PesaPal account. You can track all revenue in real-time and request withdrawals anytime.' },
    ],
  },
  {
    category: 'Plans & Pricing',
    items: [
      { q: 'Is there a free plan?', a: 'Yes — the Starter plan is free forever with up to 2 routers and 100 subscribers. Paid plans add more routers, unlimited subscribers, VPN access and API.' },
      { q: 'Can I switch plans later?', a: 'Yes, upgrade or downgrade anytime. Changes take effect immediately and billing is prorated automatically.' },
      { q: 'Is there a contract or commitment?', a: 'No contracts. All plans are month-to-month (or annual for a discount). Cancel anytime with no penalties.' },
    ],
  },
  {
    category: 'Technical & Support',
    items: [
      { q: 'Can I manage routers behind NAT?', a: 'Yes. HotBill establishes a secure WireGuard tunnel to each router, so you can manage devices with no public IP from anywhere.' },
      { q: 'Can I manage multiple locations?', a: 'Absolutely. HotBill is multi-tenant by design — manage unlimited routers across different locations from a single dashboard, each with their own packages and pricing.' },
      { q: 'What support do you offer?', a: 'Email support on all plans, priority email & chat on Pro, and 24/7 phone & chat on Enterprise. Our docs and setup guides cover most common questions.' },
    ],
  },
]

export default function FaqsPage() {
  const [open, setOpen] = useState<string | null>('0-0')

  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            FAQs
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-1px] text-navy mb-6">
            Questions? We&apos;ve got <span className="text-purple">answers</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Everything you need to know about HotBill — setup, billing, plans and support.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="container-1200 max-w-4xl">
          <div className="space-y-14">
            {faqGroups.map((group, gi) => (
              <div key={group.category}>
                <h2 className="text-xl font-bold text-navy mb-5">{group.category}</h2>
                <div className="space-y-3">
                  {group.items.map((item, ii) => {
                    const id = `${gi}-${ii}`
                    const isOpen = open === id
                    return (
                      <div key={id} className="bg-white rounded-card border border-black/[0.08] overflow-hidden">
                        <button
                          onClick={() => setOpen(isOpen ? null : id)}
                          className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                        >
                          <span className="text-sm font-bold text-navy">{item.q}</span>
                          <span className="shrink-0 w-8 h-8 bg-lightgray rounded-full flex items-center justify-center">
                            {isOpen ? <ChevronUp size={16} className="text-purple" /> : <ChevronDown size={16} className="text-navy/60" />}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5">
                            <p className="text-sm text-navy/60 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-purple py-20 lg:py-24 text-center">
        <div className="container-1200">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Still have questions?</h2>
          <p className="text-white/70 max-w-md mx-auto mb-8">Can&apos;t find the answer you&apos;re looking for? Our team is happy to help.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-purple px-7 py-3.5 rounded-btn text-sm font-semibold hover:bg-white/90 transition-colors">
            Contact Us <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  )
}
