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
  return state.orders[0]
}

function toReady(serviceType) {
  const order = makeOrder(serviceType)
  setKitchenStatus(order.id, 'preparando', user)
  setKitchenStatus(order.id, 'listo', user)
  return order
}

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
