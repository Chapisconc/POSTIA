import { describe, expect, it, vi } from 'vitest'
import {
  handleCloseCajaRequest,
  handleListCajaRequest,
  handleOpenCajaRequest,
} from './caja-handler'

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

describe('handlers de caja', () => {
  it('handleListCajaRequest responde 200 con los registros', async () => {
    const client = clientWith({
      list: () => ({ data: [{ id: 1, opening_amount: 500, status: 'cerrada' }] }),
    })
    const response = await handleListCajaRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListCajaRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ list: () => ({ error: new Error('db down') }) })
    const response = await handleListCajaRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleOpenCajaRequest responde 201 con la caja abierta', async () => {
    const client = clientWith({
      insert: () => ({ data: [{ id: 1, opening_amount: 500, status: 'abierta' }] }),
    })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ opening_amount: 500 }),
    })
    const response = await handleOpenCajaRequest('org-1', client as never, 'user-1', request)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.opening_amount).toBe(500)
  })

  it('handleOpenCajaRequest responde 400 si ya hay una caja abierta', async () => {
    const client = clientWith({
      active: () => ({ data: { id: 1, status: 'abierta', closed_at: null } }),
    })
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ opening_amount: 500 }),
    })
    const response = await handleOpenCajaRequest('org-1', client as never, 'user-1', request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('abierta')
  })

  it('handleOpenCajaRequest responde 400 si el monto inicial es negativo', async () => {
    const client = clientWith({})
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ opening_amount: -50 }),
    })
    const response = await handleOpenCajaRequest('org-1', client as never, 'user-1', request)
    expect(response.status).toBe(400)
  })

  it('handleCloseCajaRequest responde 200 con la caja cerrada', async () => {
    const client = clientWith({
      active: () => ({ data: { id: 1, status: 'abierta', closed_at: null } }),
      update: () => ({
        data: [{ id: 1, opening_amount: 500, closing_amount: 900, status: 'cerrada' }],
      }),
    })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ closing_amount: 900 }),
    })
    const response = await handleCloseCajaRequest('org-1', client as never, 'user-1', request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('cerrada')
  })

  it('handleCloseCajaRequest responde 400 si no hay caja abierta', async () => {
    const client = clientWith({ active: () => ({ data: null }) })
    const request = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ closing_amount: 900 }),
    })
    const response = await handleCloseCajaRequest('org-1', client as never, 'user-1', request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('No hay caja')
  })
})
