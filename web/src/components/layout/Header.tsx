'use client'

import { useAuthStore } from '@/store/auth'
import { Sun, Moon, Bell, User } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { user } = useAuthStore()
  const [dark, setDark] = useState(false)

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={() => setDark(!dark)}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
        >
          {dark ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 relative">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
