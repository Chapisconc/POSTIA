import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { handleMarkInvoiceIssuedRequest } from '@/lib/api/invoices-handler'
import type { ConfigClient } from '@/lib/config/service'

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 403 })
  }

  const { id } = await context.params
  const invoiceId = Number(id)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return Response.json({ error: 'ID de factura inválido' }, { status: 400 })
  }

  return handleMarkInvoiceIssuedRequest(
    orgId,
    client as unknown as ConfigClient,
    invoiceId,
  )
}
