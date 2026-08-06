import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import {
  handleCreateCustomerRequest,
  handleListCustomersRequest,
} from '@/lib/api/customers-handler'
import type { ConfigClient } from '@/lib/config/service'

async function authClient() {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return { response: Response.json({ error: 'No autenticado' }, { status: 401 }), client: null }
  }

  try {
    const orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
    return { response: null, client: { supabase: client, orgId } }
  } catch (error) {
    return {
      response: Response.json({ error: (error as Error).message }, { status: 403 }),
      client: null,
    }
  }
}

export async function GET() {
  const { response, client } = await authClient()
  if (response) return response
  return handleListCustomersRequest(client!.orgId, client!.supabase as unknown as ConfigClient)
}

export async function POST(request: NextRequest) {
  const { response, client } = await authClient()
  if (response) return response
  return handleCreateCustomerRequest(
    client!.orgId,
    client!.supabase as unknown as ConfigClient,
    request,
  )
}
