import { describe, expect, it, vi } from 'vitest'
import {
  closeRegister,
  getActiveRegister,
  listRegisters,
  openRegister,
} from './caja'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  active?: () => { data?: Row | null; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
  update?: () => { data?: Row[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  const activeResult = handlers.active?.()
  type Chain = {
    eq: ReturnType<typeof vi.fn>
    is: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
  const chain: Partial<Chain> = {}
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockResolvedValue(listResult ?? { data: [], error: null })
  chain.maybeSingle = vi.fn().mockResolvedValue(activeResult ?? { data: null, error: null })
  const fullChain = chain as Chain
  return {
    from: (table: string) => {
      if (table !== 'cash_registers') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: vi.fn().mockReturnValue(fullChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(handlers.insert?.() ?? { data: [], error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(handlers.update?.() ?? { data: [], error: null }),
          }),
        }),
      }
    },
  }
}

describe('servicio de caja', () => {
  it('listRegisters devuelve los registros de la organización', async () => {
    const rows: Row[] = [
      { id: 1, opening_amount: 500, status: 'cerrada' },
      { id: 2, opening_amount: 800, status: 'cerrada' },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const registers = await listRegisters(client as never, 'org-1')
    expect(registers).toHaveLength(2)
  })

  it('listRegisters lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listRegisters(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('getActiveRegister devuelve la caja abierta', async () => {
    const active: Row = { id: 3, opening_amount: 500, status: 'abierta', closed_at: null }
    const client = clientWith({ active: () => ({ data: active }) })

    const register = await getActiveRegister(client as never, 'org-1')
    expect(register?.id).toBe(3)
    expect(register?.status).toBe('abierta')
  })

  it('openRegister inserta una caja abierta y devuelve la fila creada', async () => {
    const created: Row = {
      id: 10,
      opening_amount: 1000,
      status: 'abierta',
      opened_by: 'user-1',
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const register = await openRegister(client as never, 'org-1', 1000, 'user-1')
    expect(register.id).toBe(10)
    expect(register.opening_amount).toBe(1000)
  })

  it('openRegister falla si ya hay una caja abierta', async () => {
    const client = clientWith({
      active: () => ({ data: { id: 1, status: 'abierta', closed_at: null } }),
    })

    await expect(openRegister(client as never, 'org-1', 500, 'user-1')).rejects.toThrow(
      'Ya hay una caja abierta',
    )
  })

  it('openRegister valida que el monto inicial no sea negativo', async () => {
    const client = clientWith({})

    await expect(openRegister(client as never, 'org-1', -5, 'user-1')).rejects.toThrow(
      'El monto inicial no puede ser negativo',
    )
  })

  it('openRegister lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(openRegister(client as never, 'org-1', 500, 'user-1')).rejects.toThrow(
      'viola RLS',
    )
  })

  it('closeRegister cierra la caja abierta y devuelve la fila actualizada', async () => {
    const closed: Row = {
      id: 1,
      opening_amount: 500,
      closing_amount: 900,
      status: 'cerrada',
      closed_at: '2026-08-06T10:00:00.000Z',
    }
    const client = clientWith({
      active: () => ({ data: { id: 1, status: 'abierta', closed_at: null } }),
      update: () => ({ data: [closed] }),
    })

    const register = await closeRegister(client as never, 'org-1', 900, 'user-1')
    expect(register.status).toBe('cerrada')
    expect(register.closing_amount).toBe(900)
  })

  it('closeRegister falla si no hay caja abierta', async () => {
    const client = clientWith({ active: () => ({ data: null }) })

    await expect(closeRegister(client as never, 'org-1', 900, 'user-1')).rejects.toThrow(
      'No hay caja abierta para cerrar',
    )
  })

  it('closeRegister valida que el monto de cierre no sea negativo', async () => {
    const client = clientWith({})

    await expect(closeRegister(client as never, 'org-1', -1, 'user-1')).rejects.toThrow(
      'El monto de cierre no puede ser negativo',
    )
  })

  it('closeRegister lanza el error de la BD si el update falla', async () => {
    const client = clientWith({
      active: () => ({ data: { id: 1, status: 'abierta', closed_at: null } }),
      update: () => ({ error: new Error('db down') }),
    })

    await expect(closeRegister(client as never, 'org-1', 900, 'user-1')).rejects.toThrow(
      'db down',
    )
  })
})
