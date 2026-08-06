import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleConfigRequest } from '@/lib/api/config-handler'
import type { ConfigClient } from '@/lib/config/service'

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId') ?? ''
  const client = (await createClient()) as unknown as ConfigClient
  return handleConfigRequest(orgId, client)
}
