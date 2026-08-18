import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { handleListKitchenRequest } from '@/lib/api/kitchen-handler'
import type { ConfigClient } from '@/lib/config/service'
import type { OrdersClient } from '@/lib/orders/orders'

export async function GET() {
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

  return handleListKitchenRequest(orgId, client as unknown as OrdersClient)
}
