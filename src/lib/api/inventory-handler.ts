import { addMovement, listInventory } from '@/lib/inventory/inventory'
import type { MovementType } from '@/lib/inventory/inventory'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListInventoryRequest(orgId: string, client: ConfigClient) {
  try {
    const products = await listInventory(client as never, orgId)
    return Response.json(products, { status: 200 })
  } catch (error) {
    console.error('inventory-handler (GET):', error)
    return Response.json({ error: 'No se pudo obtener el inventario' }, { status: 500 })
  }
}

export async function handleCreateMovementRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { product_id?: number; type?: string; qty?: number; note?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const movement = await addMovement(
      client as never,
      orgId,
      body.product_id ?? 0,
      (body.type ?? '') as MovementType,
      body.qty ?? 0,
      body.note ?? null,
      null,
    )
    return Response.json(movement, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Stock insuficiente')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('mayor a 0')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('inválido')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('inventory-handler (POST):', error)
    return Response.json({ error: 'No se pudo registrar el movimiento' }, { status: 500 })
  }
}
