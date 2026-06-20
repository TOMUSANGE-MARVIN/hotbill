'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Target, Heart, Lightbulb, Users } from 'lucide-react'
import Reveal from '@/components/landing/Reveal'

const values = [
  { icon: Target, title: 'Operator-First', description: 'Every decision starts with the question: does this make life easier for ISP operators in the field?' },
  { icon: Lightbulb, title: 'Radical Simplicity', description: 'Complex technology should feel effortless. One script to provision, one dashboard to manage, one platform to bill.' },
  { icon: Heart, title: 'Built for Africa', description: 'We understand African connectivity challenges, intermittent power, mobile-first payments, low-bandwidth environments.' },
  { icon: Users, title: 'Community Driven', description: 'Our roadmap is shaped by feedback from 80+ operators running real businesses in the field.' },
]

const team = [
  { name: 'Marvin Tomusange', role: 'Founder & CEO', image: 'https://randomuser.me/api/portraits/men/75.jpg', bio: 'Full-stack engineer passionate about building technology that powers African connectivity.' },
  { name: 'Grace Achieng', role: 'Head of Product', image: 'https://randomuser.me/api/portraits/women/68.jpg', bio: 'Former ISP operator who understands the daily challenges of running a WiFi business.' },
  { name: 'Patrick Mugisha', role: 'Lead Engineer', image: 'https://randomuser.me/api/portraits/men/46.jpg', bio: 'MikroTik-certified network engineer with 8 years of experience in ISP infrastructure.' },
  { name: 'Diana Namubiru', role: 'Customer Success', image: 'https://randomuser.me/api/portraits/women/33.jpg', bio: 'Ensures every operator gets the support they need to grow their business.' },
]

const milestones = [
  { year: '2024', title: 'The Idea', description: 'Born from frustration with existing ISP billing tools that were expensive, slow, and didn\'t support African payment methods.' },
  { year: '2025', title: 'First Beta', description: 'Launched with 5 ISP operators in Kampala. Processed first mobile money payment through the captive portal.' },
  { year: '2025', title: 'Product-Market Fit', description: 'Expanded to 40+ operators across Uganda. Added voucher system and multi-router support.' },
  { year: '2026', title: 'Scaling Up', description: '80+ operators, 500+ routers, 50K subscribers. Launched remote access VPN and enterprise plans.' },
]

export default function AboutPage() {
  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
                About Us
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-1px] text-navy mb-6">
                Connecting Africa, <span className="text-purple">one hotspot</span> at a time
              </h1>
              <p className="text-lg text-navy/60 leading-relaxed mb-6">
                HotBill was born from a simple frustration: why is it so hard to run a WiFi business in Africa? Existing tools were built for Western markets, expensive, overly complex, and disconnected from how African operators actually work.
              </p>
              <p className="text-lg text-navy/60 leading-relaxed">
                We set out to build the billing platform we wished existed, one that speaks MikroTik natively, accepts mobile money out of the box, and lets operators go from zero to collecting revenue in under 5 minutes.
              </p>
            </Reveal>
            <Reveal delay={120} className="relative">
              <div className="rounded-card overflow-hidden border border-black/[0.06] shadow-[0_24px_60px_rgba(0,1,42,0.12)]">
                <Image src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700&h=500&fit=crop" alt="Team" width={700} height={500} className="w-full" />
              </div>
              <div className="absolute -bottom-5 -right-5 bg-purple text-white rounded-card p-5 shadow-xl">
                <div className="text-3xl font-extrabold">80+</div>
                <div className="text-sm text-white/80">ISP Operators</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 lg:py-28">
        <div className="container-1200">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Our values</h2>
            <p className="text-navy/60 max-w-xl mx-auto">The principles that guide every product decision and customer interaction.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <div className="bg-white rounded-card border border-black/[0.08] p-6 lg:p-8 hover:-translate-y-1 transition-transform duration-200 h-full">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-btn bg-purple/10 mb-5">
                    <v.icon size={22} className="text-purple" />
                  </span>
                  <h3 className="font-bold text-lg text-navy mb-2">{v.title}</h3>
                  <p className="text-sm text-navy/55 leading-relaxed">{v.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Our journey</h2>
            <p className="text-navy/60 max-w-xl mx-auto">From a weekend project to powering 80+ ISPs across Africa.</p>
          </Reveal>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-navy/15" />
              <div className="space-y-10">
                {milestones.map((m, i) => (
                  <Reveal key={i} delay={i * 90} className="flex gap-6">
                    <div className="shrink-0 w-11 h-11 bg-purple rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                      {m.year.slice(2)}
                    </div>
                    <div className="pt-1.5">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-semibold text-purple">{m.year}</span>
                        <h3 className="font-bold text-navy">{m.title}</h3>
                      </div>
                      <p className="text-sm text-navy/60 leading-relaxed">{m.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="team" className="bg-white py-24 lg:py-28">
        <div className="container-1200">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">Meet the team</h2>
            <p className="text-navy/60 max-w-xl mx-auto">Engineers and operators building the future of ISP billing in Africa.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {team.map((member, i) => (
              <Reveal key={member.name} delay={i * 80} className="bg-white rounded-card border border-black/[0.08] overflow-hidden group">
                <div className="relative h-56 overflow-hidden bg-lightgray">
                  <Image src={member.image} alt={member.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-navy">{member.name}</h3>
                  <p className="text-sm text-purple font-medium mb-2">{member.role}</p>
                  <p className="text-xs text-navy/55 leading-relaxed">{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="careers" className="bg-purple py-20 lg:py-24">
        <div className="container-1200">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Join our mission</h2>
              <p className="text-white/70 leading-relaxed mb-6">
                We&apos;re building the infrastructure that powers internet access for millions across Africa. If you&apos;re passionate about connectivity and impact, we&apos;d love to hear from you.
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-purple px-6 py-3 rounded-btn text-sm font-semibold hover:bg-white/90 transition-colors">
                View Open Roles <ArrowUpRight size={16} />
              </Link>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 text-center">
              {[['4', 'Countries'], ['Remote', 'Work Culture'], ['12+', 'Team Members'], ['50K+', 'Users Served']].map(([v, l], i) => (
                <Reveal key={l} delay={i * 80} className="bg-white/10 rounded-card p-5">
                  <div className="text-2xl font-bold text-white">{v}</div>
                  <div className="text-xs text-white/60">{l}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
