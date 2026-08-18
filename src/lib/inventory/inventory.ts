import type { QueryResult } from '@/lib/config/service'

export interface ProductStock {
  id: number
  organization_id: string
  category_id: number | null
  name: string
  price: number
  active: boolean
  stock: number
}

export type MovementType = 'entrada' | 'salida'

export interface InventoryMovement {
  id: number
  organization_id: string
  product_id: number
  qty: number
  type: MovementType
  note: string | null
  created_by: string | null
  created_at: string
}

type SelectEq2 = {
  single: () => Promise<QueryResult>
  order: (column: string) => Promise<QueryResult>
}

type SelectEq = {
  eq: (column: string, value: string | number) => SelectEq2
  order: (column: string) => Promise<QueryResult>
}

type UpdateEq = {
  eq: (column: string, value: string) => {
    select: () => Promise<QueryResult>
  }
}

type InventoryClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string | number) => SelectEq
    }
    insert: (row: Record<string, unknown>) => {
      select: () => Promise<QueryResult>
    }
    update: (row: Record<string, unknown>) => {
      eq: (column: string, value: string | number) => UpdateEq
    }
  }
}

export type { InventoryClient }

export async function listInventory(client: InventoryClient, orgId: string): Promise<ProductStock[]> {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (error) throw error
  return (data ?? []) as ProductStock[]
}

async function getProductStock(
  client: InventoryClient,
  orgId: string,
  productId: number,
): Promise<number> {
  const { data, error } = await client
    .from('products')
    .select('stock')
    .eq('id', productId)
    .eq('organization_id', orgId)
    .single()

  if (error) throw error
  return (data as { stock?: number } | null)?.stock ?? 0
}

export async function addMovement(
  client: InventoryClient,
  orgId: string,
  productId: number,
  type: MovementType,
  qty: number,
  note: string | null | undefined,
  userId: string | null | undefined,
): Promise<InventoryMovement | null> {
  if (typeof qty !== 'number' || qty <= 0) {
    throw new Error('La cantidad debe ser mayor a 0')
  }
  if (type !== 'entrada' && type !== 'salida') {
    throw new Error('Tipo de movimiento inválido')
  }

  const current = await getProductStock(client, orgId, productId)
  if (type === 'salida' && current < qty) {
    throw new Error('Stock insuficiente')
  }
  const newStock = type === 'entrada' ? current + qty : current - qty

  const { data, error } = await client
    .from('inventory_movements')
    .insert({
      organization_id: orgId,
      product_id: productId,
      qty,
      type,
      note: note?.trim() ? note.trim() : null,
      created_by: userId ?? null,
    })
    .select()

  if (error) throw error

  const { error: updateError } = await client
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId)
    .eq('organization_id', orgId)
    .select()

  if (updateError) throw updateError

  return ((data as InventoryMovement[] | null)?.[0] ?? null) as InventoryMovement | null
}

export async function listMovements(
  client: InventoryClient,
  orgId: string,
  productId?: number,
): Promise<InventoryMovement[]> {
  const base = client.from('inventory_movements').select('*').eq('organization_id', orgId)
  const result =
    productId === undefined
      ? await base.order('created_at')
      : await base.eq('product_id', productId).order('created_at')

  if (result.error) throw result.error
  return (result.data ?? []) as InventoryMovement[]
}
