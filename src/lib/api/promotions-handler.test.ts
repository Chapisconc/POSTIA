import { describe, expect, it, vi } from 'vitest'
import {
  handleCreatePromotionRequest,
  handleListPromotionsRequest,
  handleTogglePromotionRequest,
} from './promotions-handler'

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

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('handlers de promociones', () => {
  it('handleListPromotionsRequest responde 200 con las promociones', async () => {
    const client = clientWith({ list: () => ({ data: [{ id: 1, name: '2x1' }] }) })
    const response = await handleListPromotionsRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListPromotionsRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListPromotionsRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreatePromotionRequest responde 201 con la promoción creada', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 1, name: '2x1', discount_type: 'porcentaje', value: 50 }] }),
    })
    const response = await handleCreatePromotionRequest(
      'org-1',
      client as never,
      jsonRequest({ name: '2x1', discount_type: 'porcentaje', value: 50 }),
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('2x1')
  })

  it('handleCreatePromotionRequest responde 400 si falta el nombre', async () => {
    const client = clientWith({})
    const response = await handleCreatePromotionRequest(
      'org-1',
      client as never,
      jsonRequest({ name: '  ', discount_type: 'fijo', value: 10 }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreatePromotionRequest responde 400 con tipo de descuento inválido', async () => {
    const client = clientWith({})
    const response = await handleCreatePromotionRequest(
      'org-1',
      client as never,
      jsonRequest({ name: 'X', discount_type: 'gratis', value: 10 }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreatePromotionRequest responde 400 con valor negativo', async () => {
    const client = clientWith({})
    const response = await handleCreatePromotionRequest(
      'org-1',
      client as never,
      jsonRequest({ name: 'X', discount_type: 'fijo', value: -1 }),
    )
    expect(response.status).toBe(400)
  })

  it('handleTogglePromotionRequest responde 200 al alternar', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, active: true }] }),
      update: () => ({ data: [{ id: 1, active: false }] }),
    })
    const response = await handleTogglePromotionRequest('org-1', client as never, 1)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.active).toBe(false)
  })

  it('handleTogglePromotionRequest responde 404 si la promoción no existe', async () => {
    const client = clientWith({ list: () => ({ data: [] }) })
    const response = await handleTogglePromotionRequest('org-1', client as never, 99)
    expect(response.status).toBe(404)
  })

  it('handleTogglePromotionRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({
      list: () => ({ data: [{ id: 1, active: true }] }),
      update: () => ({ error: new Error('db down') }),
    })
    const response = await handleTogglePromotionRequest('org-1', client as never, 1)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
