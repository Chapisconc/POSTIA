import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { handleSalesReportRequest } from '@/lib/api/reports-handler'
import type { ConfigClient } from '@/lib/config/service'

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

  return handleSalesReportRequest(orgId, client as unknown as ConfigClient)
}
