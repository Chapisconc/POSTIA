import type { QueryResult } from '@/lib/config/service'

export const RESERVATION_STATUSES = ['confirmada', 'cancelada', 'completada'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export interface Reservation {
  id: number
  organization_id: string
  customer_id: number | null
  name: string
  phone: string | null
  guests: number
  reserved_at: string
  reserved_time: string
  status: ReservationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NewReservation {
  name: string
  phone?: string | null
  guests?: number | null
  reserved_at: string
  reserved_time: string
  notes?: string | null
}

type ReservationsClient = {
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

export type { ReservationsClient }

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

export async function listReservations(
  client: ReservationsClient,
  orgId: string,
): Promise<Reservation[]> {
  const { data, error } = await client
    .from('reservations')
    .select('*')
    .eq('organization_id', orgId)
    .order('reserved_at')

  if (error) throw error
  return (data ?? []) as Reservation[]
}

export async function createReservation(
  client: ReservationsClient,
  orgId: string,
  input: NewReservation,
): Promise<Reservation | null> {
  if (!input.name?.trim()) throw new Error('El nombre es obligatorio')

  const guests = input.guests ?? 1
  if (!Number.isInteger(guests) || guests < 1) {
    throw new Error('Los comensales deben ser al menos 1')
  }

  if (!input.reserved_at || !input.reserved_time) {
    throw new Error('La fecha y hora son obligatorias')
  }

  const { data, error } = await client
    .from('reservations')
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      phone: normalizeOptional(input.phone),
      guests,
      reserved_at: input.reserved_at,
      reserved_time: input.reserved_time,
      notes: normalizeOptional(input.notes),
    })
    .select()

  if (error) throw error
  return ((data as Reservation[] | null)?.[0] ?? null) as Reservation | null
}

export async function updateReservationStatus(
  client: ReservationsClient,
  orgId: string,
  id: number,
  status: ReservationStatus,
): Promise<Reservation | null> {
  if (!RESERVATION_STATUSES.includes(status)) {
    throw new Error('Estado de reservación inválido')
  }

  const { data, error } = await client
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()

  if (error) throw error
  return ((data as Reservation[] | null)?.[0] ?? null) as Reservation | null
}
