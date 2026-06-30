'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Karla } from 'next/font/google'
import { Power, Eye, EyeOff, ArrowUpRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import AuthBrand from '@/components/AuthBrand'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const inputCls =
  'w-full border border-black/12 rounded-lg px-4 py-3 text-sm text-[#00012A] bg-white placeholder:text-[#00012A]/35 focus:ring-2 focus:ring-[#4F4AD7]/40 focus:border-[#4F4AD7] outline-none transition-all'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirm,
      })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      const data = err.response?.data
      setError(data?.errors?.email?.[0] ?? data?.message ?? 'Could not reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-5">
          <CheckCircle2 size={24} className="text-green-600" />
        </span>
        <h1 className="text-3xl font-extrabold mb-2">Password reset</h1>
        <p className="text-[#00012A]/55 mb-8">Your password has been updated. Redirecting you to sign in…</p>
        <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#4F4AD7] hover:underline">
          <ArrowLeft size={16} /> Go to sign in
        </Link>
      </div>
    )
  }

  if (!token || !email) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-extrabold mb-2">Invalid link</h1>
        <p className="text-[#00012A]/55 mb-8">This reset link is missing information or has expired. Please request a new one.</p>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 font-semibold text-[#4F4AD7] hover:underline">
          <ArrowLeft size={16} /> Request a new link
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold mb-2">Set a new password</h1>
      <p className="text-[#00012A]/55 mb-8">
        Resetting the password for <span className="font-medium text-[#00012A]">{email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1.5">New password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={`${inputCls} pr-11`}
              minLength={8}
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

        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm password</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            className={inputCls}
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#4F4AD7] hover:bg-[#3F3ABF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Resetting...' : <>Reset password <ArrowUpRight size={16} /></>}
        </button>
      </form>

      <p className="text-center text-sm text-[#00012A]/60 mt-8">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-[#4F4AD7] hover:underline">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </p>
    </>
  )
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<p className="text-[#00012A]/55">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
