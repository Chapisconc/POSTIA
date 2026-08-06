import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateCustomerRequest,
  handleListCustomersRequest,
} from './customers-handler'

function clientWith(handlers: {
  list?: () => { data?: Record<string, unknown>[]; error?: unknown }
  insert?: () => { data?: Record<string, unknown>[]; error?: unknown }
}) {
  const listResult = handlers.list?.()
  return {
    from: (table: string) => {
      if (table !== 'customers') throw new Error(`tabla inesperada: ${table}`)
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

describe('handlers de clientes', () => {
  it('handleListCustomersRequest responde 200 con los clientes', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, name: 'Ana' }] }),
    })
    const response = await handleListCustomersRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListCustomersRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListCustomersRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateCustomerRequest responde 201 con el cliente creado', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 5, name: 'Ana', email: 'ana@correo.mx' }] }),
    })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana', email: 'ana@correo.mx' }),
    })
    const response = await handleCreateCustomerRequest('org-1', client as never, request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('Ana')
  })

  it('handleCreateCustomerRequest responde 400 si falta el nombre', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '  ' }),
    })
    const response = await handleCreateCustomerRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })

  it('handleCreateCustomerRequest responde 400 con correo inválido', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana', email: 'no-es-correo' }),
    })
    const response = await handleCreateCustomerRequest('org-1', client as never, request)
    expect(response.status).toBe(400)
  })
})
