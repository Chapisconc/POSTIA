import { describe, expect, test, beforeEach } from 'vitest'
import {
  resetAll, readState, writeState, createOrder, setKitchenStatus,
} from './storage.js'

const user = { name: 'Tester', role: 'admin' }

function makeOrder(serviceType) {
  const state = createOrder({
    serviceType,
    items: [{ id: 'i1', productId: 'p1', name: 'Producto', emoji: '🍔', qty: 1, price: 100, unitBase: 100, modifiers: [], note: '', lineTotal: 100, saved: 0 }],
    createdBy: user,
  })
  // createOrder devuelve el estado completo; el pedido nuevo es el último en el array
  return state.orders[state.orders.length - 1]
}

function toReady(serviceType) {
  const order = makeOrder(serviceType)
  setKitchenStatus(order.id, 'preparando', user)
  setKitchenStatus(order.id, 'listo', user)
  return order
}

describe('createOrder - folio diario', () => {
  beforeEach(() => { resetAll() })

  test('los folios reinician en #1 cada día', () => {
    const a = makeOrder('mostrador')
    const b = makeOrder('domicilio')
    expect(a.folio).toBe(1)
    expect(b.folio).toBe(2)
    expect(a.folioDate).toBe(new Date().toISOString().slice(0, 10))
  })

  test('el folio local nunca colisiona con un pedido de hoy ya existente (previene 409 orders_folio_idx)', () => {
    const s = readState()
    s.orders.push({ id: 'hoy-1', folio: 5, folioDate: new Date().toISOString().slice(0, 10), status: 'finalizado', kitchenStatus: 'entregado', items: [], serviceType: 'mostrador' })
    writeState(s)
    const o = makeOrder('mostrador')
    expect(o.folio).toBeGreaterThan(5)
    expect(o.folio).toBe(6)
  })
})

describe('setKitchenStatus - flujo de pedidos', () => {
  beforeEach(() => { resetAll() })

  test('al entregar un pedido de mostrador listo, pasa a porcobrar', () => {
    const order = toReady('mostrador')
    setKitchenStatus(order.id, 'entregado', user)
    const after = readState().orders.find((o) => o.id === order.id)
    expect(after.status).toBe('porcobrar')
    expect(after.kitchenStatus).toBe('entregado')
  })

  test('al entregar un pedido de mesa listo, pasa a porcobrar', () => {
    const order = toReady('mesa')
    setKitchenStatus(order.id, 'entregado', user)
    const after = readState().orders.find((o) => o.id === order.id)
    expect(after.status).toBe('porcobrar')
  })

  test('un pedido de domicilio listo NO pasa a porcobrar (espera repartidor)', () => {
    const order = toReady('domicilio')
    const after = readState().orders.find((o) => o.id === order.id)
    expect(after.status).toBe('listo')
    expect(after.kitchenStatus).toBe('listo')
  })

  test('un pedido de menú digital listo NO pasa a porcobrar', () => {
    const order = toReady('menudigital')
    const after = readState().orders.find((o) => o.id === order.id)
    expect(after.status).toBe('listo')
  })

  test('cocinaStatus preparando cambia status nuevo -> preparando', () => {
    const order = makeOrder('mostrador')
    expect(order.status).toBe('preparando')
    setKitchenStatus(order.id, 'preparando', user)
    const after = readState().orders.find((o) => o.id === order.id)
    expect(after.kitchenStatus).toBe('preparando')
  })
})
