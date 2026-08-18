import type { QueryResult } from '@/lib/config/service'

export interface CashRegister {
  id: number
  organization_id: string
  opening_amount: number
  closing_amount: number | null
  opened_at: string
  closed_at: string | null
  status: 'abierta' | 'cerrada'
  opened_by: string | null
  closed_by: string | null
}

export type CajaClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          is: (column: string, value: null) => {
            maybeSingle: () => Promise<QueryResult>
          }
        }
        order: (column: string) => Promise<QueryResult>
        maybeSingle: () => Promise<QueryResult>
      }
    }
    insert: (row: Record<string, unknown>) => {
      select: () => Promise<QueryResult>
    }
    update: (row: Record<string, unknown>) => {
      eq: (column: string, value: number) => {
        select: () => Promise<QueryResult>
      }
    }
  }
}

export async function listRegisters(
  client: CajaClient,
  orgId: string,
): Promise<CashRegister[]> {
  const { data, error } = await client
    .from('cash_registers')
    .select('*')
    .eq('organization_id', orgId)
    .order('opened_at')

  if (error) throw error
  return (data ?? []) as CashRegister[]
}

export async function getActiveRegister(
  client: CajaClient,
  orgId: string,
): Promise<CashRegister | null> {
  const { data, error } = await client
    .from('cash_registers')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'abierta')
    .is('closed_at', null)
    .maybeSingle()

  if (error) throw error
  return (data as CashRegister | null) ?? null
}

export async function openRegister(
  client: CajaClient,
  orgId: string,
  openingAmount: number,
  userId: string,
): Promise<CashRegister> {
  if (openingAmount < 0) throw new Error('El monto inicial no puede ser negativo')

  const active = await getActiveRegister(client, orgId)
  if (active) throw new Error('Ya hay una caja abierta')

  const { data, error } = await client
    .from('cash_registers')
    .insert({
      organization_id: orgId,
      opening_amount: openingAmount,
      status: 'abierta',
      opened_by: userId,
    })
    .select()

  if (error) throw error
  return ((data as CashRegister[] | null)?.[0] ?? null) as CashRegister
}

export async function closeRegister(
  client: CajaClient,
  orgId: string,
  closingAmount: number,
  userId: string,
): Promise<CashRegister> {
  if (closingAmount < 0) throw new Error('El monto de cierre no puede ser negativo')

  const active = await getActiveRegister(client, orgId)
  if (!active) throw new Error('No hay caja abierta para cerrar')

  const { data, error } = await client
    .from('cash_registers')
    .update({
      status: 'cerrada',
      closing_amount: closingAmount,
      closed_at: new Date().toISOString(),
      closed_by: userId,
    })
    .eq('id', active.id)
    .select()

  if (error) throw error
  return ((data as CashRegister[] | null)?.[0] ?? null) as CashRegister
}
