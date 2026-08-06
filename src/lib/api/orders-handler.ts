import { createOrder, listOrders, chargeOrder, type OrderItem } from '@/lib/orders/orders'
import { getOrgSettings } from '@/lib/config/service'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListOrdersRequest(orgId: string, client: ConfigClient) {
  try {
    const orders = await listOrders(client as never, orgId)
    return Response.json(orders, { status: 200 })
  } catch (error) {
    console.error('orders-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los pedidos' }, { status: 500 })
  }
}

export async function handleCreateOrderRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { order_type_id?: number; items?: OrderItem[]; notes?: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  const invalidItem = items.some(
    (item) =>
      typeof item?.product_id !== 'number' ||
      typeof item.name !== 'string' ||
      typeof item.qty !== 'number' ||
      item.qty <= 0 ||
      typeof item.unit_price !== 'number' ||
      item.unit_price < 0,
  )

  if (!Array.isArray(body.items) || items.length === 0) {
    return Response.json({ error: 'El pedido debe incluir al menos un producto' }, { status: 400 })
  }
  if (invalidItem) {
    return Response.json({ error: 'Los productos del pedido tienen datos inválidos' }, { status: 400 })
  }
  if (typeof body.order_type_id !== 'number') {
    return Response.json({ error: 'Se requiere el tipo de pedido' }, { status: 400 })
  }

  try {
    const settings = await getOrgSettings(orgId, client)
    const order = await createOrder(
      client as never,
      orgId,
      { order_type_id: body.order_type_id, items, notes: body.notes },
      settings,
    )
    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error('orders-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
  }
}

export async function handleChargeOrderRequest(
  orgId: string,
  client: ConfigClient,
  orderId: number,
  request: Request,
) {
  let body: { payment_method_id?: number }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (typeof body.payment_method_id !== 'number') {
    return Response.json({ error: 'Se requiere el método de pago' }, { status: 400 })
  }

  try {
    const order = await chargeOrder(client as never, orgId, orderId, body.payment_method_id)
    return Response.json(order, { status: 200 })
  } catch (error) {
    console.error('orders-handler (PATCH):', error)
    return Response.json({ error: 'No se pudo cobrar el pedido' }, { status: 500 })
  }
}
