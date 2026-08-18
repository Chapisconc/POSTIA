import type { ConfigClient, SelectChain } from '@/lib/config/service'

export interface UserProfile {
  id: string
  organization_id: string | null
  role: string | null
  display_name: string | null
}

export async function getProfile(client: ConfigClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, organization_id, role, display_name')
    .eq('id', userId)
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') return null
    throw error
  }

  return data as UserProfile
}

export async function getOrganization(
  client: ConfigClient,
  orgId: string,
): Promise<{ id: string; name: string } | null> {
  const chain = client
    .from('organizations')
    .select('id, name')
    .eq('id', orgId) as unknown as SelectChain

  const { data, error } = await chain.single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') return null
    throw error
  }

  return data as { id: string; name: string }
}
