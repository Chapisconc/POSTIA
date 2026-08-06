import { describe, expect, it, vi } from 'vitest'
import {
  createReservation,
  listReservations,
  updateReservationStatus,
} from './reservations'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
  update?: () => { data?: Row[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(handlers.update?.() ?? { data: [], error: null }),
      }),
    }),
  })
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(handlers.insert?.() ?? { data: [], error: null }),
  })
  return {
    from: (table: string) => {
      if (table !== 'reservations') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ...(listResult ?? { data: [], error: null }),
            order: vi.fn().mockResolvedValue(listResult ?? { data: [], error: null }),
          }),
        }),
        insert: insertMock,
        update: updateMock,
      }
    },
  }
}

describe('servicio de reservaciones', () => {
  it('listReservations devuelve las reservaciones de la organización', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Ana', status: 'confirmada', guests: 2 },
      { id: 2, name: 'Bruno', status: 'cancelada', guests: 4 },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const reservations = await listReservations(client as never, 'org-1')
    expect(reservations).toHaveLength(2)
    expect(reservations[0].name).toBe('Ana')
  })

  it('listReservations lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listReservations(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createReservation inserta una reservación y devuelve la fila creada', async () => {
    const created: Row = {
      id: 3,
      name: 'María López',
      phone: '3312345678',
      guests: 4,
      reserved_at: '2026-08-10',
      reserved_time: '20:30:00',
      status: 'confirmada',
      organization_id: 'org-1',
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const reservation = await createReservation(client as never, 'org-1', {
      name: 'María López',
      phone: '3312345678',
      guests: 4,
      reserved_at: '2026-08-10',
      reserved_time: '20:30',
    })

    expect(reservation?.name).toBe('María López')
    expect(reservation?.guests).toBe(4)
    expect(reservation?.reserved_time).toBe('20:30:00')
  })

  it('createReservation usa 1 comensal por defecto', async () => {
    const created: Row = {
      id: 4,
      name: 'Ana',
      guests: 1,
      reserved_at: '2026-08-10',
      reserved_time: '20:30:00',
      organization_id: 'org-1',
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const reservation = await createReservation(client as never, 'org-1', {
      name: 'Ana',
      reserved_at: '2026-08-10',
      reserved_time: '20:30',
    })

    expect(reservation?.guests).toBe(1)
  })

  it('createReservation valida que el nombre sea obligatorio', async () => {
    const client = clientWith({})

    await expect(
      createReservation(client as never, 'org-1', {
        name: '  ',
        reserved_at: '2026-08-10',
        reserved_time: '20:30',
      }),
    ).rejects.toThrow('El nombre es obligatorio')
  })

  it('createReservation valida que los comensales sean al menos 1', async () => {
    const client = clientWith({})

    await expect(
      createReservation(client as never, 'org-1', {
        name: 'Ana',
        guests: 0,
        reserved_at: '2026-08-10',
        reserved_time: '20:30',
      }),
    ).rejects.toThrow('Los comensales deben ser al menos 1')
  })

  it('createReservation valida que la fecha y hora sean obligatorias', async () => {
    const client = clientWith({})

    await expect(
      createReservation(client as never, 'org-1', { name: 'Ana' } as never),
    ).rejects.toThrow('La fecha y hora son obligatorias')
  })

  it('createReservation lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createReservation(client as never, 'org-1', {
        name: 'Ana',
        reserved_at: '2026-08-10',
        reserved_time: '20:30',
      }),
    ).rejects.toThrow('viola RLS')
  })

  it('updateReservationStatus actualiza el estado de la reservación', async () => {
    const updated: Row = { id: 3, name: 'Ana', status: 'cancelada' }
    const client = clientWith({ update: () => ({ data: [updated] }) })

    const reservation = await updateReservationStatus(client as never, 'org-1', 3, 'cancelada')
    expect(reservation?.status).toBe('cancelada')
  })

  it('updateReservationStatus valida que el estado sea válido', async () => {
    const client = clientWith({})

    await expect(
      updateReservationStatus(client as never, 'org-1', 3, 'pendiente' as never),
    ).rejects.toThrow('Estado de reservación inválido')
  })

  it('updateReservationStatus lanza el error de la BD si falla', async () => {
    const client = clientWith({ update: () => ({ error: new Error('viola RLS') }) })

    await expect(
      updateReservationStatus(client as never, 'org-1', 3, 'confirmada'),
    ).rejects.toThrow('viola RLS')
  })
})
