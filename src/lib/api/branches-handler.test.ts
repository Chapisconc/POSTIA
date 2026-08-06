import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateBranchRequest,
  handleListBranchesRequest,
} from './branches-handler'

function clientWith(handlers: {
  list?: () => { data?: Record<string, unknown>[]; error?: unknown }
  insert?: () => { data?: Record<string, unknown>[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  return {
    from: (table: string) => {
      if (table !== 'branches') throw new Error(`tabla inesperada: ${table}`)
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

function post(body: unknown): Request {
  return new Request('http://localhost/api/branches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('handlers de sucursales', () => {
  it('handleListBranchesRequest responde 200 con las sucursales', async () => {
    const client = clientWith({ list: () => ({ data: [{ id: 1, name: 'Centro' }] }) })
    const response = await handleListBranchesRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListBranchesRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListBranchesRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateBranchRequest responde 201 con la sucursal creada', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 5, name: 'Centro', address: 'Av. Juárez 12' }] }),
    })
    const response = await handleCreateBranchRequest(
      'org-1',
      client as never,
      post({ name: 'Centro', address: 'Av. Juárez 12' }),
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('Centro')
  })

  it('handleCreateBranchRequest responde 400 si falta el nombre', async () => {
    const client = clientWith({})
    const response = await handleCreateBranchRequest(
      'org-1',
      client as never,
      post({ name: '  ' }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreateBranchRequest responde 400 si el body no es JSON', async () => {
    const client = clientWith({})
    const response = await handleCreateBranchRequest(
      'org-1',
      client as never,
      new Request('http://localhost/api/branches', { method: 'POST' }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreateBranchRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })
    const response = await handleCreateBranchRequest(
      'org-1',
      client as never,
      post({ name: 'Centro' }),
    )
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
