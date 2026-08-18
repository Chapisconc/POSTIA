import { describe, expect, it, vi } from 'vitest'
import { createDelivery, listDeliveries, updateDeliveryStatus } from './delivery'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
  update?: () => { data?: Row[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(handlers.update?.() ?? { data: [], error: null }),
      }),
    }),
  })
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(handlers.insert?.() ?? { data: [], error: null }),
  })
  return {
    from: (table: string) => {
      if (table !== 'deliveries') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ...(listResult ?? { data: [], error: null }),
            order: vi.fn().mockResolvedValue(listResult ?? { data: [], error: null }),
          }),
        }),
        insert: insertMock,
        update: updateMock,
      }
    },
  }
}

describe('servicio de entregas', () => {
  it('listDeliveries devuelve las entregas de la organización', async () => {
    const rows: Row[] = [
      { id: 1, order_id: 10, status: 'asignado', courier: 'Juan' },
      { id: 2, order_id: 11, status: 'entregado', courier: 'Ana' },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const deliveries = await listDeliveries(client as never, 'org-1')
    expect(deliveries).toHaveLength(2)
    expect(deliveries[0].status).toBe('asignado')
  })

  it('listDeliveries lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listDeliveries(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createDelivery inserta una entrega y devuelve la fila creada', async () => {
    const created: Row = {
      id: 7,
      order_id: 42,
      courier: 'Juan',
      note: 'Entregar en caja 3',
      status: 'asignado',
      organization_id: 'org-1',
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const delivery = await createDelivery(client as never, 'org-1', {
      order_id: 42,
      courier: 'Juan',
      note: 'Entregar en caja 3',
    })

    expect(delivery?.order_id).toBe(42)
    expect(delivery?.courier).toBe('Juan')
    expect(delivery?.note).toBe('Entregar en caja 3')
  })

  it('createDelivery valida que el pedido sea obligatorio', async () => {
    const client = clientWith({})

    await expect(
      createDelivery(client as never, 'org-1', { order_id: 0 }),
    ).rejects.toThrow('El pedido es obligatorio')
  })

  it('createDelivery lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createDelivery(client as never, 'org-1', { order_id: 42 }),
    ).rejects.toThrow('viola RLS')
  })

  it('updateDeliveryStatus actualiza el estado de la entrega', async () => {
    const updated: Row = { id: 7, order_id: 42, status: 'en_camino' }
    const client = clientWith({ update: () => ({ data: [updated] }) })

    const delivery = await updateDeliveryStatus(client as never, 'org-1', 7, 'en_camino')
    expect(delivery?.status).toBe('en_camino')
  })

  it('updateDeliveryStatus setea delivered_at cuando el estado es entregado', async () => {
    const updated: Row = { id: 7, order_id: 42, status: 'entregado', delivered_at: '2026-08-06T12:00:00Z' }
    const client = clientWith({ update: () => ({ data: [updated] }) })

    await updateDeliveryStatus(client as never, 'org-1', 7, 'entregado')

    const updateSpy = (client.from('deliveries') as { update: ReturnType<typeof vi.fn> }).update
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'entregado', delivered_at: expect.any(String) }),
    )
  })

  it('updateDeliveryStatus valida que el estado sea válido', async () => {
    const client = clientWith({})

    await expect(
      updateDeliveryStatus(client as never, 'org-1', 7, 'pendiente' as never),
    ).rejects.toThrow('Estado de entrega inválido')
  })

  it('updateDeliveryStatus lanza el error de la BD si falla', async () => {
    const client = clientWith({ update: () => ({ error: new Error('viola RLS') }) })

    await expect(
      updateDeliveryStatus(client as never, 'org-1', 7, 'asignado'),
    ).rejects.toThrow('viola RLS')
  })
})
