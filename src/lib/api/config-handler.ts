import { resolveConfig } from '@/lib/config/service'
import type { ConfigClient } from '@/lib/config/service'

export async function handleConfigRequest(orgId: string, client: ConfigClient) {
  if (!orgId) {
    return Response.json({ error: 'Falta el parámetro orgId' }, { status: 400 })
  }

  try {
    const config = await resolveConfig(orgId, client)
    return Response.json(config, { status: 200 })
  } catch (error) {
    console.error('config-handler:', error)
    return Response.json({ error: 'No se pudo obtener la configuración' }, { status: 500 })
  }
}
