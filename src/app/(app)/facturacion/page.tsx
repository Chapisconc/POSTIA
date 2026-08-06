import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listOrders } from '@/lib/orders/orders'
import type { OrdersClient } from '@/lib/orders/orders'
import { listInvoices } from '@/lib/invoices/invoices'
import type { InvoicesClient } from '@/lib/invoices/invoices'
import { getOrderStatuses } from '@/lib/config/service'
import type { ConfigClient } from '@/lib/config/service'
import { InvoiceView } from './invoice-view'

export default async function FacturacionPage() {
  const client = await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  const orders = await listOrders(client as unknown as OrdersClient, orgId)
  const statuses = await getOrderStatuses(orgId, client as unknown as ConfigClient)
  const invoices = await listInvoices(client as unknown as InvoicesClient, orgId)

  const invoiceOrderIds = new Set(invoices.map((invoice) => invoice.order_id))
  const payableOrders = orders.filter(
    (order) =>
      statuses.some((status) => status.id === order.status_id && status.permite_cobro) &&
      !invoiceOrderIds.has(order.id),
  )

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Facturación</h1>

      <InvoiceView orders={payableOrders} invoices={invoices} />
    </div>
  )
}
