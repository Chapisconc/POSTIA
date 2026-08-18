import { addPoints, getLoyaltySummary } from '@/lib/loyalty/loyalty'
import type { ConfigClient } from '@/lib/config/service'

export async function handleGetLoyaltySummaryRequest(orgId: string, client: ConfigClient) {
  try {
    const summaries = await getLoyaltySummary(client as never, orgId)
    return Response.json(summaries, { status: 200 })
  } catch (error) {
    console.error('loyalty-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los puntos' }, { status: 500 })
  }
}

export async function handleAddPointsRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { customer_id?: number; points?: number; reason?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const entry = await addPoints(client as never, orgId, {
      customer_id: body.customer_id ?? 0,
      points: body.points ?? 0,
      reason: body.reason ?? null,
    })
    return Response.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('no pueden ser 0')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('loyalty-handler (POST):', error)
    return Response.json({ error: 'No se pudieron agregar los puntos' }, { status: 500 })
  }
}
