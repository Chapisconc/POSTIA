import { describe, expect, it, vi } from 'vitest'
import { addMovement, listInventory, listMovements } from './inventory'

type Row = Record<string, unknown>

function clientWith(handlers: {
  listProducts?: () => { data?: Row[]; error?: unknown }
  stock?: () => { data?: Row | null; error?: unknown }
  insertMovement?: () => { data?: Row[]; error?: unknown }
  updateStock?: () => { data?: Row[]; error?: unknown }
  listMovements?: () => { data?: Row[]; error?: unknown }
}) {
  const listProductsResult = handlers.listProducts?.()
  const stockResult = handlers.stock?.()
  const listMovementsResult = handlers.listMovements?.()

  const insertSpy = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(handlers.insertMovement?.() ?? { data: [], error: null }),
  })

  const updateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(handlers.updateStock?.() ?? { data: [], error: null }),
      }),
    }),
  })

  const client = {
    from: (table: string) => {
      if (table === 'inventory_movements') {
        return {
          insert: insertSpy,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(listMovementsResult ?? { data: [], error: null }),
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue(listMovementsResult ?? { data: [], error: null }),
              }),
            }),
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
                order: vi.fn().mockResolvedValue(listProductsResult ?? { data: [], error: null }),
              }),
            }
          }),
          update: updateSpy,
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }

  return { client, insertSpy, updateSpy }
}

describe('servicio de inventario', () => {
  it('listInventory devuelve los productos con stock ordenados por nombre', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Agua', price: 15, active: true, stock: 20 },
      { id: 2, name: 'Torta', price: 45, active: true, stock: 3 },
    ]
    const { client } = clientWith({ listProducts: () => ({ data: rows }) })

    const products = await listInventory(client as never, 'org-1')
    expect(products).toHaveLength(2)
    expect(products[0].stock).toBe(20)
  })

  it('listInventory lanza el error de la BD si falla', async () => {
    const { client } = clientWith({ listProducts: () => ({ error: new Error('db down') }) })

    await expect(listInventory(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('addMovement de entrada inserta el movimiento y suma al stock', async () => {
    const movement: Row = {
      id: 1,
      product_id: 2,
      qty: 2,
      type: 'entrada',
      note: null,
      organization_id: 'org-1',
    }
    const { client, insertSpy, updateSpy } = clientWith({
      stock: () => ({ data: { stock: 10 } }),
      insertMovement: () => ({ data: [movement] }),
    })

    const created = await addMovement(client as never, 'org-1', 2, 'entrada', 2, null, null)

    expect(created?.type).toBe('entrada')
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      product_id: 2,
      qty: 2,
      type: 'entrada',
      organization_id: 'org-1',
    })
    expect(updateSpy).toHaveBeenCalledWith({ stock: 12 })
  })

  it('addMovement de salida inserta el movimiento y resta del stock', async () => {
    const movement: Row = {
      id: 2,
      product_id: 2,
      qty: 3,
      type: 'salida',
      note: 'Venta',
      organization_id: 'org-1',
    }
    const { client, updateSpy } = clientWith({
      stock: () => ({ data: { stock: 10 } }),
      insertMovement: () => ({ data: [movement] }),
    })

    const created = await addMovement(client as never, 'org-1', 2, 'salida', 3, 'Venta', 'user-1')

    expect(created?.note).toBe('Venta')
    expect(updateSpy).toHaveBeenCalledWith({ stock: 7 })
  })

  it('addMovement de salida con stock insuficiente lanza error', async () => {
    const { client, insertSpy } = clientWith({
      stock: () => ({ data: { stock: 2 } }),
    })

    await expect(
      addMovement(client as never, 'org-1', 2, 'salida', 5, null, null),
    ).rejects.toThrow('Stock insuficiente')
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('addMovement valida que la cantidad sea mayor a 0', async () => {
    const { client } = clientWith({})

    await expect(
      addMovement(client as never, 'org-1', 2, 'entrada', 0, null, null),
    ).rejects.toThrow('La cantidad debe ser mayor a 0')
  })

  it('addMovement valida el tipo de movimiento', async () => {
    const { client } = clientWith({})

    await expect(
      addMovement(client as never, 'org-1', 2, 'ajuste' as never, 5, null, null),
    ).rejects.toThrow('Tipo de movimiento inválido')
  })

  it('addMovement lanza el error de la BD si el insert falla', async () => {
    const { client } = clientWith({
      stock: () => ({ data: { stock: 10 } }),
      insertMovement: () => ({ error: new Error('viola RLS') }),
    })

    await expect(
      addMovement(client as never, 'org-1', 2, 'entrada', 5, null, null),
    ).rejects.toThrow('viola RLS')
  })

  it('listMovements devuelve los movimientos de la organización', async () => {
    const rows: Row[] = [
      { id: 1, product_id: 1, qty: 2, type: 'entrada', created_at: '2026-01-01' },
      { id: 2, product_id: 1, qty: 1, type: 'salida', created_at: '2026-01-02' },
    ]
    const { client } = clientWith({ listMovements: () => ({ data: rows }) })

    const movements = await listMovements(client as never, 'org-1')
    expect(movements).toHaveLength(2)
  })

  it('listMovements filtra por producto cuando se envía productId', async () => {
    const rows: Row[] = [{ id: 1, product_id: 7, qty: 2, type: 'entrada' }]
    const { client } = clientWith({ listMovements: () => ({ data: rows }) })

    const movements = await listMovements(client as never, 'org-1', 7)
    expect(movements).toHaveLength(1)
  })

  it('listMovements lanza el error de la BD si falla', async () => {
    const { client } = clientWith({ listMovements: () => ({ error: new Error('db down') }) })

    await expect(listMovements(client as never, 'org-1')).rejects.toThrow('db down')
  })
})
