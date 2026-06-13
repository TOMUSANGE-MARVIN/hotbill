'use client'

import { useParams, useRouter } from 'next/navigation'
import { RouterSetupWizard } from '@/components/router-setup/RouterSetupWizard'

export default function RouterSetupPage() {
  const params = useParams<{ id: string }>()
  const routerId = params.id as string
  const navRouter = useRouter()

  return <RouterSetupWizard routerId={routerId} onFinish={() => navRouter.push('/routers')} />
}
