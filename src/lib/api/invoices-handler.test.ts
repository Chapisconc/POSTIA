import { describe, expect, it, vi } from 'vitest'
import {
  handleCreateInvoiceRequest,
  handleListInvoicesRequest,
  handleMarkInvoiceIssuedRequest,
} from './invoices-handler'

type Row = Record<string, unknown>

const PAYABLE_STATUSES: Row[] = [
  { id: 2, key: 'pagado', label: 'Pagado', position: 1, permite_cobro: true },
]

function clientWith(handlers: {
  listInvoices?: () => { data?: Row[]; error?: unknown }
  listOrders?: () => { data?: Row[]; error?: unknown }
  listStatuses?: () => { data?: Row[]; error?: unknown }
  insertInvoice?: () => { data?: Row[]; error?: unknown }
  updateInvoice?: () => { data?: Row[]; error?: unknown }
}) {
  function listResult(handler?: () => { data?: Row[]; error?: unknown }) {
    return handler?.() ?? { data: [], error: null }
  }

  return {
    from: (table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...listResult(handlers.listInvoices),
              order: vi.fn().mockResolvedValue(listResult(handlers.listInvoices)),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(listResult(handlers.insertInvoice)),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue(listResult(handlers.updateInvoice)),
              }),
            }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...listResult(handlers.listOrders),
              order: vi.fn().mockResolvedValue(listResult(handlers.listOrders)),
            }),
          }),
        }
      }
      if (table === 'order_statuses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...listResult(handlers.listStatuses),
              order: vi.fn().mockResolvedValue(listResult(handlers.listStatuses)),
            }),
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

describe('handlers de facturación', () => {
  it('handleListInvoicesRequest responde 200 con las facturas', async () => {
    const client = clientWith({
      listInvoices: () => ({ data: [{ id: 1, order_id: 10, rfc: 'XAXX010101000' }] }),
    })
    const response = await handleListInvoicesRequest('org-1', client as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
  })

  it('handleListInvoicesRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ listInvoices: () => ({ error: new Error('db down') }) })
    const response = await handleListInvoicesRequest('org-1', client as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('handleCreateInvoiceRequest responde 201 con la factura creada', async () => {
    const client = clientWith({
      listOrders: () => ({ data: [{ id: 10, status_id: 2 }] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
      insertInvoice: () => ({
        data: [{ id: 1, order_id: 10, rfc: 'XAXX010101000', cfdi_status: 'pendiente' }],
      }),
    })
    const response = await handleCreateInvoiceRequest(
      'org-1',
      client as never,
      jsonRequest({ order_id: 10, rfc: 'XAXX010101000' }),
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.rfc).toBe('XAXX010101000')
  })

  it('handleCreateInvoiceRequest responde 400 con RFC inválido', async () => {
    const client = clientWith({})
    const response = await handleCreateInvoiceRequest(
      'org-1',
      client as never,
      jsonRequest({ order_id: 10, rfc: 'invalido' }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreateInvoiceRequest responde 400 si el pedido no está cobrado', async () => {
    const client = clientWith({
      listOrders: () => ({ data: [{ id: 10, status_id: 1 }] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
    })
    const response = await handleCreateInvoiceRequest(
      'org-1',
      client as never,
      jsonRequest({ order_id: 10, rfc: 'XAXX010101000' }),
    )
    expect(response.status).toBe(400)
  })

  it('handleCreateInvoiceRequest responde 400 con body inválido', async () => {
    const client = clientWith({})
    const response = await handleCreateInvoiceRequest(
      'org-1',
      client as never,
      { json: async () => { throw new Error('bad json') } } as unknown as Request,
    )
    expect(response.status).toBe(400)
  })

  it('handleMarkInvoiceIssuedRequest responde 200 al emitir', async () => {
    const client = clientWith({
      updateInvoice: () => ({ data: [{ id: 1, cfdi_status: 'emitida' }] }),
    })
    const response = await handleMarkInvoiceIssuedRequest('org-1', client as never, 1)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cfdi_status).toBe('emitida')
  })

  it('handleMarkInvoiceIssuedRequest responde 404 si la factura no existe', async () => {
    const client = clientWith({ updateInvoice: () => ({ data: [] }) })
    const response = await handleMarkInvoiceIssuedRequest('org-1', client as never, 999)
    expect(response.status).toBe(404)
  })

  it('handleMarkInvoiceIssuedRequest responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = clientWith({ updateInvoice: () => ({ error: new Error('db down') }) })
    const response = await handleMarkInvoiceIssuedRequest('org-1', client as never, 1)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
