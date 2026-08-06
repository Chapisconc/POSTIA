import { getInitialStatusId, getOrderStatuses, type OrderStatus, type OrgSettings } from '@/lib/config/service'

export interface OrderItem {
  product_id: number
  name: string
  qty: number
  unit_price: number
  notes?: string
}

export interface Order {
  id: number
  organization_id: string
  order_type_id: number | null
  status_id: number | null
  payment_method_id: number | null
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateOrderInput {
  order_type_id: number
  items: OrderItem[]
  notes?: string
}

export type QueryResult = { data: unknown; error: unknown }

export type OrdersClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: () => Promise<QueryResult>
    }
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string) => Promise<QueryResult>
      }
    }
    update: (row: Record<string, unknown>) => {
      eq: (column: string, value: string | number) => {
        select: () => Promise<QueryResult>
      }
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateTotals(
  items: OrderItem[],
  settings: OrgSettings,
): { subtotal: number; tax: number; total: number } {
  const subtotal = round2(items.reduce((sum, item) => sum + item.unit_price * item.qty, 0))
  const tax = settings.impuestos.activo
    ? round2(subtotal * (settings.impuestos.porcentaje / 100))
    : 0
  return { subtotal, tax, total: round2(subtotal + tax) }
}

export async function createOrder(
  client: OrdersClient,
  orgId: string,
  input: CreateOrderInput,
  settings: OrgSettings,
): Promise<Order> {
  if (input.items.length === 0) {
    throw new Error('El pedido debe incluir al menos un producto')
  }

  const statusId = await getInitialStatusId(orgId, client as never)
  if (statusId === null) {
    throw new Error('No hay estados de pedido configurados para este negocio')
  }

  const { subtotal, tax, total } = calculateTotals(input.items, settings)

  const { data, error } = await client
    .from('orders')
    .insert({
      organization_id: orgId,
      order_type_id: input.order_type_id,
      status_id: statusId,
      items: input.items,
      subtotal,
      tax,
      total,
      notes: input.notes ?? null,
    })
    .select()

  if (error) throw error
  return ((data as Order[] | null)?.[0] ?? null) as Order
}

export async function getNextOrderStatus(
  client: OrdersClient,
  orgId: string,
  currentStatusId: number,
): Promise<OrderStatus | null> {
  const statuses = await getOrderStatuses(orgId, client as never)
  const currentIndex = statuses.findIndex((s) => s.id === currentStatusId)
  if (currentIndex === -1) return null
  return statuses[currentIndex + 1] ?? null
}

export async function updateOrderStatus(
  client: OrdersClient,
  orgId: string,
  orderId: number,
  statusId: number,
): Promise<Order> {
  const { data, error } = await client
    .from('orders')
    .update({ status_id: statusId })
    .eq('id', orderId)
    .select()

  if (error) throw error
  return ((data as Order[] | null)?.[0] ?? null) as Order
}

export async function listOrders(client: OrdersClient, orgId: string): Promise<Order[]> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as Order[]
}

export async function chargeOrder(
  client: OrdersClient,
  orgId: string,
  orderId: number,
  paymentMethodId: number,
): Promise<Order> {
  const statuses = await getOrderStatuses(orgId, client as never)
  const payable = statuses.find((s) => s.permite_cobro)
  if (!payable) throw new Error('No hay un estado que permita el cobro')

  const { data, error } = await client
    .from('orders')
    .update({ status_id: payable.id, payment_method_id: paymentMethodId })
    .eq('id', orderId)
    .select()

  if (error) throw error
  return ((data as Order[] | null)?.[0] ?? null) as Order
}
