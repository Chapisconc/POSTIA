import { describe, expect, it, vi } from 'vitest'
import { handleCreateOrderRequest, handleListOrdersRequest } from './orders-handler'

function okClient(options: { createFails?: boolean }) {
  const calls: unknown[] = []
  return {
    calls,
    client: {
      from: (table: string) => {
        if (table === 'order_statuses') {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ id: 1, key: 'nuevo', label: 'Nuevo', position: 0 }],
                    error: null,
                  }),
              }),
            }),
          }
        }
        if (table === 'org_settings') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { settings: { moneda: 'MXN' } },
                    error: null,
                  }),
              }),
            }),
          }
        }
        if (table === 'orders') {
          return {
            insert: (row: Record<string, unknown>) => {
              calls.push(row)
              return {
                select: () =>
                  Promise.resolve(
                    options.createFails
                      ? { error: new Error('db down') }
                      : {
                          data: [{ id: 1, ...row, created_at: new Date().toISOString() }],
                          error: null,
                        },
                  ),
              }
            },
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [{ id: 1, total: 50 }], error: null }),
              }),
            }),
          }
        }
        throw new Error(`tabla inesperada: ${table}`)
      },
    },
  }
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('handleCreateOrderRequest', () => {
  it('crea un pedido y responde 201 con el total calculado', async () => {
    const { client, calls } = okClient({})

    const response = await handleCreateOrderRequest(
      'org-1',
      client as never,
      jsonRequest({
        order_type_id: 2,
        items: [{ product_id: 5, name: 'Tacos', qty: 2, unit_price: 40 }],
      }),
    )

    expect(response.status).toBe(201)
    const created = await response.json()
    expect(created.subtotal).toBe(80)
    expect(created.tax).toBe(12.8)
    expect(created.total).toBe(92.8)
    expect(created.status_id).toBe(1)
    expect(created.organization_id).toBe('org-1')
    expect((calls[0] as { status_id: number }).status_id).toBe(1)
  })

  it('rechaza pedidos sin productos con 400', async () => {
    const { client } = okClient({})
    const response = await handleCreateOrderRequest(
      'org-1',
      client as never,
      jsonRequest({ order_type_id: 1, items: [] }),
    )
    expect(response.status).toBe(400)
  })

  it('rechaza body inválido con 400', async () => {
    const { client } = okClient({})
    const response = await handleCreateOrderRequest(
      'org-1',
      client as never,
      jsonRequest({ nope: true }),
    )
    expect(response.status).toBe(400)
  })

  it('responde 500 si la BD falla', async () => {
    const { client } = okClient({ createFails: true })
    const response = await handleCreateOrderRequest(
      'org-1',
      client as never,
      jsonRequest({
        order_type_id: 1,
        items: [{ product_id: 1, name: 'X', qty: 1, unit_price: 10 }],
      }),
    )
    expect(response.status).toBe(500)
  })
})

describe('handleListOrdersRequest', () => {
  it('responde 200 con la lista de pedidos', async () => {
    const { client } = okClient({})
    const response = await handleListOrdersRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const orders = await response.json()
    expect(orders).toHaveLength(1)
    expect(orders[0].total).toBe(50)
  })

  it('responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ error: new Error('db down') }),
              }),
            }),
          }
        }
        throw new Error(`tabla inesperada: ${table}`)
      },
    }

    const response = await handleListOrdersRequest('org-1', failing as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
