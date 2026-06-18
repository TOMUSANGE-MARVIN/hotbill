'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { RouterSetupWizard } from '@/components/router-setup/RouterSetupWizard'
import { Loader2 } from 'lucide-react'

export default function RouterSetupSettingsPage() {
  const navRouter = useRouter()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const creating = useRef(false)

  const { data: routers, isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: () => api.get('/routers').then((r) => r.data),
  })

  const createRouter = useMutation({
    mutationFn: (name: string) => api.post('/routers', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routers'] }),
  })

  useEffect(() => {
    if (!isLoading && routers?.length === 0 && !creating.current) {
      creating.current = true
      createRouter.mutate(`${tenant?.name ?? 'Main'} Router`)
    }
  }, [isLoading, routers, tenant, createRouter])

  if (isLoading || !routers?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Setting up your router...</p>
      </div>
    )
  }

  const router = routers[0]

  return <RouterSetupWizard routerId={String(router.id)} onFinish={() => navRouter.push('/routers')} />
}
