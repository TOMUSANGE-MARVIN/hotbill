'use client'

import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { Bell, User, Menu, Sun, Moon } from 'lucide-react'

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuthStore()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      <button
        className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 relative">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
