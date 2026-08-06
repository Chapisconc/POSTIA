import { createClient } from '@/lib/supabase/server'
import { handleOnboardingRequest } from '@/lib/api/onboarding-handler'
import type { RpcClient } from '@/lib/onboarding/onboarding'

export async function POST(request: Request) {
  const client = (await createClient()) as unknown as RpcClient
  return handleOnboardingRequest(request, client)
}
