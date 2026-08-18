import { describe, it, expect } from 'vitest'
import { salesByHour } from './stats'

describe('salesByHour', () => {
  it('includes hour 7 (breakfast) so early seed sales are counted', () => {
    const state = {
      orders: [
        { paid: true, paidAt: '2026-08-18T07:48:54.939+00:00', total: 120 },
        { paid: true, paidAt: '2026-08-18T07:55:00.000+00:00', total: 3000 },
        { paid: true, paidAt: '2026-08-18T14:00:00.000Z', total: 500 },
      ],
    }
    const h = salesByHour(state, '2026-08-18')
    const at7 = h.find((x) => x.hour === '7:00')
    const at14 = h.find((x) => x.hour === '14:00')
    expect(at7.value).toBe(3120)
    expect(at14.value).toBe(500)
  })
})
