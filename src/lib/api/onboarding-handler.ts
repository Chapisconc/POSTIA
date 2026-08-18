import { createOrganization } from '@/lib/onboarding/onboarding'
import type { RpcClient } from '@/lib/onboarding/onboarding'

export async function handleOnboardingRequest(request: Request, client: RpcClient) {
  let body: { nombre?: string; slug?: string; ownerName?: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { nombre, slug, ownerName } = body ?? {}

  if (!nombre?.trim()) {
    return Response.json({ error: 'El nombre del negocio es obligatorio' }, { status: 400 })
  }
  if (!slug?.trim()) {
    return Response.json({ error: 'El slug es obligatorio' }, { status: 400 })
  }

  try {
    const orgId = await createOrganization(client, nombre, slug, ownerName)
    return Response.json({ orgId }, { status: 201 })
  } catch (error) {
    console.error('onboarding-handler:', error)
    return Response.json({ error: 'No se pudo crear el negocio' }, { status: 500 })
  }
}
