import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { handleConfigRequest } from '@/lib/api/config-handler'
import type { ConfigClient } from '@/lib/config/service'

export async function GET(request: NextRequest) {
  const client = await createClient()
  const orgId = request.nextUrl.searchParams.get('orgId')

  if (orgId) {
    return handleConfigRequest(orgId, client as unknown as ConfigClient)
  }

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const derived = await requireOrgId(user.id, client as unknown as ConfigClient)
    return handleConfigRequest(derived, client as unknown as ConfigClient)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 403 })
  }
}
