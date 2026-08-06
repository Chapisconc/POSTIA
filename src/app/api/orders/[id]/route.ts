import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { handleChargeOrderRequest } from '@/lib/api/orders-handler'
import type { ConfigClient } from '@/lib/config/service'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 403 })
  }

  const { id } = await context.params
  const orderId = Number(id)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: 'ID de pedido inválido' }, { status: 400 })
  }

  return handleChargeOrderRequest(
    orgId,
    client as unknown as ConfigClient,
    orderId,
    request,
  )
}
