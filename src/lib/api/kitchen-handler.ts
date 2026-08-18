import { listKitchenOrders } from '@/lib/kitchen/kitchen'
import type { OrdersClient } from '@/lib/orders/orders'

export async function handleListKitchenRequest(orgId: string, client: OrdersClient) {
  try {
    const orders = await listKitchenOrders(client, orgId)
    return Response.json(orders, { status: 200 })
  } catch (error) {
    console.error('kitchen-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los pedidos de cocina' }, { status: 500 })
  }
}
