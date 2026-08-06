import type { QueryResult } from '@/lib/config/service'
import { getOrderStatuses } from '@/lib/config/service'
import { listOrders } from '@/lib/orders/orders'

export interface Invoice {
  id: number
  organization_id: string
  order_id: number
  rfc: string
  customer_name: string | null
  cfdi_status: 'pendiente' | 'emitida'
  issued_at: string | null
  created_at: string
  updated_at: string
}

export interface NewInvoice {
  order_id: number
  rfc: string
  customer_name?: string | null
}

type InvoicesClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: { ascending?: boolean }) => Promise<QueryResult>
      }
    }
    insert: (row: Record<string, unknown>) => {
      select: () => Promise<QueryResult>
    }
    update: (row: Record<string, unknown>) => {
      eq: (column: string, value: string | number) => {
        eq: (column: string, value: string) => {
          select: () => Promise<QueryResult>
        }
      }
    }
  }
}

export type { InvoicesClient }

const RFC_RE = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/

export async function listInvoices(client: InvoicesClient, orgId: string): Promise<Invoice[]> {
  const { data, error } = await client
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Invoice[]
}

export async function createInvoice(
  client: InvoicesClient,
  orgId: string,
  input: NewInvoice,
): Promise<Invoice | null> {
  const rfc = input.rfc?.trim() ?? ''
  if (!RFC_RE.test(rfc)) throw new Error('El RFC no es válido')
  if (!input.order_id) throw new Error('El pedido es obligatorio')

  const orders = await listOrders(client as never, orgId)
  const order = orders.find((o) => o.id === input.order_id)
  const statuses = await getOrderStatuses(orgId, client as never)
  const status = statuses.find((s) => s.id === order?.status_id)
  if (!order || !status?.permite_cobro) {
    throw new Error('El pedido no está cobrado')
  }

  const customerName = input.customer_name?.trim() ?? ''
  const { data, error } = await client
    .from('invoices')
    .insert({
      organization_id: orgId,
      order_id: input.order_id,
      rfc,
      customer_name: customerName === '' ? null : customerName,
      cfdi_status: 'pendiente',
    })
    .select()

  if (error) throw error
  return ((data as Invoice[] | null)?.[0] ?? null) as Invoice | null
}

export async function markInvoiceIssued(
  client: InvoicesClient,
  orgId: string,
  id: number,
): Promise<Invoice | null> {
  const { data, error } = await client
    .from('invoices')
    .update({ cfdi_status: 'emitida', issued_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()

  if (error) throw error
  const invoice = ((data as Invoice[] | null)?.[0] ?? null) as Invoice | null
  if (!invoice) throw new Error('Factura no encontrada')
  return invoice
}
