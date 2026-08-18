import { describe, expect, it, vi } from 'vitest'
import { createInvoice, listInvoices, markInvoiceIssued } from './invoices'

type Row = Record<string, unknown>

const PAYABLE_STATUSES: Row[] = [
  { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, permite_cobro: false },
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

const CHARGED_ORDER: Row = {
  id: 10,
  organization_id: 'org-1',
  status_id: 2,
  total: 120,
  created_at: '2026-08-06T00:00:00.000Z',
  updated_at: '2026-08-06T00:00:00.000Z',
}

describe('servicio de facturación', () => {
  it('listInvoices devuelve las facturas de la organización', async () => {
    const rows: Row[] = [{ id: 1, order_id: 10, rfc: 'XAXX010101000' }]
    const client = clientWith({ listInvoices: () => ({ data: rows }) })

    const invoices = await listInvoices(client as never, 'org-1')
    expect(invoices).toHaveLength(1)
    expect(invoices[0].rfc).toBe('XAXX010101000')
  })

  it('listInvoices lanza el error de la BD si falla', async () => {
    const client = clientWith({ listInvoices: () => ({ error: new Error('db down') }) })

    await expect(listInvoices(client as never, 'org-1')).rejects.toThrow('db down')
  })

  it('createInvoice inserta con cfdi_status pendiente cuando la orden está cobrada', async () => {
    const created: Row = {
      id: 1,
      organization_id: 'org-1',
      order_id: 10,
      rfc: 'XAXX010101000',
      customer_name: 'María López',
      cfdi_status: 'pendiente',
    }
    const client = clientWith({
      listOrders: () => ({ data: [CHARGED_ORDER] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
      insertInvoice: () => ({ data: [created] }),
    })

    const invoice = await createInvoice(client as never, 'org-1', {
      order_id: 10,
      rfc: 'XAXX010101000',
      customer_name: 'María López',
    })

    expect(invoice?.cfdi_status).toBe('pendiente')
    expect(invoice?.customer_name).toBe('María López')
  })

  it('createInvoice valida el formato del RFC', async () => {
    const client = clientWith({})

    await expect(
      createInvoice(client as never, 'org-1', { order_id: 10, rfc: 'no-es-rfc' }),
    ).rejects.toThrow('El RFC no es válido')
  })

  it('createInvoice valida que el pedido sea obligatorio', async () => {
    const client = clientWith({})

    await expect(
      createInvoice(client as never, 'org-1', {
        order_id: 0 as never,
        rfc: 'XAXX010101000',
      }),
    ).rejects.toThrow('El pedido es obligatorio')
  })

  it('createInvoice rechaza pedidos cuyo estado no permite cobro', async () => {
    const client = clientWith({
      listOrders: () => ({ data: [{ ...CHARGED_ORDER, status_id: 1 }] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
    })

    await expect(
      createInvoice(client as never, 'org-1', { order_id: 10, rfc: 'XAXX010101000' }),
    ).rejects.toThrow('El pedido no está cobrado')
  })

  it('createInvoice rechaza pedidos que no existen', async () => {
    const client = clientWith({
      listOrders: () => ({ data: [] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
    })

    await expect(
      createInvoice(client as never, 'org-1', { order_id: 99, rfc: 'XAXX010101000' }),
    ).rejects.toThrow('El pedido no está cobrado')
  })

  it('createInvoice lanza el error de la BD si el insert falla', async () => {
    const client = clientWith({
      listOrders: () => ({ data: [CHARGED_ORDER] }),
      listStatuses: () => ({ data: PAYABLE_STATUSES }),
      insertInvoice: () => ({ error: new Error('viola RLS') }),
    })

    await expect(
      createInvoice(client as never, 'org-1', { order_id: 10, rfc: 'XAXX010101000' }),
    ).rejects.toThrow('viola RLS')
  })

  it('markInvoiceIssued actualiza a emitida con issued_at', async () => {
    const updated: Row = {
      id: 1,
      cfdi_status: 'emitida',
      issued_at: '2026-08-06T12:00:00.000Z',
    }
    const client = clientWith({ updateInvoice: () => ({ data: [updated] }) })

    const invoice = await markInvoiceIssued(client as never, 'org-1', 1)
    expect(invoice?.cfdi_status).toBe('emitida')
    expect(invoice?.issued_at).toBeTruthy()
  })

  it('markInvoiceIssued lanza error si la factura no existe', async () => {
    const client = clientWith({ updateInvoice: () => ({ data: [] }) })

    await expect(markInvoiceIssued(client as never, 'org-1', 999)).rejects.toThrow(
      'Factura no encontrada',
    )
  })

  it('markInvoiceIssued lanza el error de la BD si falla', async () => {
    const client = clientWith({ updateInvoice: () => ({ error: new Error('db down') }) })

    await expect(markInvoiceIssued(client as never, 'org-1', 1)).rejects.toThrow('db down')
  })
})
