import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  setTheme: (t: Theme) => void
  toggle: () => void
}

/**
 * Tenant-dashboard theme. The `dark` class is applied on the dashboard root
 * wrapper (not <html>), so it only affects the tenant side — the marketing
 * site and platform-admin area keep their own styling.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'hotbill_theme',
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
