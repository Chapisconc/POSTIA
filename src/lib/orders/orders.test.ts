import { describe, expect, it } from 'vitest'
import {
  calculateTotals,
  chargeOrder,
  createOrder,
  getNextOrderStatus,
  listOrders,
  updateOrderStatus,
  type OrderItem,
  type Order,
} from './orders'
import { DEFAULT_SETTINGS, type OrgSettings } from '@/lib/config/service'

describe('calculateTotals', () => {
  it('calcula subtotal, impuesto y total con impuestos activos', () => {
    const items: OrderItem[] = [
      { product_id: 1, name: 'Tacos', qty: 3, unit_price: 40 },
      { product_id: 2, name: 'Refresco', qty: 2, unit_price: 25 },
    ]
    const settings: OrgSettings = { ...DEFAULT_SETTINGS, impuestos: { activo: true, porcentaje: 16 } }

    const totals = calculateTotals(items, settings)
    expect(totals.subtotal).toBe(170)
    expect(totals.tax).toBe(27.2)
    expect(totals.total).toBe(197.2)
  })

  it('no cobra impuesto cuando están desactivados', () => {
    const items: OrderItem[] = [{ product_id: 1, name: 'Café', qty: 2, unit_price: 30 }]
    const settings: OrgSettings = { ...DEFAULT_SETTINGS, impuestos: { activo: false, porcentaje: 16 } }

    const totals = calculateTotals(items, settings)
    expect(totals.subtotal).toBe(60)
    expect(totals.tax).toBe(0)
    expect(totals.total).toBe(60)
  })

  it('redondea a dos decimales', () => {
    const items: OrderItem[] = [{ product_id: 1, name: 'Pasta', qty: 3, unit_price: 55.55 }]
    const settings: OrgSettings = DEFAULT_SETTINGS

    const totals = calculateTotals(items, settings)
    expect(totals.subtotal).toBe(166.65)
    expect(totals.tax).toBe(26.66)
    expect(totals.total).toBe(193.31)
  })
})

type Row = Record<string, unknown>

function ordersClient(handlers: {
  statuses?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
  list?: () => { data?: Row[]; error?: unknown }
  update?: (row: Row) => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table === 'order_statuses') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(handlers.statuses?.() ?? { data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          insert: (row: Row) => ({
            select: () => Promise.resolve(handlers.insert?.() ?? { data: [row], error: null }),
          }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(handlers.list?.() ?? { data: [], error: null }),
            }),
          }),
          update: (row: Row) => ({
            eq: () => ({
              select: () =>
                Promise.resolve(
                  handlers.update?.(row) ?? { data: [{ id: 1, ...row }], error: null },
                ),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

describe('createOrder', () => {
  it('crea un pedido con estado inicial, subtotal, impuesto y total', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [
          { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, notify_kitchen: true },
          { id: 2, key: 'pagado', label: 'Pagado', position: 1, notify_kitchen: false },
        ],
      }),
      insert: () => ({
        data: [
          {
            id: 10,
            organization_id: 'org-1',
            order_type_id: 1,
            status_id: 1,
            items: [{ product_id: 1, name: 'Tacos', qty: 2, unit_price: 40 }],
            subtotal: 80,
            tax: 12.8,
            total: 92.8,
          },
        ],
        error: null,
      }),
    })

    const order = await createOrder(
      client as never,
      'org-1',
      {
        order_type_id: 1,
        items: [{ product_id: 1, name: 'Tacos', qty: 2, unit_price: 40 }],
      },
      DEFAULT_SETTINGS,
    )

    expect(order.status_id).toBe(1)
    expect(order.subtotal).toBe(80)
    expect(order.tax).toBe(12.8)
    expect(order.total).toBe(92.8)
  })

  it('lanza si no hay estado inicial configurado', async () => {
    const client = ordersClient({ statuses: () => ({ data: [] }) })

    await expect(
      createOrder(
        client as never,
        'org-1',
        { order_type_id: 1, items: [{ product_id: 1, name: 'X', qty: 1, unit_price: 10 }] },
        DEFAULT_SETTINGS,
      ),
    ).rejects.toThrow('No hay estados de pedido configurados para este negocio')
  })

  it('lanza si el pedido no tiene productos', async () => {
    const client = ordersClient({})

    await expect(
      createOrder(client as never, 'org-1', { order_type_id: 1, items: [] }, DEFAULT_SETTINGS),
    ).rejects.toThrow('El pedido debe incluir al menos un producto')
  })

  it('propaga errores de la BD al insertar', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [{ id: 1, key: 'nuevo', label: 'Nuevo', position: 0, notify_kitchen: true }],
      }),
      insert: () => ({ error: new Error('insert failed') }),
    })

    await expect(
      createOrder(
        client as never,
        'org-1',
        { order_type_id: 1, items: [{ product_id: 1, name: 'X', qty: 1, unit_price: 10 }] },
        DEFAULT_SETTINGS,
      ),
    ).rejects.toThrow('insert failed')
  })
})

describe('chargeOrder', () => {
  it('marca el pedido como pagado con el método de pago elegido', async () => {
    const updates: Row[] = []
    const client = ordersClient({
      statuses: () => ({
        data: [
          { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, permite_cobro: false },
          { id: 4, key: 'pagado', label: 'Pagado', position: 4, permite_cobro: true },
        ],
      }),
      update: (row: Row) => {
        updates.push(row)
        return { data: [{ id: 7, ...row }], error: null }
      },
    })

    const order = await chargeOrder(client as never, 'org-1', 7, 2)

    expect(order.status_id).toBe(4)
    expect(order.payment_method_id).toBe(2)
    expect(updates[0]).toMatchObject({ status_id: 4, payment_method_id: 2 })
  })

  it('lanza si ningún estado permite cobro', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [{ id: 1, key: 'nuevo', label: 'Nuevo', position: 0, permite_cobro: false }],
      }),
    })

    await expect(chargeOrder(client as never, 'org-1', 7, 2)).rejects.toThrow(
      'No hay un estado que permita el cobro',
    )
  })

  it('propaga errores de la BD', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [{ id: 4, key: 'pagado', label: 'Pagado', position: 4, permite_cobro: true }],
      }),
      update: () => ({ error: new Error('update failed') }),
    })

    await expect(chargeOrder(client as never, 'org-1', 7, 2)).rejects.toThrow('update failed')
  })
})

describe('getNextOrderStatus', () => {
  it('devuelve el estado que sigue en posición', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [
          { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, notify_kitchen: true },
          { id: 2, key: 'preparando', label: 'Preparando', position: 1, notify_kitchen: true },
          { id: 3, key: 'listo', label: 'Listo', position: 2 },
        ],
      }),
    })

    const next = await getNextOrderStatus(client as never, 'org-1', 1)
    expect(next?.id).toBe(2)
  })

  it('devuelve null en el último estado', async () => {
    const client = ordersClient({
      statuses: () => ({
        data: [{ id: 4, key: 'pagado', label: 'Pagado', position: 4, permite_cobro: true }],
      }),
    })

    expect(await getNextOrderStatus(client as never, 'org-1', 4)).toBeNull()
  })

  it('devuelve null si el estado actual no existe', async () => {
    const client = ordersClient({ statuses: () => ({ data: [{ id: 1, key: 'nuevo', label: 'Nuevo', position: 0 }] }) })

    expect(await getNextOrderStatus(client as never, 'org-1', 99)).toBeNull()
  })
})

describe('updateOrderStatus', () => {
  it('actualiza el estado del pedido', async () => {
    const updates: Row[] = []
    const client = ordersClient({
      update: (row: Row) => {
        updates.push(row)
        return { data: [{ id: 7, status_id: row.status_id }], error: null }
      },
    })

    const order = await updateOrderStatus(client as never, 'org-1', 7, 2)
    expect(order.status_id).toBe(2)
    expect(updates[0]).toMatchObject({ status_id: 2 })
  })

  it('propaga errores de la BD', async () => {
    const client = ordersClient({ update: () => ({ error: new Error('update failed') }) })

    await expect(updateOrderStatus(client as never, 'org-1', 7, 2)).rejects.toThrow('update failed')
  })
})

describe('listOrders', () => {
  it('devuelve los pedidos de la organización', async () => {
    const client = ordersClient({
      list: () => ({
        data: [{ id: 5, organization_id: 'org-1', total: 120, status_id: 2 }],
        error: null,
      }),
    })

    const orders = (await listOrders(client as never, 'org-1')) as Order[]
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe(5)
    expect(orders[0].total).toBe(120)
  })

  it('lanza si la BD falla', async () => {
    const client = ordersClient({ list: () => ({ error: new Error('db down') }) })

    await expect(listOrders(client as never, 'org-1')).rejects.toThrow('db down')
  })
})
