import { listOrders, type Order, type OrdersClient } from '@/lib/orders/orders'
import { getOrderStatuses, type OrderStatus } from '@/lib/config/service'

export async function listKitchenOrders(
  client: OrdersClient,
  orgId: string,
): Promise<Order[]> {
  const [orders, statuses] = await Promise.all([
    listOrders(client, orgId),
    getOrderStatuses(orgId, client as never),
  ])

  const kitchenStatusIds = new Set(
    statuses.filter((s) => s.notify_kitchen).map((s) => s.id),
  )

  return orders.filter((order) => kitchenStatusIds.has(order.status_id ?? -1))
}

export async function getKitchenStatuses(
  client: OrdersClient,
  orgId: string,
): Promise<OrderStatus[]> {
  const statuses = await getOrderStatuses(orgId, client as never)
  return statuses.filter((s) => s.notify_kitchen)
}
