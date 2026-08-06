import { createInvoice, listInvoices, markInvoiceIssued } from '@/lib/invoices/invoices'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListInvoicesRequest(orgId: string, client: ConfigClient) {
  try {
    const invoices = await listInvoices(client as never, orgId)
    return Response.json(invoices, { status: 200 })
  } catch (error) {
    console.error('invoices-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener las facturas' }, { status: 500 })
  }
}

export async function handleCreateInvoiceRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { order_id?: number; rfc?: string; customer_name?: string | null }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const invoice = await createInvoice(client as never, orgId, {
      order_id: body.order_id ?? 0,
      rfc: body.rfc ?? '',
      customer_name: body.customer_name ?? null,
    })
    return Response.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('RFC no es válido')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('no está cobrado')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('invoices-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear la factura' }, { status: 500 })
  }
}

export async function handleMarkInvoiceIssuedRequest(
  orgId: string,
  client: ConfigClient,
  invoiceId: number,
) {
  try {
    const invoice = await markInvoiceIssued(client as never, orgId, invoiceId)
    return Response.json(invoice, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    console.error('invoices-handler (PATCH issued):', error)
    return Response.json({ error: 'No se pudo emitir la factura' }, { status: 500 })
  }
}
