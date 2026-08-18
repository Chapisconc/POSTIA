import { listOrders } from '@/lib/orders/orders'
import { getOrderStatuses, getPaymentMethods } from '@/lib/config/service'
import type { OrdersClient } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'

export interface PaymentMethodTotals {
  payment_method_id: number
  label: string
  count: number
  total: number
}

export interface SalesReport {
  count: number
  subtotal: number
  tax: number
  total: number
  byPaymentMethod: PaymentMethodTotals[]
}

export async function getSalesReport(
  client: OrdersClient,
  orgId: string,
): Promise<SalesReport> {
  const [orders, statuses, methods] = await Promise.all([
    listOrders(client, orgId),
    getOrderStatuses(orgId, client as unknown as ConfigClient),
    getPaymentMethods(orgId, client as unknown as ConfigClient),
  ])

  const payableStatusIds = new Set(
    statuses.filter((s) => s.permite_cobro).map((s) => s.id),
  )
  const methodLabelById = new Map(methods.map((m) => [m.id, m.label]))

  const sales = orders.filter((o) => payableStatusIds.has(o.status_id ?? -1))

  const totals = new Map<number, PaymentMethodTotals>()
  let subtotal = 0
  let tax = 0
  let total = 0

  for (const order of sales) {
    subtotal += order.subtotal
    tax += order.tax
    total += order.total

    if (order.payment_method_id !== null) {
      const bucket = totals.get(order.payment_method_id) ?? {
        payment_method_id: order.payment_method_id,
        label: methodLabelById.get(order.payment_method_id) ?? '—',
        count: 0,
        total: 0,
      }
      bucket.count += 1
      bucket.total += order.total
      totals.set(order.payment_method_id, bucket)
    }
  }

  const round2 = (value: number) => Math.round(value * 100) / 100
  const byPaymentMethod = Array.from(totals.values()).map((bucket) => ({
    ...bucket,
    total: round2(bucket.total),
  }))

  return {
    count: sales.length,
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(total),
    byPaymentMethod,
  }
}
