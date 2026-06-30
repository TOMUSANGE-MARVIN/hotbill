'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, Headphones, FileText } from 'lucide-react'
import Reveal from '@/components/landing/Reveal'

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'info@hotbill.app', href: 'mailto:info@hotbill.app' },
  { icon: Phone, label: 'Phone', value: '+256 705 240 647 / +256 761 700 498', href: 'tel:+256705240647' },
  { icon: MapPin, label: 'Office', value: 'Kampala, Uganda', href: '#' },
  { icon: Clock, label: 'Support Hours', value: 'Mon-Fri, 8am-6pm EAT', href: '#' },
]

const supportOptions = [
  { icon: MessageSquare, title: 'Live Chat', description: 'Get instant help from our support team during business hours.', cta: 'Start Chat', href: 'https://wa.me/256705240647' },
  { icon: Headphones, title: 'Phone Support', description: 'Talk to a real person for urgent issues or complex setups.', cta: 'Call Us', href: 'tel:+256705240647' },
  { icon: FileText, title: 'Documentation', description: 'Step-by-step guides for setup, configuration, and troubleshooting.', cta: 'View Docs', href: '/docs' },
]

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mrewakva'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      // AJAX submit (Accept: application/json) so Formspree returns JSON instead
      // of redirecting to its thank-you page — the user stays right here.
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          _subject: `HotBill contact: ${form.subject || 'New message'}`,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.errors?.[0]?.message ?? 'Something went wrong. Please try again or email us directly.')
      }
    } catch {
      setError('Could not send your message. Please check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const inputCls = 'w-full border border-black/12 rounded-btn px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-purple/40 focus:border-purple outline-none transition-all'

  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <Reveal className="container-1200 text-center">
          <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
            Contact Us
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-1px] text-navy mb-6">
            Get in <span className="text-purple">touch</span>
          </h1>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Have a question, need a demo, or want to discuss enterprise pricing? We&apos;d love to hear from you.
          </p>
        </Reveal>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="container-1200">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            <Reveal className="lg:col-span-3">
              <div className="bg-white rounded-card border border-black/[0.08] p-6 lg:p-10">
                {submitted ? (
                  <div className="text-center py-16">
                    <span className="inline-flex w-16 h-16 bg-purple/10 rounded-full items-center justify-center mb-5">
                      <Send size={28} className="text-purple" />
                    </span>
                    <h3 className="text-2xl font-bold text-navy mb-2">Message Sent!</h3>
                    <p className="text-navy/60 max-w-sm mx-auto">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                    <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }} className="mt-6 text-purple hover:underline text-sm font-semibold">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-navy mb-1">Send us a message</h2>
                    <p className="text-sm text-navy/55 mb-8">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-btn p-3">{error}</div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-navy mb-1.5">Full Name</label>
                          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nakato Wamala" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
                          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nakato.wamala@gmail.com" className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy mb-1.5">Subject</label>
                        <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
                          <option value="">Select a topic</option>
                          <option value="demo">Request a Demo</option>
                          <option value="sales">Sales Inquiry</option>
                          <option value="support">Technical Support</option>
                          <option value="partnership">Partnership</option>
                          <option value="enterprise">Enterprise Pricing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy mb-1.5">Message</label>
                        <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help..." className={`${inputCls} resize-none`} />
                      </div>
                      <button type="submit" disabled={sending} className="w-full sm:w-auto bg-purple hover:bg-purple-dark text-white px-8 py-3 rounded-btn text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        <Send size={16} /> {sending ? 'Sending…' : 'Send Message'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="font-bold text-lg text-navy mb-5">Contact Information</h3>
                <div className="space-y-4">
                  {contactInfo.map((info) => (
                    <a key={info.label} href={info.href} className="flex items-start gap-4 group">
                      <span className="w-10 h-10 bg-purple/10 rounded-btn flex items-center justify-center shrink-0 group-hover:bg-purple/20 transition-colors">
                        <info.icon size={18} className="text-purple" />
                      </span>
                      <div>
                        <p className="text-xs text-navy/45 font-medium mb-0.5">{info.label}</p>
                        <p className="text-sm font-medium text-navy">{info.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-card overflow-hidden border border-black/10 h-52 bg-lightgray flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={28} className="text-navy/25 mx-auto mb-2" />
                  <p className="text-xs text-navy/45">Kampala, Uganda</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-16 lg:py-20">
        <div className="container-1200">
          <Reveal className="text-center mb-12">
            <h2 className="text-2xl font-bold text-navy mb-2">Other ways to get help</h2>
            <p className="text-sm text-navy/55">Choose the support channel that works best for you.</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {supportOptions.map((option, i) => (
              <Reveal key={option.title} delay={i * 90}>
                <div className="bg-white rounded-card border border-black/[0.08] p-6 text-center group hover:-translate-y-1 transition-transform duration-200 h-full">
                  <span className="inline-flex w-12 h-12 bg-purple/10 rounded-btn items-center justify-center mb-4">
                    <option.icon size={22} className="text-purple" />
                  </span>
                  <h3 className="font-bold text-navy mb-1">{option.title}</h3>
                  <p className="text-sm text-navy/55 mb-4">{option.description}</p>
                  {option.href.startsWith('/') ? (
                    <Link href={option.href} className="text-purple text-sm font-semibold hover:underline transition-colors">{option.cta} →</Link>
                  ) : (
                    <a href={option.href} target={option.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-purple text-sm font-semibold hover:underline transition-colors">{option.cta} →</a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
