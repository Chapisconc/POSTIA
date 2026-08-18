import { createBranch, listBranches } from '@/lib/branches/branches'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListBranchesRequest(orgId: string, client: ConfigClient) {
  try {
    const branches = await listBranches(client as never, orgId)
    return Response.json(branches, { status: 200 })
  } catch (error) {
    console.error('branches-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener las sucursales' }, { status: 500 })
  }
}

export async function handleCreateBranchRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { name?: string; address?: string | null; phone?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const branch = await createBranch(client as never, orgId, {
      name: body.name ?? '',
      address: body.address ?? null,
      phone: body.phone ?? null,
    })
    return Response.json(branch, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('branches-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear la sucursal' }, { status: 500 })
  }
}
