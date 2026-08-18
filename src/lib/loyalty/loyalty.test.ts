import { describe, expect, it, vi } from 'vitest'
import { addPoints, getLoyaltySummary } from './loyalty'

type Row = Record<string, unknown>

function clientWith(handlers: {
  listCustomers?: () => { data?: Row[]; error?: unknown }
  listEntries?: () => { data?: Row[]; error?: unknown }
  insertEntry?: () => { data?: Row[]; error?: unknown }
}) {
  const listCustomersResult = handlers.listCustomers?.() ?? { data: [], error: null }
  const listEntriesResult = handlers.listEntries?.() ?? { data: [], error: null }

  return {
    from: (table: string) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...listCustomersResult,
              order: vi.fn().mockResolvedValue(listCustomersResult),
            }),
          }),
        }
      }
      if (table === 'loyalty_entries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...listEntriesResult,
              order: vi.fn().mockResolvedValue(listEntriesResult),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(handlers.insertEntry?.() ?? { data: [], error: null }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

describe('servicio de puntos (lealtad)', () => {
  it('addPoints inserta una entrada de puntos', async () => {
    const created: Row = {
      id: 1,
      customer_id: 5,
      points: 100,
      reason: 'Compra inicial',
    }
    const client = clientWith({ insertEntry: () => ({ data: [created] }) })

    const entry = await addPoints(client as never, 'org-1', {
      customer_id: 5,
      points: 100,
      reason: 'Compra inicial',
    })

    expect(entry?.points).toBe(100)
    expect(entry?.reason).toBe('Compra inicial')
  })

  it('addPoints valida que el cliente sea obligatorio', async () => {
    const client = clientWith({})

    await expect(
      addPoints(client as never, 'org-1', { customer_id: 0 as never, points: 100 }),
    ).rejects.toThrow('El cliente es obligatorio')
  })

  it('addPoints valida que los puntos no puedan ser 0', async () => {
    const client = clientWith({})

    await expect(
      addPoints(client as never, 'org-1', { customer_id: 5, points: 0 }),
    ).rejects.toThrow('Los puntos no pueden ser 0')
  })

  it('addPoints lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insertEntry: () => ({ error: new Error('viola RLS') }) })

    await expect(
      addPoints(client as never, 'org-1', { customer_id: 5, points: 100 }),
    ).rejects.toThrow('viola RLS')
  })

  it('getLoyaltySummary agrega los puntos por cliente y ordena de mayor a menor', async () => {
    const client = clientWith({
      listCustomers: () => ({
        data: [
          { id: 1, name: 'Ana' },
          { id: 2, name: 'Bruno' },
        ],
      }),
      listEntries: () => ({
        data: [
          { id: 1, customer_id: 1, points: 50 },
          { id: 2, customer_id: 2, points: 200 },
          { id: 3, customer_id: 1, points: 25 },
        ],
      }),
    })

    const summaries = await getLoyaltySummary(client as never, 'org-1')

    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toEqual({ customer_id: 2, customer_name: 'Bruno', points: 200 })
    expect(summaries[1]).toEqual({ customer_id: 1, customer_name: 'Ana', points: 75 })
  })

  it('getLoyaltySummary incluye clientes sin entradas con 0 puntos', async () => {
    const client = clientWith({
      listCustomers: () => ({ data: [{ id: 1, name: 'Ana' }] }),
      listEntries: () => ({ data: [] }),
    })

    const summaries = await getLoyaltySummary(client as never, 'org-1')
    expect(summaries).toEqual([{ customer_id: 1, customer_name: 'Ana', points: 0 }])
  })

  it('getLoyaltySummary lanza el error de la BD si falla la consulta de entradas', async () => {
    const client = clientWith({ listEntries: () => ({ error: new Error('db down') }) })

    await expect(getLoyaltySummary(client as never, 'org-1')).rejects.toThrow('db down')
  })
})
