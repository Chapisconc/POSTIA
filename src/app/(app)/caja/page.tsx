import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { getActiveRegister, listRegisters } from '@/lib/caja/caja'
import type { CajaClient } from '@/lib/caja/caja'
import type { ConfigClient } from '@/lib/config/service'
import { CajaView } from './caja-view'

export default async function CajaPage() {
  const client = await createClient()

  const user = await getCurrentUser()

  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  const [active, registers] = await Promise.all([
    getActiveRegister(client as unknown as CajaClient, orgId),
    listRegisters(client as unknown as CajaClient, orgId),
  ])

  return <CajaView active={active} registers={registers} />
}
