import { describe, expect, it, vi } from 'vitest'
import { createProduct, listProducts } from './products'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table !== 'products') throw new Error(`tabla inesperada: ${table}`)
      const listResult = handlers.list?.()
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
      }
    },
  }
}

describe('servicio de productos', () => {
  it('listProducts devuelve los productos de la organización ordenados por nombre', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Torta', price: 45, active: true, category_id: null },
      { id: 2, name: 'Agua', price: 15, active: true, category_id: null },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const products = await listProducts(client as never, 'org-1')
    expect(products).toHaveLength(2)
  })

  it('listProducts lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listProducts(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createProduct inserta un producto con precio y devuelve la fila creada', async () => {
    const created: Row = { id: 10, name: 'Tacos de pastor', price: 40, organization_id: 'org-1' }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const product = await createProduct(
      client as never,
      'org-1',
      { name: 'Tacos de pastor', price: 40 },
    )

    expect(product?.name).toBe('Tacos de pastor')
    expect(product?.price).toBe(40)
  })

  it('createProduct valida que el nombre no esté vacío', async () => {
    const client = clientWith({})

    await expect(
      createProduct(client as never, 'org-1', { name: '  ', price: 10 }),
    ).rejects.toThrow('El nombre del producto es obligatorio')
  })

  it('createProduct valida que el precio sea mayor o igual a 0', async () => {
    const client = clientWith({})

    await expect(
      createProduct(client as never, 'org-1', { name: 'Torta', price: -5 }),
    ).rejects.toThrow('El precio debe ser mayor o igual a 0')
  })

  it('createProduct lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createProduct(client as never, 'org-1', { name: 'Torta', price: 10 }),
    ).rejects.toThrow('viola RLS')
  })
})
