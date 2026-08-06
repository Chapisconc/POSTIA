import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listDeliveries } from '@/lib/delivery/delivery'
import type { DeliveriesClient } from '@/lib/delivery/delivery'
import { listOrders } from '@/lib/orders/orders'
import type { OrdersClient } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'
import { DeliveryView } from './delivery-view'

export default async function DeliveryPage() {
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

  const [deliveries, orders] = await Promise.all([
    listDeliveries(client as unknown as DeliveriesClient, orgId),
    listOrders(client as unknown as OrdersClient, orgId),
  ])

  const deliveredOrderIds = new Set(deliveries.map((delivery) => delivery.order_id))
  const availableOrders = orders.filter((order) => !deliveredOrderIds.has(order.id))

  return <DeliveryView deliveries={deliveries} availableOrders={availableOrders} />
}
