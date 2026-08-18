import { describe, expect, it, vi } from 'vitest'
import { createPromotion, listPromotions, togglePromotion } from './promotions'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
  update?: () => { data?: Row[]; error?: unknown }
}) {
  const listResult = handlers.list?.() ?? { data: [], error: null }
  return {
    from: (table: string) => {
      if (table !== 'promotions') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ...listResult,
            order: vi.fn().mockResolvedValue(listResult),
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

describe('servicio de promociones', () => {
  it('listPromotions devuelve las promociones de la organización', async () => {
    const rows: Row[] = [{ id: 1, name: '2x1', discount_type: 'porcentaje', value: 50 }]
    const client = clientWith({ list: () => ({ data: rows }) })

    const promotions = await listPromotions(client as never, 'org-1')
    expect(promotions).toHaveLength(1)
    expect(promotions[0].name).toBe('2x1')
  })

  it('listPromotions lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listPromotions(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createPromotion inserta una promoción activa por defecto', async () => {
    const created: Row = { id: 1, name: 'Lunes de hamburguesas', discount_type: 'porcentaje', value: 25, active: true }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const promotion = await createPromotion(client as never, 'org-1', {
      name: 'Lunes de hamburguesas',
      discount_type: 'porcentaje',
      value: 25,
    })

    expect(promotion?.name).toBe('Lunes de hamburguesas')
    expect(promotion?.active).toBe(true)
  })

  it('createPromotion valida que el nombre sea obligatorio', async () => {
    const client = clientWith({})

    await expect(
      createPromotion(client as never, 'org-1', { name: '  ', discount_type: 'fijo', value: 10 }),
    ).rejects.toThrow('El nombre es obligatorio')
  })

  it('createPromotion valida el tipo de descuento', async () => {
    const client = clientWith({})

    await expect(
      createPromotion(client as never, 'org-1', { name: 'X', discount_type: 'gratis', value: 10 }),
    ).rejects.toThrow('El tipo de descuento no es válido')
  })

  it('createPromotion valida que el descuento sea mayor o igual a 0', async () => {
    const client = clientWith({})

    await expect(
      createPromotion(client as never, 'org-1', { name: 'X', discount_type: 'fijo', value: -5 }),
    ).rejects.toThrow('El descuento debe ser mayor o igual a 0')
  })

  it('createPromotion lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createPromotion(client as never, 'org-1', { name: 'X', discount_type: 'fijo', value: 10 }),
    ).rejects.toThrow('viola RLS')
  })

  it('togglePromotion invierte el estado activo de la promoción', async () => {
    const updated: Row = { id: 1, name: 'X', active: false }
    const client = clientWith({
      list: () => ({ data: [{ id: 1, name: 'X', active: true }] }),
      update: () => ({ data: [updated] }),
    })

    const promotion = await togglePromotion(client as never, 'org-1', 1)
    expect(promotion?.active).toBe(false)
  })

  it('togglePromotion lanza error si la promoción no existe', async () => {
    const client = clientWith({ list: () => ({ data: [] }) })

    await expect(togglePromotion(client as never, 'org-1', 99)).rejects.toThrow(
      'Promoción no encontrada',
    )
  })

  it('togglePromotion lanza el error de la BD si el update falla', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, active: false }] }),
      update: () => ({ error: new Error('db down') }),
    })

    await expect(togglePromotion(client as never, 'org-1', 1)).rejects.toThrow('db down')
  })
})
