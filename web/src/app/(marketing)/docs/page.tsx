import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Rocket, Router as RouterIcon, Package, Wifi, Ticket, Wallet,
  Users, BarChart3, LifeBuoy, ArrowUpRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'HotBill documentation — set up your MikroTik hotspot, create packages and vouchers, accept mobile-money payments, and manage your wallet and withdrawals.',
  alternates: { canonical: '/docs' },
}

const sections = [
  { id: 'introduction', label: 'Introduction', icon: Rocket },
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'connect-router', label: 'Connect a Router', icon: RouterIcon },
  { id: 'packages', label: 'Create Packages', icon: Package },
  { id: 'captive-portal', label: 'Captive Portal', icon: Wifi },
  { id: 'vouchers', label: 'Vouchers', icon: Ticket },
  { id: 'wallet', label: 'Wallet & Withdrawals', icon: Wallet },
  { id: 'subscribers', label: 'Subscribers & Sessions', icon: Users },
  { id: 'analytics', label: 'Dashboard & Analytics', icon: BarChart3 },
  { id: 'support', label: 'Getting Help', icon: LifeBuoy },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 pt-12 first:pt-0">
      <h2 className="text-2xl font-bold text-navy mb-4">{title}</h2>
      <div className="space-y-4 text-navy/70 leading-relaxed text-[15px]">{children}</div>
    </section>
  )
}

export default function DocsPage() {
  return (
    <>
      <section className="bg-lightgray py-20 lg:py-24">
        <div className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            Documentation
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-1px] text-navy mb-6">
            Everything you need to run <span className="text-purple">HotBill</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            From connecting your first MikroTik router to collecting mobile-money payments and paying
            yourself out — here&apos;s how it all works.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="container-1200">
          <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-12 lg:gap-16">
            {/* Sticky table of contents */}
            <aside className="hidden lg:block">
              <nav className="sticky top-28 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/40 mb-3 px-3">On this page</p>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-btn text-sm text-navy/65 hover:text-purple hover:bg-purple/5 transition-colors"
                  >
                    <s.icon size={15} /> {s.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div className="max-w-2xl divide-y divide-black/[0.06]">
              <Section id="introduction" title="Introduction">
                <p>
                  HotBill is a hotspot billing and management platform for internet service providers. It connects
                  to your MikroTik routers, serves a branded captive portal to your customers, collects payments
                  over mobile money, and tracks every sale, voucher and session in one dashboard.
                </p>
                <p>
                  Each business you run is fully isolated — its own packages, subscribers, wallet and reports — so you
                  can manage multiple locations from a single login.
                </p>
              </Section>

              <Section id="getting-started" title="Getting Started">
                <p>To start selling internet access:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li><b>Create an account</b> at the sign-up page and confirm your business name.</li>
                  <li><b>Add a business</b> (location). Each business starts empty with its own wallet and data.</li>
                  <li><b>Connect a router</b> (next section) so HotBill can serve the captive portal.</li>
                  <li><b>Create packages</b> — the time or data bundles your customers buy.</li>
                </ol>
                <p>That&apos;s the whole loop: connect → package → sell → get paid → withdraw.</p>
              </Section>

              <Section id="connect-router" title="Connect a MikroTik Router">
                <p>
                  Add a router from <b>Routers → Add Router</b>, give it a name, and follow the setup wizard. HotBill
                  generates a one-time install script that configures the hotspot, bridge, RADIUS and a walled-garden
                  so your portal and payment pages work before a customer logs in.
                </p>
                <p>
                  The captive portal login page is served straight from the router&apos;s gateway IP, so it loads reliably on
                  every device — Android, iPhone, Windows and Linux — with no DNS setup required on your side.
                </p>
              </Section>

              <Section id="packages" title="Create Packages">
                <p>
                  Packages are what customers buy. Each package has a price, a speed limit, and either a time limit
                  (e.g. 3 hours, 1 day) or a data cap (e.g. 1&nbsp;GB). Create them under <b>Packages</b>; they appear
                  automatically on the captive portal for that router&apos;s customers to choose from.
                </p>
              </Section>

              <Section id="captive-portal" title="Captive Portal & Payments">
                <p>
                  When a customer connects to your WiFi, the captive portal opens automatically. They pick a package,
                  enter their phone number, and approve a <b>mobile-money prompt</b> on their phone — no redirect, no
                  re-entering the network. Once payment confirms, HotBill logs the device in instantly.
                </p>
                <p>
                  Payments are collected via MarzPay (MTN MoMo &amp; Airtel Money). The customer pays the exact package
                  price; the platform and payment fees are settled on the operator side, and your share lands in your
                  HotBill wallet.
                </p>
              </Section>

              <Section id="vouchers" title="Vouchers">
                <p>
                  Vouchers let you sell access for cash. Generate a batch under <b>Vouchers</b>, print or share the codes,
                  and sell them physically. A customer redeems a code on the captive portal to get online — no mobile-money
                  payment needed, since you already collected the cash.
                </p>
                <p>
                  Every voucher redemption is recorded as a transaction showing the value and the small platform commission,
                  which is the only amount deducted from your wallet. Voucher cash itself never touches the withdrawable wallet.
                </p>
              </Section>

              <Section id="wallet" title="Wallet & Withdrawals">
                <p>
                  Your <b>wallet</b> holds the money collected through mobile money — the balance you can withdraw. To cash
                  out, go to <b>Wallet → Withdraw</b>, set your mobile-money number in Settings, and request an amount.
                </p>
                <p>
                  You receive the full amount you request; the withdrawal fee is charged on top and pulled from the rest of
                  your wallet. If your balance can&apos;t cover the amount plus the fee, you&apos;ll see a clear message before
                  anything is sent. Payouts are disbursed to your mobile-money number automatically.
                </p>
              </Section>

              <Section id="subscribers" title="Subscribers & Sessions">
                <p>
                  Every customer who buys access becomes a subscriber with an active session governed by their package&apos;s
                  speed, time and data limits. Sessions and real usage are collected off the routers, so the figures you see
                  are measured, not estimated. When a package expires, access is cut automatically.
                </p>
              </Section>

              <Section id="analytics" title="Dashboard & Analytics">
                <p>
                  The dashboard shows net and gross sales, commission, active users, data used and revenue by channel. Usage
                  analytics break down data over time, top users and consumption per package — everything you need to see how
                  each location is performing.
                </p>
              </Section>

              <Section id="support" title="Getting Help">
                <p>
                  Stuck on something this page didn&apos;t cover? We&apos;re happy to help.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-purple hover:bg-purple-dark text-white text-sm font-semibold px-6 py-3 rounded-btn transition-colors"
                  >
                    Contact Support <ArrowUpRight size={16} />
                  </Link>
                  <Link
                    href="/faqs"
                    className="inline-flex items-center gap-2 border border-black/12 hover:border-purple text-navy text-sm font-semibold px-6 py-3 rounded-btn transition-colors"
                  >
                    Read FAQs
                  </Link>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
