import { describe, expect, it } from 'vitest'
import { handleCreateProductRequest, handleListProductsRequest } from './products-handler'
import type { ConfigClient } from '@/lib/config/service'

function clientWith(handlers: {
  list?: () => unknown
  insert?: () => unknown
}) {
  return {
    from: (table: string) => {
      if (table !== 'products') throw new Error(`tabla inesperada: ${table}`)
      return {
        select: () => ({
          eq: () => ({ order: () => Promise.resolve(handlers.list?.() ?? { data: [], error: null }) }),
        }),
        insert: () => ({
          select: () => Promise.resolve(handlers.insert?.() ?? { data: [], error: null }),
        }),
      }
    },
  } as unknown as ConfigClient
}

function post(body: unknown): Request {
  return new Request('http://localhost/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('handler de productos (API)', () => {
  it('GET devuelve 200 con la lista de productos', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, name: 'Torta', price: 45 }], error: null }),
    })

    const res = await handleListProductsRequest('org-1', client)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Torta')
  })

  it('GET devuelve 500 si la BD falla', async () => {
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })

    const res = await handleListProductsRequest('org-1', client)
    expect(res.status).toBe(500)
  })

  it('POST devuelve 201 con el producto creado', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 10, name: 'Tacos', price: 40 }], error: null }),
    })

    const res = await handleCreateProductRequest(
      'org-1',
      client,
      post({ name: 'Tacos', price: 40 }),
    )
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.name).toBe('Tacos')
  })

  it('POST devuelve 400 si el precio es inválido', async () => {
    const client = clientWith({})

    const res = await handleCreateProductRequest(
      'org-1',
      client,
      post({ name: 'Tacos', price: -5 }),
    )
    expect(res.status).toBe(400)
  })

  it('POST devuelve 400 si el body no es JSON', async () => {
    const client = clientWith({})

    const res = await handleCreateProductRequest(
      'org-1',
      client,
      new Request('http://localhost/api/products', { method: 'POST' }),
    )
    expect(res.status).toBe(400)
  })

  it('POST devuelve 500 si la BD falla', async () => {
    const client = clientWith({ insert: () => ({ error: new Error('viola RLS') }) })

    const res = await handleCreateProductRequest(
      'org-1',
      client,
      post({ name: 'Tacos', price: 40 }),
    )
    expect(res.status).toBe(500)
  })
})
