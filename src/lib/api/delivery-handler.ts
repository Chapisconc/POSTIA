import {
  createDelivery,
  listDeliveries,
  updateDeliveryStatus,
  DELIVERY_STATUSES,
  type DeliveryStatus,
} from '@/lib/delivery/delivery'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListDeliveriesRequest(orgId: string, client: ConfigClient) {
  try {
    const deliveries = await listDeliveries(client as never, orgId)
    return Response.json(deliveries, { status: 200 })
  } catch (error) {
    console.error('delivery-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener las entregas' }, { status: 500 })
  }
}

export async function handleCreateDeliveryRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { order_id?: number; courier?: string | null; note?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (
    typeof body.order_id !== 'number' ||
    !Number.isInteger(body.order_id) ||
    body.order_id <= 0
  ) {
    return Response.json({ error: 'El pedido es obligatorio' }, { status: 400 })
  }

  try {
    const delivery = await createDelivery(client as never, orgId, {
      order_id: body.order_id,
      courier: body.courier ?? null,
      note: body.note ?? null,
    })
    return Response.json(delivery, { status: 201 })
  } catch (error) {
    console.error('delivery-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear la entrega' }, { status: 500 })
  }
}

export async function handleUpdateDeliveryStatusRequest(
  orgId: string,
  client: ConfigClient,
  deliveryId: number,
  request: Request,
) {
  let body: { status?: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (typeof body.status !== 'string' || !DELIVERY_STATUSES.includes(body.status as DeliveryStatus)) {
    return Response.json({ error: 'Estado de entrega inválido' }, { status: 400 })
  }

  try {
    const delivery = await updateDeliveryStatus(
      client as never,
      orgId,
      deliveryId,
      body.status as DeliveryStatus,
    )
    return Response.json(delivery, { status: 200 })
  } catch (error) {
    console.error('delivery-handler (PATCH status):', error)
    return Response.json({ error: 'No se pudo actualizar el estado' }, { status: 500 })
  }
}
