import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface Tenant {
  id: number
  name: string
  slug: string
  currency: string
  plan: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number
  tenant?: Tenant
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { user, tenant, token } = res.data
        localStorage.setItem('hotbill_token', token)
        set({ user, tenant, token })
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {})
        localStorage.removeItem('hotbill_token')
        set({ user: null, tenant: null, token: null })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'hotbill-auth',
      partialize: (s) => ({ user: s.user, tenant: s.tenant, token: s.token }),
    }
  )
)
