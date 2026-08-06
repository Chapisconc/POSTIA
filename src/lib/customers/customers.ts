import type { QueryResult } from '@/lib/config/service'

export interface Customer {
  id: number
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NewCustomer {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

type CustomersClient = {
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

export type { CustomersClient }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function listCustomers(
  client: CustomersClient,
  orgId: string,
): Promise<Customer[]> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (error) throw error
  return (data ?? []) as Customer[]
}

export async function createCustomer(
  client: CustomersClient,
  orgId: string,
  input: NewCustomer,
): Promise<Customer | null> {
  if (!input.name?.trim()) throw new Error('El nombre del cliente es obligatorio')

  const email = normalizeOptional(input.email)
  if (email && !EMAIL_RE.test(email)) throw new Error('El correo no es válido')

  const { data, error } = await client
    .from('customers')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      email,
      phone: normalizeOptional(input.phone),
      notes: normalizeOptional(input.notes),
    })
    .select()

  if (error) throw error
  return ((data as Customer[] | null)?.[0] ?? null) as Customer | null
}
