import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateDeliveryRequest,
  handleListDeliveriesRequest,
  handleUpdateDeliveryStatusRequest,
} from './delivery-handler'

function clientWith(handlers: {
  list?: () => { data?: Record<string, unknown>[]; error?: unknown }
  insert?: () => { data?: Record<string, unknown>[]; error?: unknown }
  update?: () => { data?: Record<string, unknown>[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  return {
    from: (table: string) => {
      if (table !== 'deliveries') throw new Error(`tabla inesperada: ${table}`)
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

describe('handlers de entregas', () => {
  it('handleListDeliveriesRequest responde 200 con las entregas', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, order_id: 10, status: 'asignado' }] }),
    })
    const response = await handleListDeliveriesRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListDeliveriesRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListDeliveriesRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateDeliveryRequest responde 201 con la entrega creada', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 5, order_id: 10, courier: 'Juan', status: 'asignado' }] }),
    })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ order_id: 10, courier: 'Juan' }),
    })
    const response = await handleCreateDeliveryRequest('org-1', client as never, request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.courier).toBe('Juan')
  })

  it('handleCreateDeliveryRequest responde 400 si falta el pedido', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ courier: 'Juan' }),
    })
    const response = await handleCreateDeliveryRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })

  it('handleUpdateDeliveryStatusRequest responde 200 al actualizar el estado', async () => {
    const client = clientWith({
      update: () => ({ data: [{ id: 5, order_id: 10, status: 'en_camino' }] }),
    })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'en_camino' }),
    })
    const response = await handleUpdateDeliveryStatusRequest('org-1', client as never, 5, request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('en_camino')
  })

  it('handleUpdateDeliveryStatusRequest responde 400 con estado inválido', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'pendiente' }),
    })
    const response = await handleUpdateDeliveryStatusRequest('org-1', client as never, 5, request)
    expect(response.status).toBe(400)
  })

  it('handleUpdateDeliveryStatusRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ update: () => ({ error: new Error('viola RLS') }) })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'entregado' }),
    })
    const response = await handleUpdateDeliveryStatusRequest('org-1', client as never, 5, request)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
