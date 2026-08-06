import { describe, expect, it } from 'vitest'
import {
  getInitialStatusId,
  getOrderStatuses,
  getOrderTypes,
  getPaymentMethods,
} from './service'

type Row = Record<string, unknown>

function listClient(handlers: Record<string, () => { data?: Row[]; error?: unknown }>) {
  return {
    from: (table: string) => {
      if (!handlers[table]) throw new Error(`tabla inesperada: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve(handlers[table]() ?? { data: [], error: null }),
          }),
        }),
      }
    },
  }
}

describe('catálogos de configuración por organización', () => {
  it('getOrderStatuses devuelve los estados de la org', async () => {
    const client = listClient({
      order_statuses: () => ({
        data: [
          { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, notify_kitchen: true },
          { id: 2, key: 'pagado', label: 'Pagado', position: 1, notify_kitchen: false },
        ],
      }),
    })

    const statuses = await getOrderStatuses('org-1', client as never)
    expect(statuses).toHaveLength(2)
    expect(statuses[0].label).toBe('Nuevo')
  })

  it('getOrderStatuses devuelve lista vacía si no hay estados', async () => {
    const client = listClient({ order_statuses: () => ({ data: [] }) })

    const statuses = await getOrderStatuses('org-1', client as never)
    expect(statuses).toEqual([])
  })

  it('getOrderStatuses lanza el error de la BD', async () => {
    const client = listClient({ order_statuses: () => ({ error: new Error('db down') }) })

    await expect(getOrderStatuses('org-1', client as never)).rejects.toThrow('db down')
  })

  it('getOrderTypes devuelve los tipos de pedido', async () => {
    const client = listClient({
      order_types: () => ({
        data: [
          { id: 1, key: 'mesa', label: 'En mesa', position: 0, requires_address: false },
          { id: 2, key: 'delivery', label: 'A domicilio', position: 1, requires_address: true },
        ],
      }),
    })

    const types = await getOrderTypes('org-1', client as never)
    expect(types).toHaveLength(2)
    expect(types[1].key).toBe('delivery')
    expect(types[1].requires_address).toBe(true)
  })

  it('getPaymentMethods devuelve los métodos de pago', async () => {
    const client = listClient({
      payment_methods: () => ({
        data: [
          { id: 1, key: 'efectivo', label: 'Efectivo', position: 0 },
          { id: 2, key: 'tarjeta', label: 'Tarjeta', position: 1 },
        ],
      }),
    })

    const methods = await getPaymentMethods('org-1', client as never)
    expect(methods).toHaveLength(2)
    expect(methods[0].label).toBe('Efectivo')
  })

  it('getInitialStatusId devuelve el id del primer estado (position 0)', async () => {
    const client = listClient({
      order_statuses: () => ({
        data: [
          { id: 5, key: 'cancelado', label: 'Cancelado', position: 3 },
          { id: 2, key: 'pagado', label: 'Pagado', position: 2 },
          { id: 1, key: 'nuevo', label: 'Nuevo', position: 0 },
        ],
      }),
    })

    const id = await getInitialStatusId('org-1', client as never)
    expect(id).toBe(1)
  })

  it('getInitialStatusId devuelve null si no hay estados', async () => {
    const client = listClient({ order_statuses: () => ({ data: [] }) })

    expect(await getInitialStatusId('org-1', client as never)).toBeNull()
  })
})
