import { describe, expect, it, vi } from 'vitest'
import { handleUpdateOrderStatusRequest } from './orders-handler'

function clientWith(overrides: {
  statuses?: () => { data?: Record<string, unknown>[]; error?: unknown }
  update?: (row: Record<string, unknown>) => { data?: Record<string, unknown>[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table === 'order_statuses') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve(
                  overrides.statuses?.() ?? {
                    data: [{ id: 1, key: 'nuevo', label: 'Nuevo', position: 0 }],
                    error: null,
                  },
                ),
            }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          update: (row: Record<string, unknown>) => ({
            eq: () => ({
              select: () =>
                Promise.resolve(
                  overrides.update?.(row) ?? {
                    data: [{ id: 7, ...row }],
                    error: null,
                  },
                ),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

describe('handleUpdateOrderStatusRequest', () => {
  it('actualiza el estado y responde 200', async () => {
    const client = clientWith({})
    const response = await handleUpdateOrderStatusRequest(
      'org-1',
      client as never,
      7,
      jsonRequest({ status_id: 2 }),
    )
    expect(response.status).toBe(200)
    const order = await response.json()
    expect(order.status_id).toBe(2)
  })

  it('rechaza sin status_id con 400', async () => {
    const client = clientWith({})
    const response = await handleUpdateOrderStatusRequest(
      'org-1',
      client as never,
      7,
      jsonRequest({}),
    )
    expect(response.status).toBe(400)
  })

  it('responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ update: () => ({ error: new Error('db down') }) })
    const response = await handleUpdateOrderStatusRequest(
      'org-1',
      client as never,
      7,
      jsonRequest({ status_id: 2 }),
    )
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
