// Agregados para Dashboard y Reportes.
import { readState } from './storage'
import { todayKey } from './format'

const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0)

export function paidOrders(s = readState(), from, to) {
  return s.orders.filter((o) => o.paid && (!from || new Date(o.paidAt) >= from) && (!to || new Date(o.paidAt) <= to))
}
export function activeOrders(s = readState()) {
  return s.orders.filter((o) => o.status !== 'finalizado' && o.status !== 'cancelado')
}
export function isToday(iso, ref = new Date()) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
}

export function todayStats(s = readState()) {
  const today = paidOrders(s).filter((o) => isToday(o.paidAt))
  const unitsSold = sum(today, (o) => sum(o.items, (i) => i.qty))
  const salesTotal = sum(today, (o) => o.total)
  const active = activeOrders(s)
  const porCobrar = active.filter((o) => o.status === 'porcobrar' || (o.status === 'listo' && o.serviceType === 'mesa'))
  const mesasOcupadas = s.tables.filter((t) => t.status !== 'libre').length
  const lowInventory = s.inventoryItems.filter((i) => i.stock <= i.minStock)
  const agotados = s.products.filter((p) => !p.available)
  const atrasados = active.filter((o) => o.kitchenStatus !== 'entregado' && (Date.now() - new Date(o.createdAt)) > 15 * 60 * 1000)
  const cajaOpen = s.caja.sessions.some((c) => c.status === 'abierta')
  const cajaDiff = s.caja.sessions.filter((c) => c.status === 'cerrada' && c.difference && Math.abs(c.difference) > 0.01).slice(-1)[0]
  return {
    salesToday: salesTotal,
    ordersToday: today.length,
    avgTicket: today.length ? salesTotal / today.length : 0,
    unitsSold,
    countNuevo: active.filter((o) => o.status === 'nuevo').length,
    countPreparando: active.filter((o) => o.status === 'preparando').length,
    countListo: active.filter((o) => o.status === 'listo').length,
    countPorCobrar: porCobrar.length,
    countDomicilios: active.filter((o) => o.serviceType === 'domicilio').length,
    mesasOcupadas, mesasTotal: s.tables.length,
    lowInventory, agotados, atrasados,
    cajaOpen, cajaDiff,
  }
}

export function salesByHour(s = readState(), dateKey = todayKey()) {
  const hours = []
  // 7am–23pm cubre desayuno/comedor y cierre; antes de las 7 no hay ventas típicas
  for (let h = 7; h <= 23; h++) {
    const key = `${dateKey}T${String(h).padStart(2, '0')}:`
    const sales = s.orders.filter((o) => o.paid && o.paidAt && o.paidAt.startsWith(key))
    const label = `${h}:00`.replace('07:00', '7a').replace('12:00', '12p')
      .replace(/^(\d+):00$/, (_, n) => (n >= 13 ? `${n - 12}p` : `${n}a`))
    hours.push({ hour: `${h}:00`, label, value: sum(sales, (o) => o.total) })
  }
  return hours
}

export function salesByDay(s = readState(), days = 14) {
  const map = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    map[k] = { date: k, ventas: 0, pedidos: 0 }
  }
  for (const o of s.orders) {
    if (!o.paid || !o.paidAt) continue
    const k = new Date(o.paidAt).toISOString().slice(0, 10)
    if (map[k]) { map[k].ventas += o.total; map[k].pedidos += 1 }
  }
  return Object.values(map).map((m) => ({ ...m, label: new Date(m.date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }))
}

export function salesByWeek(s = readState(), weeks = 8) {
  const map = {}
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i * 7)
    const k = d.toISOString().slice(0, 10)
    map[k] = { date: k, ventas: 0, pedidos: 0 }
  }
  const keys = Object.keys(map)
  for (const o of s.orders) {
    if (!o.paid || !o.paidAt) continue
    const k = new Date(o.paidAt).toISOString().slice(0, 10)
    const wk = keys.find((x) => k >= x && k < new Date(new Date(x).getTime() + 7 * 864e5).toISOString().slice(0, 10))
    if (wk) { map[wk].ventas += o.total; map[wk].pedidos += 1 }
  }
  return Object.values(map).map((m) => ({ ...m, label: new Date(m.date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }))
}

export function salesByMonth(s = readState(), months = 6) {
  const map = {}
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map[k] = { date: k, ventas: 0, pedidos: 0, label: d.toLocaleDateString('es-MX', { month: 'short' }) }
  }
  for (const o of s.orders) {
    if (!o.paid || !o.paidAt) continue
    const k = o.paidAt.slice(0, 7)
    if (map[k]) { map[k].ventas += o.total; map[k].pedidos += 1 }
  }
  return Object.values(map)
}

export function salesByPayment(s = readState(), from, to) {
  const map = {}
  for (const o of paidOrders(s, from, to)) {
    const m = o.payment || 'otro'
    map[m] = (map[m] || 0) + o.total
  }
  const labels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' }
  return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }))
}

export function topProducts(s = readState(), n = 10, from, to) {
  const map = {}
  for (const o of paidOrders(s, from, to)) {
    for (const it of o.items) {
      if (!map[it.productId]) map[it.productId] = { id: it.productId, name: it.name, emoji: it.emoji, qty: 0, revenue: 0, cost: 0 }
      map[it.productId].qty += it.qty
      map[it.productId].revenue += it.lineTotal
      const p = s.products.find((x) => x.id === it.productId)
      map[it.productId].cost += (p?.cost || 0) * it.qty
    }
  }
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, n).map((x) => ({ ...x, profit: x.revenue - x.cost }))
}

export function ordersByStatus(s = readState()) {
  const map = {}
  for (const o of s.orders) map[o.status] = (map[o.status] || 0) + 1
  return Object.entries(map).map(([k, v]) => ({ name: k, value: v }))
}
export function ordersByType(s = readState()) {
  const map = {}
  for (const o of s.orders) map[o.serviceType] = (map[o.serviceType] || 0) + 1
  return Object.entries(map).map(([k, v]) => ({ name: k, value: v }))
}

export function categoryStats(s = readState(), from, to) {
  const map = {}
  for (const o of paidOrders(s, from, to)) {
    for (const it of o.items) {
      const p = s.products.find((x) => x.id === it.productId)
      const cid = p?.categoryId || 'none'
      if (!map[cid]) map[cid] = { categoryId: cid, name: s.categories.find((c) => c.id === cid)?.name || 'General', qty: 0, revenue: 0 }
      map[cid].qty += it.qty
      map[cid].revenue += it.lineTotal
    }
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue)
}

export function tableStats(s = readState()) {
  const byStatus = { libre: 0, ocupada: 0, cuenta: 0, pagada: 0 }
  for (const t of s.tables) byStatus[t.status] = (byStatus[t.status] || 0) + 1
  return byStatus
}

export function deliveryStats(s = readState(), from, to) {
  const doms = s.orders.filter((o) => (o.serviceType === 'domicilio' || o.serviceType === 'menudigital') && (!from || new Date(o.createdAt) >= from) && (!to || new Date(o.createdAt) <= to))
  return {
    total: doms.length,
    entregados: doms.filter((o) => o.status === 'finalizado' || o.status === 'entregado').length,
    cancelados: doms.filter((o) => o.status === 'cancelado').length,
    enCamino: doms.filter((o) => o.riderId && o.status !== 'finalizado' && o.status !== 'cancelado').length,
    revenue: sum(doms.filter((o) => o.paid), (o) => o.total),
  }
}

export function clientStatsAll(s = readState()) {
  return s.clients.map((c) => {
    const orders = s.orders.filter((o) => o.client?.id === c.id && o.paid)
    const spent = sum(orders, (o) => o.total)
    return {
      ...c,
      ordersCount: orders.length,
      totalSpent: spent,
      avgTicket: orders.length ? spent / orders.length : 0,
      lastOrder: orders.length ? orders.reduce((a, b) => (new Date(b.paidAt) > new Date(a.paidAt) ? b : a)).paidAt : null,
    }
  }).sort((a, b) => b.totalSpent - a.totalSpent)
}

export function expenseStats(s = readState(), from, to) {
  let total = 0
  const byConcept = {}
  for (const c of s.caja.sessions) {
    for (const e of c.expenses) {
      if (from && new Date(e.date) < from) continue
      if (to && new Date(e.date) > to) continue
      total += e.amount
      byConcept[e.concept] = (byConcept[e.concept] || 0) + e.amount
    }
  }
  return { total, byConcept: Object.entries(byConcept).sort((a, b) => b[1] - a[1]) }
}

export function inventoryLow(s = readState()) {
  return s.inventoryItems.filter((i) => i.stock <= i.minStock)
}

export function rangeFrom(period) {
  const now = new Date()
  const start = new Date(now)
  if (period === 'hoy') { start.setHours(0, 0, 0, 0); return { from: start, to: new Date() } }
  if (period === 'ayer') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setHours(23, 59, 59, 999); return { from: start, to: end } }
  if (period === 'semana') { const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0); return { from: start, to: new Date() } }
  if (period === 'mes') { start.setDate(1); start.setHours(0, 0, 0, 0); return { from: start, to: new Date() } }
  return { from: null, to: null }
}
