import {
  createReservation,
  listReservations,
  updateReservationStatus,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from '@/lib/reservations/reservations'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListReservationsRequest(orgId: string, client: ConfigClient) {
  try {
    const reservations = await listReservations(client as never, orgId)
    return Response.json(reservations, { status: 200 })
  } catch (error) {
    console.error('reservations-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener las reservaciones' }, { status: 500 })
  }
}

export async function handleCreateReservationRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: {
    name?: string
    phone?: string | null
    guests?: number | null
    reserved_at?: string
    reserved_time?: string
    notes?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const guests = body.guests ?? 1
  if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1) {
    return Response.json({ error: 'Los comensales deben ser al menos 1' }, { status: 400 })
  }

  if (!body.reserved_at || !body.reserved_time) {
    return Response.json({ error: 'La fecha y hora son obligatorias' }, { status: 400 })
  }

  try {
    const reservation = await createReservation(client as never, orgId, {
      name: body.name,
      phone: body.phone ?? null,
      guests,
      reserved_at: body.reserved_at,
      reserved_time: body.reserved_time,
      notes: body.notes ?? null,
    })
    return Response.json(reservation, { status: 201 })
  } catch (error) {
    console.error('reservations-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear la reservación' }, { status: 500 })
  }
}

export async function handleUpdateReservationStatusRequest(
  orgId: string,
  client: ConfigClient,
  reservationId: number,
  request: Request,
) {
  let body: { status?: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (
    typeof body.status !== 'string' ||
    !RESERVATION_STATUSES.includes(body.status as ReservationStatus)
  ) {
    return Response.json({ error: 'Estado de reservación inválido' }, { status: 400 })
  }

  try {
    const reservation = await updateReservationStatus(
      client as never,
      orgId,
      reservationId,
      body.status as ReservationStatus,
    )
    return Response.json(reservation, { status: 200 })
  } catch (error) {
    console.error('reservations-handler (PATCH status):', error)
    return Response.json({ error: 'No se pudo actualizar el estado' }, { status: 500 })
  }
}
