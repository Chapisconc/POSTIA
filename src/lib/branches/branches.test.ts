import { describe, expect, it, vi } from 'vitest'
import { createBranch, listBranches } from './branches'

type Row = Record<string, unknown>

function clientWith(handlers: {
  list?: () => { data?: Row[]; error?: unknown }
  insert?: () => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table !== 'branches') throw new Error(`tabla inesperada: ${table}`)
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

describe('servicio de sucursales', () => {
  it('listBranches devuelve las sucursales de la organización ordenadas por nombre', async () => {
    const rows: Row[] = [
      { id: 1, name: 'Centro', address: 'Av. Juárez 12', phone: '3311223344', active: true },
      { id: 2, name: 'Zapopan', address: null, phone: null, active: true },
    ]
    const client = clientWith({ list: () => ({ data: rows }) })

    const branches = await listBranches(client as never, 'org-1')
    expect(branches).toHaveLength(2)
  })

  it('listBranches lanza el error de la BD si falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    await expect(listBranches(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createBranch inserta una sucursal y devuelve la fila creada', async () => {
    const created: Row = {
      id: 10,
      name: 'Centro',
      address: 'Av. Juárez 12',
      phone: '3311223344',
      organization_id: 'org-1',
      active: true,
    }
    const client = clientWith({ insert: () => ({ data: [created] }) })

    const branch = await createBranch(client as never, 'org-1', {
      name: 'Centro',
      address: 'Av. Juárez 12',
      phone: '3311223344',
    })

    expect(branch?.name).toBe('Centro')
    expect(branch?.address).toBe('Av. Juárez 12')
    expect(branch?.phone).toBe('3311223344')
  })

  it('createBranch valida que el nombre no esté vacío', async () => {
    const client = clientWith({})

    await expect(
      createBranch(client as never, 'org-1', { name: '  ' }),
    ).rejects.toThrow('El nombre de la sucursal es obligatorio')
  })

  it('createBranch normaliza los campos opcionales vacíos a null', async () => {
    const client = clientWith({ insert: () => ({ data: [] }) })

    const branch = await createBranch(client as never, 'org-1', {
      name: 'Centro',
      address: '   ',
      phone: '',
    })

    expect(branch).toBeNull()
  })

  it('createBranch lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    await expect(
      createBranch(client as never, 'org-1', { name: 'Centro' }),
    ).rejects.toThrow('viola RLS')
  })
})
