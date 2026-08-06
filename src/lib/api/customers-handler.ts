import { createCustomer, listCustomers } from '@/lib/customers/customers'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListCustomersRequest(orgId: string, client: ConfigClient) {
  try {
    const customers = await listCustomers(client as never, orgId)
    return Response.json(customers, { status: 200 })
  } catch (error) {
    console.error('customers-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los clientes' }, { status: 500 })
  }
}

export async function handleCreateCustomerRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { name?: string; email?: string | null; phone?: string | null; notes?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const customer = await createCustomer(client as never, orgId, {
      name: body.name ?? '',
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    })
    return Response.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('correo no es válido')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('customers-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear el cliente' }, { status: 500 })
  }
}
