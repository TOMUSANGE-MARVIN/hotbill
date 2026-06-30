'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Karla } from 'next/font/google'
import { Power, Eye, EyeOff, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import AuthBrand from '@/components/AuthBrand'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { useAuthStore } = await import('@/store/auth')
      await login(email, password)
      const user = useAuthStore.getState().user
      router.push(user?.role === 'super_admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid credentials')
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

          <h1 className="text-3xl font-extrabold mb-2">Welcome back</h1>
          <p className="text-[#00012A]/55 mb-8">Sign in to manage your hotspot network.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputCls}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-[#4F4AD7] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00012A]/40 hover:text-[#00012A] transition-colors"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#4F4AD7] hover:bg-[#3F3ABF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : <>Sign In <ArrowUpRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-[#00012A]/60 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[#4F4AD7] hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
