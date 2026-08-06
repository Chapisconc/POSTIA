import { describe, expect, it, vi } from 'vitest'
import { handleAddPointsRequest, handleGetLoyaltySummaryRequest } from './loyalty-handler'

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

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('handlers de puntos (lealtad)', () => {
  it('handleGetLoyaltySummaryRequest responde 200 con los resúmenes', async () => {
    const client = clientWith({
      listCustomers: () => ({ data: [{ id: 1, name: 'Ana' }] }),
      listEntries: () => ({ data: [{ id: 1, customer_id: 1, points: 50 }] }),
    })
    const response = await handleGetLoyaltySummaryRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([{ customer_id: 1, customer_name: 'Ana', points: 50 }])
  })

  it('handleGetLoyaltySummaryRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ listEntries: () => ({ error: new Error('db down') }) })
    const response = await handleGetLoyaltySummaryRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleAddPointsRequest responde 201 al agregar puntos', async () => {
    const client = clientWith({
      insertEntry: () => ({ data: [{ id: 1, customer_id: 5, points: 100 }] }),
    })
    const response = await handleAddPointsRequest(
      'org-1',
      client as never,
      jsonRequest({ customer_id: 5, points: 100, reason: 'Compra' }),
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.points).toBe(100)
  })

  it('handleAddPointsRequest responde 400 si falta el cliente', async () => {
    const client = clientWith({})
    const response = await handleAddPointsRequest(
      'org-1',
      client as never,
      jsonRequest({ customer_id: 0, points: 100 }),
    )
    expect(response.status).toBe(400)
  })

  it('handleAddPointsRequest responde 400 si los puntos son 0', async () => {
    const client = clientWith({})
    const response = await handleAddPointsRequest(
      'org-1',
      client as never,
      jsonRequest({ customer_id: 5, points: 0 }),
    )
    expect(response.status).toBe(400)
  })

  it('handleAddPointsRequest responde 400 con body inválido', async () => {
    const client = clientWith({})
    const response = await handleAddPointsRequest(
      'org-1',
      client as never,
      { json: async () => { throw new Error('bad json') } } as unknown as Request,
    )
    expect(response.status).toBe(400)
  })

  it('handleAddPointsRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ insertEntry: () => ({ error: new Error('db down') }) })
    const response = await handleAddPointsRequest(
      'org-1',
      client as never,
      jsonRequest({ customer_id: 5, points: 100 }),
    )
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
