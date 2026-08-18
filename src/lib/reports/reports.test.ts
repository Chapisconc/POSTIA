import { describe, expect, it } from 'vitest'
import { getSalesReport, type SalesReport } from './reports'

type Row = Record<string, unknown>

function reportClient(handlers: {
  orders?: () => { data?: Row[]; error?: unknown }
  statuses?: () => { data?: Row[]; error?: unknown }
  methods?: () => { data?: Row[]; error?: unknown }
}) {
  return {
    from: (table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(handlers.orders?.() ?? { data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'order_statuses' || table === 'payment_methods') {
        const handler = table === 'order_statuses' ? handlers.statuses : handlers.methods
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(handler?.() ?? { data: [], error: null }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

describe('getSalesReport', () => {
  const payableStatus = { id: 4, key: 'pagado', label: 'Pagado', position: 4, permite_cobro: true }
  const openStatus = { id: 1, key: 'nuevo', label: 'Nuevo', position: 0, permite_cobro: false }

  it('suma solo los pedidos pagados y agrupa por método de pago', async () => {
    const client = reportClient({
      orders: () => ({
        data: [
          { id: 1, status_id: 4, payment_method_id: 1, subtotal: 100, tax: 16, total: 116 },
          { id: 2, status_id: 4, payment_method_id: 2, subtotal: 50, tax: 8, total: 58 },
          { id: 3, status_id: 1, payment_method_id: null, subtotal: 30, tax: 4.8, total: 34.8 },
        ],
        error: null,
      }),
      statuses: () => ({ data: [openStatus, payableStatus], error: null }),
      methods: () => ({
        data: [
          { id: 1, key: 'efectivo', label: 'Efectivo', position: 0 },
          { id: 2, key: 'tarjeta', label: 'Tarjeta', position: 1 },
        ],
        error: null,
      }),
    })

    const report = (await getSalesReport(client as never, 'org-1')) as SalesReport
    expect(report.count).toBe(2)
    expect(report.subtotal).toBe(150)
    expect(report.tax).toBe(24)
    expect(report.total).toBe(174)
    expect(report.byPaymentMethod).toHaveLength(2)
    expect(report.byPaymentMethod[0]).toMatchObject({ label: 'Efectivo', total: 116, count: 1 })
    expect(report.byPaymentMethod[1]).toMatchObject({ label: 'Tarjeta', total: 58, count: 1 })
  })

  it('devuelve ceros si no hay pedidos pagados', async () => {
    const client = reportClient({
      orders: () => ({
        data: [
          { id: 3, status_id: 1, payment_method_id: null, subtotal: 30, tax: 4.8, total: 34.8 },
        ],
        error: null,
      }),
      statuses: () => ({ data: [openStatus, payableStatus], error: null }),
      methods: () => ({ data: [], error: null }),
    })

    const report = (await getSalesReport(client as never, 'org-1')) as SalesReport
    expect(report.count).toBe(0)
    expect(report.total).toBe(0)
    expect(report.byPaymentMethod).toEqual([])
  })

  it('etiqueta el método de pago con su label de la BD', async () => {
    const client = reportClient({
      orders: () => ({
        data: [
          { id: 1, status_id: 4, payment_method_id: 7, subtotal: 100, tax: 0, total: 100 },
        ],
        error: null,
      }),
      statuses: () => ({ data: [payableStatus], error: null }),
      methods: () => ({ data: [{ id: 7, key: 'transferencia', label: 'Transferencia', position: 0 }], error: null }),
    })

    const report = (await getSalesReport(client as never, 'org-1')) as SalesReport
    expect(report.byPaymentMethod[0].label).toBe('Transferencia')
  })

  it('propaga errores de la BD', async () => {
    const client = reportClient({
      orders: () => ({ error: new Error('db down') }),
      statuses: () => ({ data: [], error: null }),
      methods: () => ({ data: [], error: null }),
    })

    await expect(getSalesReport(client as never, 'org-1')).rejects.toThrow('db down')
  })
})
