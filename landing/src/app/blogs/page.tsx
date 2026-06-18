'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const featured = {
  category: 'Product',
  title: 'How HotBill Cut Hotspot Setup Time From Days to 60 Seconds',
  excerpt: 'A deep dive into our one-click MikroTik provisioning script — how it configures RADIUS, hotspot, firewall and VPN automatically, and why it changes the economics of running an ISP.',
  image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=560&fit=crop',
  author: 'Marvin Tomusange',
  date: 'Jun 12, 2026',
  read: '6 min read',
}

const posts = [
  {
    category: 'Guides',
    title: 'Setting Up Mobile Money Billing for Your Hotspot',
    excerpt: 'Step-by-step: connect PesaPal, accept MTN MoMo and Airtel Money, and auto-activate packages on payment.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500&h=340&fit=crop',
    author: 'Grace Achieng',
    date: 'Jun 8, 2026',
    read: '5 min read',
  },
  {
    category: 'Engineering',
    title: 'Reaching Routers Behind NAT With WireGuard',
    excerpt: 'How we built a secure tunnel so HotBill can manage routers with no public IP — from anywhere.',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&h=340&fit=crop',
    author: 'Patrick Mugisha',
    date: 'Jun 3, 2026',
    read: '8 min read',
  },
  {
    category: 'Business',
    title: 'Pricing Internet Packages That Actually Sell',
    excerpt: 'Lessons from 80+ operators on package duration, speed tiers and fair-use that maximise revenue.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&h=340&fit=crop',
    author: 'Diana Namubiru',
    date: 'May 28, 2026',
    read: '4 min read',
  },
  {
    category: 'Guides',
    title: 'Generating & Selling Voucher Batches at Scale',
    excerpt: 'Create printable voucher batches, hand them to resellers, and track every code to redemption.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=340&fit=crop',
    author: 'Grace Achieng',
    date: 'May 21, 2026',
    read: '5 min read',
  },
  {
    category: 'Product',
    title: 'Reading Your Revenue Dashboard Like a Pro',
    excerpt: 'Turn raw numbers into decisions — spot churn, find your best packages, and plug revenue leaks.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=340&fit=crop',
    author: 'Marvin Tomusange',
    date: 'May 15, 2026',
    read: '6 min read',
  },
  {
    category: 'Business',
    title: 'From 2 Routers to 15: A Growth Story',
    excerpt: 'How a Gulu operator scaled their WiFi business in 6 months using automated billing.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&h=340&fit=crop',
    author: 'Diana Namubiru',
    date: 'May 9, 2026',
    read: '7 min read',
  },
]

const categories = ['All', 'Product', 'Guides', 'Engineering', 'Business']

export default function BlogsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            Blogs
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-1px] text-navy mb-6">
            Insights from the <span className="text-purple">field</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Guides, engineering notes and growth stories to help you run a more profitable hotspot business.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white py-20 lg:py-24">
        <div className="container-1200">
          <Link href="#" className="group grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="rounded-card overflow-hidden border border-black/[0.06]">
              <Image src={featured.image} alt={featured.title} width={900} height={560} className="w-full group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div>
              <span className="inline-block border border-purple/40 text-purple text-xs font-semibold px-4 py-1.5 rounded-pill mb-5">
                {featured.category}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4 leading-tight group-hover:text-purple transition-colors">
                {featured.title}
              </h2>
              <p className="text-navy/60 leading-relaxed mb-6">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-navy/50">
                <span className="font-semibold text-navy">{featured.author}</span>
                <span>·</span>
                <span>{featured.date}</span>
                <span>·</span>
                <span>{featured.read}</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Category filter + grid */}
      <section className="bg-white pb-24 lg:pb-28">
        <div className="container-1200">
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((c, i) => (
              <button
                key={c}
                className={`text-sm font-medium px-5 py-2 rounded-pill border transition-colors duration-200 ${
                  i === 0 ? 'bg-purple text-white border-purple' : 'border-black/15 text-navy/60 hover:border-purple hover:text-purple'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {posts.map((post) => (
              <Link key={post.title} href="#" className="group bg-white rounded-card border border-black/[0.08] overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200">
                <div className="relative aspect-[3/2] overflow-hidden bg-lightgray">
                  <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-navy text-[11px] font-semibold px-3 py-1 rounded-pill">
                    {post.category}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-navy leading-snug mb-2 group-hover:text-purple transition-colors">{post.title}</h3>
                  <p className="text-sm text-navy/55 leading-relaxed mb-4 flex-1">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-navy/50 pt-3 border-t border-black/[0.06]">
                    <span>{post.date} · {post.read}</span>
                    <ArrowUpRight size={16} className="text-purple" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-navy py-20 lg:py-24 text-center">
        <div className="container-1200">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Never miss an update</h2>
          <p className="text-white/60 max-w-md mx-auto mb-8">Get new guides and product news in your inbox. No spam, unsubscribe anytime.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder="you@company.com" className="flex-1 rounded-btn px-4 py-3 text-sm text-navy bg-white outline-none" />
            <button type="submit" className="bg-purple hover:bg-purple-dark text-white px-6 py-3 rounded-btn text-sm font-semibold transition-colors">Subscribe</button>
          </form>
        </div>
      </section>
    </>
  )
}
