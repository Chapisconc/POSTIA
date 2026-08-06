import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listOrders } from '@/lib/orders/orders'
import { getOrderStatuses } from '@/lib/config/service'
import type { OrdersClient } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'
import { OrdersClientView } from './orders-client'

export default async function OrdersPage() {
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
    listOrders(client as unknown as OrdersClient, orgId),
    getOrderStatuses(orgId, client as unknown as ConfigClient),
  ])

  return <OrdersClientView orders={orders} statuses={statuses} />
}
