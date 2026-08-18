import type { QueryResult } from '@/lib/config/service'

export type DiscountType = 'porcentaje' | 'fijo'

export interface Promotion {
  id: number
  organization_id: string
  name: string
  discount_type: DiscountType
  value: number
  active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export interface NewPromotion {
  name: string
  discount_type: string
  value: number
  starts_at?: string | null
  ends_at?: string | null
}

type PromotionsClient = {
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

export type { PromotionsClient }

const DISCOUNT_TYPES: DiscountType[] = ['porcentaje', 'fijo']

function normalizeOptionalDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function listPromotions(
  client: PromotionsClient,
  orgId: string,
): Promise<Promotion[]> {
  const { data, error } = await client
    .from('promotions')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')

  if (error) throw error
  return (data ?? []) as Promotion[]
}

export async function createPromotion(
  client: PromotionsClient,
  orgId: string,
  input: NewPromotion,
): Promise<Promotion | null> {
  if (!input.name?.trim()) throw new Error('El nombre es obligatorio')
  if (!DISCOUNT_TYPES.includes(input.discount_type as DiscountType)) {
    throw new Error('El tipo de descuento no es válido')
  }
  if (typeof input.value !== 'number' || input.value < 0) {
    throw new Error('El descuento debe ser mayor o igual a 0')
  }

  const { data, error } = await client
    .from('promotions')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      discount_type: input.discount_type,
      value: input.value,
      starts_at: normalizeOptionalDate(input.starts_at),
      ends_at: normalizeOptionalDate(input.ends_at),
    })
    .select()

  if (error) throw error
  return ((data as Promotion[] | null)?.[0] ?? null) as Promotion | null
}

export async function togglePromotion(
  client: PromotionsClient,
  orgId: string,
  id: number,
): Promise<Promotion | null> {
  const promotions = await listPromotions(client, orgId)
  const current = promotions.find((promotion) => promotion.id === id)
  if (!current) throw new Error('Promoción no encontrada')

  const { data, error } = await client
    .from('promotions')
    .update({ active: !current.active })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()

  if (error) throw error
  return ((data as Promotion[] | null)?.[0] ?? null) as Promotion | null
}
