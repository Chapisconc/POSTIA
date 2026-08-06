import { createPromotion, listPromotions, togglePromotion } from '@/lib/promotions/promotions'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListPromotionsRequest(orgId: string, client: ConfigClient) {
  try {
    const promotions = await listPromotions(client as never, orgId)
    return Response.json(promotions, { status: 200 })
  } catch (error) {
    console.error('promotions-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener las promociones' }, { status: 500 })
  }
}

export async function handleCreatePromotionRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: {
    name?: string
    discount_type?: string
    value?: number
    starts_at?: string | null
    ends_at?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const promotion = await createPromotion(client as never, orgId, {
      name: body.name ?? '',
      discount_type: body.discount_type ?? '',
      value: body.value ?? -1,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
    })
    return Response.json(promotion, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('no es válido')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('mayor o igual a 0')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('promotions-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear la promoción' }, { status: 500 })
  }
}

export async function handleTogglePromotionRequest(
  orgId: string,
  client: ConfigClient,
  promotionId: number,
) {
  try {
    const promotion = await togglePromotion(client as never, orgId, promotionId)
    return Response.json(promotion, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    console.error('promotions-handler (PATCH):', error)
    return Response.json({ error: 'No se pudo actualizar la promoción' }, { status: 500 })
  }
}
