import { closeRegister, listRegisters, openRegister } from '@/lib/caja/caja'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListCajaRequest(orgId: string, client: ConfigClient) {
  try {
    const registers = await listRegisters(client as never, orgId)
    return Response.json(registers, { status: 200 })
  } catch (error) {
    console.error('caja-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los registros de caja' }, { status: 500 })
  }
}

export async function handleOpenCajaRequest(
  orgId: string,
  client: ConfigClient,
  userId: string,
  request: Request,
) {
  let body: { opening_amount?: number }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const register = await openRegister(client as never, orgId, body.opening_amount ?? 0, userId)
    return Response.json(register, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Ya hay una caja abierta')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('no puede ser negativo')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('caja-handler (POST):', error)
    return Response.json({ error: 'No se pudo abrir la caja' }, { status: 500 })
  }
}

export async function handleCloseCajaRequest(
  orgId: string,
  client: ConfigClient,
  userId: string,
  request: Request,
) {
  let body: { closing_amount?: number }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const register = await closeRegister(client as never, orgId, body.closing_amount ?? 0, userId)
    return Response.json(register, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('No hay caja abierta')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('no puede ser negativo')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('caja-handler (PATCH):', error)
    return Response.json({ error: 'No se pudo cerrar la caja' }, { status: 500 })
  }
}
