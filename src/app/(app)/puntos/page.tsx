import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listCustomers } from '@/lib/customers/customers'
import type { CustomersClient } from '@/lib/customers/customers'
import { getLoyaltySummary } from '@/lib/loyalty/loyalty'
import type { LoyaltyClient } from '@/lib/loyalty/loyalty'
import type { ConfigClient } from '@/lib/config/service'
import { LoyaltyView } from './loyalty-view'

export default async function PuntosPage() {
  const client = await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  const customers = await listCustomers(client as unknown as CustomersClient, orgId)
  const summaries = await getLoyaltySummary(client as unknown as LoyaltyClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Puntos</h1>

      <LoyaltyView customers={customers} summaries={summaries} />
    </div>
  )
}
