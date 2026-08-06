import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateMovementRequest,
  handleListInventoryRequest,
} from './inventory-handler'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  stock?: () => { data?: Row | null; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
}) {
  const stockResult = handlers.stock?.()
  return {
    from: (table: string) => {
      if (table === 'inventory_movements') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(handlers.insert?.() ?? { data: [], error: null }),
          }),
        }
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockImplementation((fields: string) => {
            if (fields === 'stock') {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(stockResult ?? { data: null, error: null }),
                  }),
                }),
              }
            }
            return {
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue(handlers.list?.() ?? { data: [], error: null }),
              }),
            }
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

function post(body: unknown): Request {
  return new Request('http://localhost/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('handlers de inventario', () => {
  it('handleListInventoryRequest responde 200 con el inventario', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, name: 'Torta', stock: 5 }] }),
    })
    const response = await handleListInventoryRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListInventoryRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListInventoryRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateMovementRequest responde 201 con el movimiento creado', async () => {
    const client = clientWith({
      stock: () => ({ data: { stock: 10 } }),
      insert: () => ({ data: [{ id: 1, product_id: 2, qty: 2, type: 'entrada' }] }),
    })
    const response = await handleCreateMovementRequest(
      'org-1',
      client as never,
      post({ product_id: 2, type: 'entrada', qty: 2 }),
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.type).toBe('entrada')
  })

  it('handleCreateMovementRequest responde 400 si el stock es insuficiente', async () => {
    const client = clientWith({ stock: () => ({ data: { stock: 2 } }) })
    const response = await handleCreateMovementRequest(
      'org-1',
      client as never,
      post({ product_id: 2, type: 'salida', qty: 5 }),
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Stock insuficiente')
  })

  it('handleCreateMovementRequest responde 400 si el body no es JSON', async () => {
    const client = clientWith({})
    const response = await handleCreateMovementRequest(
      'org-1',
      client as never,
      new Request('http://localhost/api/inventory', { method: 'POST' }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreateMovementRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({
      stock: () => ({ data: { stock: 10 } }),
      insert: () => ({ error: new Error('viola RLS') }),
    })
    const response = await handleCreateMovementRequest(
      'org-1',
      client as never,
      post({ product_id: 2, type: 'entrada', qty: 2 }),
    )
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
