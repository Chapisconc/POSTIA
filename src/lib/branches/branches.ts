import type { QueryResult } from '@/lib/config/service'

export interface Branch {
  id: number
  organization_id: string
  name: string
  address: string | null
  phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface NewBranch {
  name: string
  address?: string | null
  phone?: string | null
}

type BranchesClient = {
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

export type { BranchesClient }

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function listBranches(client: BranchesClient, orgId: string): Promise<Branch[]> {
  const { data, error } = await client
    .from('branches')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (error) throw error
  return (data ?? []) as Branch[]
}

export async function createBranch(
  client: BranchesClient,
  orgId: string,
  input: NewBranch,
): Promise<Branch | null> {
  if (!input.name?.trim()) throw new Error('El nombre de la sucursal es obligatorio')

  const { data, error } = await client
    .from('branches')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      address: normalizeOptional(input.address),
      phone: normalizeOptional(input.phone),
    })
    .select()

  if (error) throw error
  return ((data as Branch[] | null)?.[0] ?? null) as Branch | null
}
