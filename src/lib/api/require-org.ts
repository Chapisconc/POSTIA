import { getProfile } from '@/lib/org/org'
import type { ConfigClient } from '@/lib/config/service'

export async function requireOrgId(
  userId: string,
  client: ConfigClient,
): Promise<string> {
  const profile = await getProfile(client, userId)

  if (!profile?.organization_id) {
    throw new Error('El usuario no tiene negocio')
  }

  return profile.organization_id
}
