import { describe, expect, it, vi } from 'vitest'
import { handleSalesReportRequest } from './reports-handler'

function okClient() {
  return {
    from: (table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 1, status_id: 4, payment_method_id: 1, subtotal: 100, tax: 16, total: 116 },
                  ],
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'order_statuses') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: 4, key: 'pagado', label: 'Pagado', position: 4, permite_cobro: true }],
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'payment_methods') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: 1, key: 'efectivo', label: 'Efectivo', position: 0 }],
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  }
}

describe('handleSalesReportRequest', () => {
  it('responde 200 con el reporte', async () => {
    const response = await handleSalesReportRequest('org-1', okClient() as never)
    expect(response.status).toBe(200)
    const report = await response.json()
    expect(report.count).toBe(1)
    expect(report.total).toBe(116)
    expect(report.byPaymentMethod[0].label).toBe('Efectivo')
  })

  it('responde 500 si la BD falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({ order: () => Promise.resolve({ error: new Error('db down') }) }),
            }),
          }
        }
        if (table === 'order_statuses') {
          return {
            select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
          }
        }
        return {
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        }
      },
    }
    const response = await handleSalesReportRequest('org-1', failing as never)
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
