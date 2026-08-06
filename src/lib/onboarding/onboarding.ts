export type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown
    error: unknown
  }>
}

export async function createOrganization(
  client: RpcClient,
  name: string,
  slug: string,
  ownerDisplayName?: string,
): Promise<string> {
  if (!name?.trim()) throw new Error('El nombre del negocio es obligatorio')
  if (!slug?.trim()) throw new Error('El slug es obligatorio')

  const { data, error } = await client.rpc('create_organization', {
    org_name: name.trim(),
    org_slug: slug.trim(),
    owner_display_name: ownerDisplayName?.trim() || null,
  })

  if (error) throw error
  return data as string
}
