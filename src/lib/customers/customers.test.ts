import { describe, expect, it, vi } from 'vitest'
import { createCustomer, listCustomers } from './customers'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table !== 'customers') throw new Error(`tabla inesperada: ${table}`)
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

describe('servicio de clientes', () => {
  it('listCustomers devuelve los clientes de la organización ordenados por nombre', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Ana', email: 'ana@correo.mx' },
      { id: 2, name: 'Bruno', email: null },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const customers = await listCustomers(client as never, 'org-1')
    expect(customers).toHaveLength(2)
  })

  it('listCustomers lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listCustomers(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createCustomer inserta un cliente y devuelve la fila creada', async () => {
    const created: Row = {
      id: 10,
      name: 'María López',
      email: 'maria@correo.mx',
      phone: '3312345678',
      organization_id: 'org-1',
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const customer = await createCustomer(client as never, 'org-1', {
      name: 'María López',
      email: 'maria@correo.mx',
      phone: '3312345678',
    })

    expect(customer?.name).toBe('María López')
    expect(customer?.phone).toBe('3312345678')
  })

  it('createCustomer valida que el nombre no esté vacío', async () => {
    const client = clientWith({})

    await expect(
      createCustomer(client as never, 'org-1', { name: '  ' }),
    ).rejects.toThrow('El nombre del cliente es obligatorio')
  })

  it('createCustomer valida el formato del correo si se envía', async () => {
    const client = clientWith({})

    await expect(
      createCustomer(client as never, 'org-1', { name: 'Ana', email: 'no-es-correo' }),
    ).rejects.toThrow('El correo no es válido')
  })

  it('createCustomer lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createCustomer(client as never, 'org-1', { name: 'Ana' }),
    ).rejects.toThrow('viola RLS')
  })
})
