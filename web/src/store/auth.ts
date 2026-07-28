import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface Tenant {
  id: number
  name: string
  slug?: string
  currency: string
  plan: string
}

export interface Business {
  id: number
  name: string
  currency: string
  plan: string
  routers_count: number
  is_active: boolean
}

interface User {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number
  tenant?: Tenant
}

const BUSINESS_KEY = 'hotbill_business'
const DEVICE_KEY = 'hotbill_device_token'

function persistActiveBusiness(id: number | null) {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(BUSINESS_KEY, String(id))
  else localStorage.removeItem(BUSINESS_KEY)
}

// The full authenticated payload returned once a session is established
// (direct trusted-device login, or after an email code is verified).
export interface AuthPayload {
  user: User
  tenant: Tenant
  token: string
  businesses?: Business[]
  device_token?: string | null
}

// login() either establishes a session immediately (trusted device) or asks
// the caller to collect an emailed code first.
export type LoginResult =
  | { status: 'ok' }
  | { status: 'otp'; email: string; message: string }
  | { status: 'verify'; email: string; message: string }

interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  businesses: Business[]
  activeBusinessId: number | null
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (email: string, password: string) => Promise<LoginResult>
  finalizeAuth: (payload: AuthPayload) => void
  logout: () => void
  setUser: (user: User) => void
  refreshBusinesses: () => Promise<void>
  switchBusiness: (id: number) => Promise<void>
  addBusiness: (name: string) => Promise<Business>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      businesses: [],
      activeBusinessId: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      login: async (email, password) => {
        const device_token =
          typeof window !== 'undefined' ? localStorage.getItem(DEVICE_KEY) : null
        const res = await api.post('/auth/login', { email, password, device_token })

        // Trusted device / already-verified session → we get a token straight away.
        if (res.data.token) {
          get().finalizeAuth(res.data)
          return { status: 'ok' }
        }
        // Otherwise the API asks us to collect an emailed code first.
        if (res.data.requires_verification) {
          return { status: 'verify', email: res.data.email, message: res.data.message }
        }
        return { status: 'otp', email: res.data.email, message: res.data.message }
      },

      // Persist a completed session (used after trusted-device login and after
      // an email verification / login code is confirmed).
      finalizeAuth: (payload) => {
        const { user, tenant, token, businesses = [], device_token } = payload
        localStorage.setItem('hotbill_token', token)
        if (device_token) localStorage.setItem(DEVICE_KEY, device_token)
        persistActiveBusiness(tenant?.id ?? null)
        set({ user, tenant, token, businesses, activeBusinessId: tenant?.id ?? null })
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {})
        localStorage.removeItem('hotbill_token')
        persistActiveBusiness(null)
        set({ user: null, tenant: null, token: null, businesses: [], activeBusinessId: null })
      },

      setUser: (user) => set({ user }),

      refreshBusinesses: async () => {
        const res = await api.get('/businesses')
        set({ businesses: res.data })
      },

      switchBusiness: async (id) => {
        persistActiveBusiness(id)
        const biz = get().businesses.find((b) => b.id === id)
        set((s) => ({
          activeBusinessId: id,
          tenant: biz ? { ...(s.tenant ?? {} as Tenant), id: biz.id, name: biz.name, currency: biz.currency, plan: biz.plan } : s.tenant,
          businesses: s.businesses.map((b) => ({ ...b, is_active: b.id === id })),
        }))
        // Remember as the default business for next login (non-blocking).
        api.post(`/businesses/${id}/activate`).catch(() => {})
      },

      addBusiness: async (name) => {
        const res = await api.post('/businesses', { name })
        const created: Business = res.data
        await get().refreshBusinesses()
        await get().switchBusiness(created.id)
        return created
      },
    }),
    {
      name: 'hotbill-auth',
      partialize: (s) => ({
        user: s.user,
        tenant: s.tenant,
        token: s.token,
        businesses: s.businesses,
        activeBusinessId: s.activeBusinessId,
      }),
      // Flag when the persisted session has loaded so route guards don't bounce
      // to /login during the brief pre-hydration window (was logging users out on refresh).
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
)
