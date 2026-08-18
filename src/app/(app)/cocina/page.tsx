import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listKitchenOrders } from '@/lib/kitchen/kitchen'
import { getOrderStatuses } from '@/lib/config/service'
import type { OrdersClient } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'
import { KitchenView } from './kitchen-view'

export default async function CocinaPage() {
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

  const [orders, statuses] = await Promise.all([
    listKitchenOrders(client as unknown as OrdersClient, orgId),
    getOrderStatuses(orgId, client as unknown as ConfigClient),
  ])

  return <KitchenView orders={orders} statuses={statuses} />
}
