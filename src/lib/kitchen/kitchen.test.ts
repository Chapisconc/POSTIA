import { describe, expect, it, vi } from 'vitest'
import { getKitchenStatuses, listKitchenOrders } from './kitchen'

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

const ORDERS: Row[] = [
  {
    id: 1,
    status_id: 10,
    items: [{ product_id: 1, name: 'Torta', qty: 2 }],
    created_at: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 2,
    status_id: 20,
    items: [{ product_id: 2, name: 'Jugo', qty: 1 }],
    created_at: '2026-08-06T10:05:00.000Z',
  },
]

const STATUSES: Row[] = [
  { id: 10, label: 'En preparación', notify_kitchen: true },
  { id: 20, label: 'Entregado', notify_kitchen: false },
]

describe('servicio de cocina', () => {
  it('listKitchenOrders devuelve solo pedidos con estado que notifica a cocina', async () => {
    const client = clientWith({
      orders: () => ({ data: ORDERS }),
      statuses: () => ({ data: STATUSES }),
    })

    const orders = await listKitchenOrders(client as never, 'org-1')
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe(1)
  })

  it('listKitchenOrders devuelve vacío si ningún estado notifica a cocina', async () => {
    const client = clientWith({
      orders: () => ({ data: ORDERS }),
      statuses: () => ({ data: [{ id: 20, label: 'Entregado', notify_kitchen: false }] }),
    })

    const orders = await listKitchenOrders(client as never, 'org-1')
    expect(orders).toHaveLength(0)
  })

  it('listKitchenOrders lanza el error de la BD si falla', async () => {
    const client = clientWith({
      orders: () => ({ error: new Error('db down') }),
      statuses: () => ({ data: STATUSES }),
    })

    await expect(listKitchenOrders(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('getKitchenStatuses devuelve solo estados con notify_kitchen activo', async () => {
    const client = clientWith({ statuses: () => ({ data: STATUSES }) })

    const statuses = await getKitchenStatuses(client as never, 'org-1')
    expect(statuses).toHaveLength(1)
    expect(statuses[0].id).toBe(10)
    expect(statuses[0].notify_kitchen).toBe(true)
  })

  it('getKitchenStatuses lanza el error de la BD si falla', async () => {
    const client = clientWith({ statuses: () => ({ error: new Error('db down') }) })

    await expect(getKitchenStatuses(client as never, 'org-1')).rejects.toThrow('db down')
  })
})
