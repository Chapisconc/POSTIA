import type { QueryResult } from '@/lib/config/service'

export const DELIVERY_STATUSES = ['asignado', 'en_camino', 'entregado'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export interface Delivery {
  id: number
  organization_id: string
  order_id: number
  courier: string | null
  status: DeliveryStatus
  note: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export interface NewDelivery {
  order_id: number
  courier?: string | null
  note?: string | null
}

type DeliveriesClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string) => Promise<QueryResult>
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

export type { DeliveriesClient }

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function listDeliveries(
  client: DeliveriesClient,
  orgId: string,
): Promise<Delivery[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as Delivery[]
}

export async function createDelivery(
  client: DeliveriesClient,
  orgId: string,
  input: NewDelivery,
): Promise<Delivery | null> {
  if (typeof input.order_id !== 'number' || !Number.isInteger(input.order_id) || input.order_id <= 0) {
    throw new Error('El pedido es obligatorio')
  }

  const { data, error } = await client
    .from('deliveries')
    .insert({
      organization_id: orgId,
      order_id: input.order_id,
      courier: normalizeOptional(input.courier),
      note: normalizeOptional(input.note),
    })
    .select()

  if (error) throw error
  return ((data as Delivery[] | null)?.[0] ?? null) as Delivery | null
}

export async function updateDeliveryStatus(
  client: DeliveriesClient,
  orgId: string,
  id: number,
  status: DeliveryStatus,
): Promise<Delivery | null> {
  if (!DELIVERY_STATUSES.includes(status)) {
    throw new Error('Estado de entrega inválido')
  }

  const update: Record<string, unknown> = { status }
  if (status === 'entregado') update.delivered_at = new Date().toISOString()

  const { data, error } = await client
    .from('deliveries')
    .update(update)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()

  if (error) throw error
  return ((data as Delivery[] | null)?.[0] ?? null) as Delivery | null
}
