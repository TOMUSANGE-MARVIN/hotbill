'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Karla } from 'next/font/google'
import { Power, Eye, EyeOff, ArrowUpRight, Check } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import AuthBrand from '@/components/AuthBrand'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    tenant_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', form)
      const { token } = res.data
      localStorage.setItem('hotbill_token', token)
      await login(form.email, form.password)
      router.push('/dashboard')
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (errors) {
        setError(Object.values(errors).flat().join(' '))
      } else {
        setError(err.response?.data?.message ?? 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full border border-black/12 rounded-lg px-4 py-3 text-sm text-[#00012A] bg-white placeholder:text-[#00012A]/35 focus:ring-2 focus:ring-[#4F4AD7]/40 focus:border-[#4F4AD7] outline-none transition-all'

  return (
    <div className={`${karla.className} min-h-screen grid lg:grid-cols-2 bg-white text-[#00012A]`}>
      <AuthBrand />

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10">
            <span className="w-9 h-9 rounded-full bg-[#4F4AD7] flex items-center justify-center">
              <Power size={18} className="text-white" strokeWidth={2.5} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">HOTBILL</span>
          </div>

          <h1 className="text-3xl font-extrabold mb-2">Create your account</h1>
          <p className="text-[#00012A]/55 mb-8">Set up your HotBill workspace — no card required.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Business / Hotspot Name</label>
              <input type="text" value={form.tenant_name} onChange={(e) => set('tenant_name', e.target.value)} placeholder="e.g. Kampala WiFi Hub" className={inputCls} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Your Full Name</label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. John Doe" className={inputCls} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@company.com" className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+256 700 000000" className={inputCls} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 chars" className={`${inputCls} pr-11`} required minLength={8} />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00012A]/40 hover:text-[#00012A] transition-colors" aria-label={show ? 'Hide' : 'Show'}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm</label>
                <input type={show ? 'text' : 'password'} value={form.password_confirmation} onChange={(e) => set('password_confirmation', e.target.value)} placeholder="Re-enter" className={inputCls} required />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#4F4AD7] hover:bg-[#3F3ABF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : <>Create Account <ArrowUpRight size={16} /></>}
            </button>
          </form>

          <ul className="grid grid-cols-2 gap-y-2 gap-x-4 mt-6 text-xs text-[#00012A]/55">
            {['Free Starter plan', 'No credit card', '2 routers included', 'Cancel anytime'].map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#4F4AD7]/10 flex items-center justify-center">
                  <Check size={10} className="text-[#4F4AD7]" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <p className="text-center text-sm text-[#00012A]/60 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#4F4AD7] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
