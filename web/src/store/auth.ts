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

function persistActiveBusiness(id: number | null) {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(BUSINESS_KEY, String(id))
  else localStorage.removeItem(BUSINESS_KEY)
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  businesses: Business[]
  activeBusinessId: number | null
  login: (email: string, password: string) => Promise<void>
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

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { user, tenant, token, businesses = [] } = res.data
        localStorage.setItem('hotbill_token', token)
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
    }
  )
)
