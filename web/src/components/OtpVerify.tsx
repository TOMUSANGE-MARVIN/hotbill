'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import type { AuthPayload } from '@/store/auth'

const CODE_LEN = 6

interface Props {
  email: string
  /** 'register' verifies via /auth/verify-email; 'login' via /auth/verify-otp */
  purpose: 'register' | 'login'
  message?: string
  onVerified: (payload: AuthPayload) => void
  onBack?: () => void
}

/**
 * Shared "enter the 6-digit code we emailed you" step used by both the
 * registration and login flows. Handles submit, resend-with-cooldown, and the
 * remember-this-device option (skips 2FA on this device for the trust window).
 */
export default function OtpVerify({ email, purpose, message, onVerified, onBack }: Props) {
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Tick down the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < CODE_LEN) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const endpoint = purpose === 'register' ? '/auth/verify-email' : '/auth/verify-otp'
      const res = await api.post(endpoint, { email, code, remember_device: remember })
      onVerified(res.data)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      setError(
        errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message ?? 'Invalid code'
      )
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    setError('')
    setResent(false)
    try {
      await api.post('/auth/resend-code', { email, purpose })
      setResent(true)
      setCooldown(45)
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message ?? 'Please wait before requesting another code.')
        setCooldown(45)
      } else {
        setError('Could not resend the code. Please try again.')
      }
    }
  }

  const inputCls =
    'w-full border border-black/12 rounded-lg px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-[#00012A] bg-white placeholder:tracking-normal placeholder:text-[#00012A]/30 focus:ring-2 focus:ring-[#4F4AD7]/40 focus:border-[#4F4AD7] outline-none transition-all'

  return (
    <div>
      <div className="w-12 h-12 rounded-full bg-[#4F4AD7]/10 flex items-center justify-center mb-5">
        <ShieldCheck size={24} className="text-[#4F4AD7]" />
      </div>
      <h1 className="text-3xl font-extrabold mb-2">Enter your code</h1>
      <p className="text-[#00012A]/55 mb-8">
        {message ?? (
          <>
            We&apos;ve sent a 6-digit code to <span className="font-semibold text-[#00012A]">{email}</span>.
          </>
        )}
      </p>

      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
        )}
        {resent && !error && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3">
            A new code has been sent.
          </div>
        )}

        <input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LEN}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LEN))}
          placeholder="••••••"
          className={inputCls}
          aria-label="Verification code"
        />

        <label className="flex items-center gap-2 text-sm text-[#00012A]/70 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-black/20 text-[#4F4AD7] focus:ring-[#4F4AD7]/40"
          />
          Trust this device for 30 days
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#4F4AD7] hover:bg-[#3F3ABF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Verifying...' : <>Verify <ArrowUpRight size={16} /></>}
        </button>
      </form>

      <div className="flex items-center justify-between mt-6 text-sm">
        {onBack ? (
          <button onClick={onBack} className="text-[#00012A]/60 hover:text-[#00012A] font-medium">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="font-semibold text-[#4F4AD7] hover:underline disabled:text-[#00012A]/40 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  )
}
