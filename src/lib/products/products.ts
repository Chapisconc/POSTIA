import type { QueryResult } from '@/lib/config/service'

export interface Product {
  id: number
  organization_id: string
  category_id: number | null
  name: string
  price: number
  active: boolean
}

export interface NewProduct {
  name: string
  price: number
  category_id?: number | null
}

type ProductsClient = {
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

export type { ProductsClient }

export async function listProducts(client: ProductsClient, orgId: string): Promise<Product[]> {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (error) throw error
  return (data ?? []) as Product[]
}

export async function createProduct(
  client: ProductsClient,
  orgId: string,
  input: NewProduct,
): Promise<Product | null> {
  if (!input.name?.trim()) throw new Error('El nombre del producto es obligatorio')
  if (typeof input.price !== 'number' || input.price < 0) {
    throw new Error('El precio debe ser mayor o igual a 0')
  }

  const { data, error } = await client
    .from('products')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      price: input.price,
      category_id: input.category_id ?? null,
    })
    .select()

  if (error) throw error
  return ((data as Product[] | null)?.[0] ?? null) as Product | null
}
