'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Karla } from 'next/font/google'
import { Power, ArrowUpRight, ArrowLeft, MailCheck } from 'lucide-react'
import api from '@/lib/api'
import AuthBrand from '@/components/AuthBrand'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.')
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
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10">
            <span className="w-9 h-9 rounded-full bg-[#4F4AD7] flex items-center justify-center">
              <Power size={18} className="text-white" strokeWidth={2.5} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">HOTBILL</span>
          </div>

          {sent ? (
            <div className="text-center">
              <span className="inline-flex w-12 h-12 rounded-full bg-[#4F4AD7]/10 items-center justify-center mb-5">
                <MailCheck size={22} className="text-[#4F4AD7]" />
              </span>
              <h1 className="text-3xl font-extrabold mb-2">Check your email</h1>
              <p className="text-[#00012A]/55 mb-8">
                If an account exists for <span className="font-medium text-[#00012A]">{email}</span>, we&apos;ve sent a
                link to reset your password. It expires shortly, so use it soon.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-semibold text-[#4F4AD7] hover:underline"
              >
                <ArrowLeft size={16} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold mb-2">Forgot password?</h1>
              <p className="text-[#00012A]/55 mb-8">
                Enter the email for your account and we&apos;ll send you a reset link.
              </p>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#4F4AD7] hover:bg-[#3F3ABF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending...' : <>Send reset link <ArrowUpRight size={16} /></>}
                </button>
              </form>

              <p className="text-center text-sm text-[#00012A]/60 mt-8">
                <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-[#4F4AD7] hover:underline">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
