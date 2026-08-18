import { describe, expect, it, vi } from 'vitest'
import { handleListKitchenRequest } from './kitchen-handler'

type Row = Record<string, unknown>

function clientWith(handlers: {
  orders?: () => { data?: Row[]; error?: unknown }
  statuses?: () => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      const source =
        table === 'orders'
          ? handlers.orders
          : table === 'order_statuses'
            ? handlers.statuses
            : null
      if (!source) throw new Error(`tabla inesperada: ${table}`)
      const result = source()
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ...(result ?? { data: [], error: null }),
            order: vi.fn().mockResolvedValue(result ?? { data: [], error: null }),
          }),
        }),
      }
    },
  }
}

describe('handlers de cocina', () => {
  it('handleListKitchenRequest responde 200 con los pedidos de cocina', async () => {
    const client = clientWith({
      orders: () => ({ data: [{ id: 1, status_id: 10 }] }),
      statuses: () => ({ data: [{ id: 10, notify_kitchen: true }] }),
    })
    const response = await handleListKitchenRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListKitchenRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({
      orders: () => ({ error: new Error('db down') }),
      statuses: () => ({ data: [] }),
    })
    const response = await handleListKitchenRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
