import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateReservationRequest,
  handleListReservationsRequest,
  handleUpdateReservationStatusRequest,
} from './reservations-handler'

function clientWith(handlers: {
  list?: () => { data?: Record<string, unknown>[]; error?: unknown }
  insert?: () => { data?: Record<string, unknown>[]; error?: unknown }
  update?: () => { data?: Record<string, unknown>[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
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
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(handlers.insert?.() ?? { data: [], error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue(handlers.update?.() ?? { data: [], error: null }),
            }),
          }),
        }),
      }
    },
  }
}

describe('handlers de reservaciones', () => {
  it('handleListReservationsRequest responde 200 con las reservaciones', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, name: 'Ana', status: 'confirmada' }] }),
    })
    const response = await handleListReservationsRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListReservationsRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListReservationsRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateReservationRequest responde 201 con la reservación creada', async () => {
    const client = clientWith({
      insert: () => ({
        data: [
          {
            id: 3,
            name: 'Ana',
            guests: 2,
            reserved_at: '2026-08-10',
            reserved_time: '20:30:00',
            status: 'confirmada',
          },
        ],
      }),
    })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ana',
        guests: 2,
        reserved_at: '2026-08-10',
        reserved_time: '20:30',
      }),
    })
    const response = await handleCreateReservationRequest('org-1', client as never, request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('Ana')
  })

  it('handleCreateReservationRequest responde 400 si falta el nombre', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '  ', reserved_at: '2026-08-10', reserved_time: '20:30' }),
    })
    const response = await handleCreateReservationRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })

  it('handleCreateReservationRequest responde 400 con comensales inválidos', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana', guests: 0, reserved_at: '2026-08-10', reserved_time: '20:30' }),
    })
    const response = await handleCreateReservationRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })

  it('handleCreateReservationRequest responde 400 si faltan fecha y hora', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana' }),
    })
    const response = await handleCreateReservationRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })

  it('handleUpdateReservationStatusRequest responde 200 al actualizar el estado', async () => {
    const client = clientWith({
      update: () => ({ data: [{ id: 3, name: 'Ana', status: 'cancelada' }] }),
    })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelada' }),
    })
    const response = await handleUpdateReservationStatusRequest('org-1', client as never, 3, request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('cancelada')
  })

  it('handleUpdateReservationStatusRequest responde 400 con estado inválido', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pendiente' }),
    })
    const response = await handleUpdateReservationStatusRequest('org-1', client as never, 3, request)
    expect(response.status).toBe(400)
  })

  it('handleUpdateReservationStatusRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ update: () => ({ error: new Error('viola RLS') }) })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completada' }),
    })
    const response = await handleUpdateReservationStatusRequest('org-1', client as never, 3, request)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
