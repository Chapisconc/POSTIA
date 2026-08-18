import type { QueryResult } from '@/lib/config/service'
import { listCustomers } from '@/lib/customers/customers'

export interface LoyaltyEntry {
  id: number
  organization_id: string
  customer_id: number
  points: number
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface LoyaltySummary {
  customer_id: number
  customer_name: string
  points: number
}

export interface AddPointsInput {
  customer_id: number
  points: number
  reason?: string | null
}

type LoyaltyClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string) => Promise<QueryResult>
      }
    }
    insert: (row: Record<string, unknown>) => {
      select: () => Promise<QueryResult>
    }
  }
}

export type { LoyaltyClient }

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function addPoints(
  client: LoyaltyClient,
  orgId: string,
  input: AddPointsInput,
): Promise<LoyaltyEntry | null> {
  if (!input.customer_id) throw new Error('El cliente es obligatorio')
  if (!input.points) throw new Error('Los puntos no pueden ser 0')

  const { data, error } = await client
    .from('loyalty_entries')
    .insert({
      organization_id: orgId,
      customer_id: input.customer_id,
      points: input.points,
      reason: normalizeOptional(input.reason),
    })
    .select()

  if (error) throw error
  return ((data as LoyaltyEntry[] | null)?.[0] ?? null) as LoyaltyEntry | null
}

export async function getLoyaltySummary(
  client: LoyaltyClient,
  orgId: string,
): Promise<LoyaltySummary[]> {
  const [customers, result] = await Promise.all([
    listCustomers(client as never, orgId),
    client.from('loyalty_entries').select('*').eq('organization_id', orgId).order('created_at'),
  ])

  if (result.error) throw result.error
  const entries = (result.data ?? []) as LoyaltyEntry[]

  const totals = new Map<number, number>()
  for (const entry of entries) {
    totals.set(entry.customer_id, (totals.get(entry.customer_id) ?? 0) + entry.points)
  }

  const nameById = new Map(customers.map((customer) => [customer.id, customer.name]))

  const summaries: LoyaltySummary[] = customers.map((customer) => ({
    customer_id: customer.id,
    customer_name: nameById.get(customer.id) ?? customer.name,
    points: totals.get(customer.id) ?? 0,
  }))

  summaries.sort((a, b) => b.points - a.points || a.customer_name.localeCompare(b.customer_name))
  return summaries
}
