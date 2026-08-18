// POSTIA — Capa de datos v2 — POS de restaurante completo, persistencia en localStorage.
// Sincronización con Supabase para persistencia remota y multi-dispositivo.
import {
  supabase, syncOrderToSupabase, deleteOrderFromSupabase, acquirePayLock, releasePayLock,
  syncProductToSupabase, deleteProductFromSupabase,
  syncCategoryToSupabase, deleteCategoryFromSupabase,
  syncTableToSupabase, deleteTableFromSupabase,
  syncClientToSupabase, deleteClientFromSupabase,
  syncRiderToSupabase, deleteRiderFromSupabase,
  syncUserToSupabase, deleteUserFromSupabase,
  syncSettingsToSupabase,
  syncModGroupToSupabase, deleteModGroupFromSupabase,
  syncCouponToSupabase, deleteCouponFromSupabase,
  syncCampaignToSupabase, deleteCampaignFromSupabase,
  syncSalonToSupabase, deleteSalonFromSupabase,
  syncMenuDigitalToSupabase,
  acquireOrderLock as acquireOrderLockRpc, releaseOrderLock as releaseOrderLockRpc, getMachineIdPublic,
} from './supabase-client'

const KEY = 'pdv_state_v2'
const USER_KEY = 'pdv_current_user'

// Generador de IDs tipo UUID (v4) para que el merge local↔Supabase deduplique por id.
function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
export const uid = () => uuidv4()
export const nowISO = () => new Date().toISOString()
// Lanza la sincronización remota en segundo plano sin bloquear el flujo local.
const syncBg = (fn) => { if (fn) fn().catch(e => console.error('Supabase sync error:', e?.message)) }
export const todayKey = () => new Date().toISOString().slice(0, 10)

export const ORDER_STATUS = ['nuevo', 'preparando', 'listo', 'porcobrar', 'finalizado', 'cancelado']
export const KITCHEN_STATUS = ['nuevo', 'preparando', 'listo', 'entregado']
export const SERVICE_TYPES = ['mesa', 'mostrador', 'domicilio', 'menudigital']
export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
  { id: 'qr', label: 'QR', icon: '🔳' },
]
export const ORDER_STATUS_LABEL = {
  nuevo: 'Nuevo', preparando: 'Preparando', listo: 'Listo',
  porcobrar: 'Por cobrar', finalizado: 'Finalizado', cancelado: 'Cancelado',
}
export const KITCHEN_STATUS_LABEL = { nuevo: 'Nuevo', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado' }
export const SERVICE_LABEL = { mesa: 'Mesa', mostrador: 'Mostrador', domicilio: 'Domicilio', menudigital: 'Menú digital' }

// Transiciones de estado de pedido permitidas. Una vez aceptado (ya no es
// "nuevo"/pendiente) no se puede volver a pendiente; solo avanzar hacia
// "finalizado" (y cancelar). "nuevo" nunca es destino de una transición.
export const ORDER_TRANSITIONS = {
  nuevo: ['preparando', 'cancelado'],
  preparando: ['listo', 'porcobrar', 'finalizado', 'cancelado'],
  listo: ['porcobrar', 'finalizado', 'cancelado'],
  porcobrar: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
}

export function canTransitionStatus(from, to) {
  if (from === to) return true
  return (ORDER_TRANSITIONS[from] || []).includes(to)
}
export const TABLE_STATUS = ['libre', 'ocupada', 'cuenta', 'pagada']

const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0)

export const defaultSettings = () => ({
  printer: { width: '58mm', ticketEnabled: true, kitchenEnabled: true, ticketCopies: 1 },
  payments: { cardCommission: 5, applyCommission: true, roundUp: true },
  notifications: { sound: true, vibration: true, visual: true },
  appearance: { density: 'normal', mode: 'operacion', accent: '#16A34A', logoEmoji: '🌿' },
  delivery: { baseCost: 30 },
})

export const defaultRoles = () => ({
  admin: { label: 'Administrador', permissions: ['*'] },
  supervisor: { label: 'Supervisor', permissions: ['orders.create', 'orders.edit', 'orders.pay', 'orders.cancel', 'orders.print', 'orders.view', 'inventory.view', 'inventory.edit', 'caja.open', 'caja.close', 'caja.view', 'reports.view', 'products.edit', 'clients.edit', 'discounts.apply', 'delivery.manage', 'kitchen.manage', 'settings.view', 'menu.manage', 'growth.manage'] },
  cajero: { label: 'Cajero', permissions: ['orders.create', 'orders.edit', 'orders.pay', 'orders.print', 'orders.view', 'caja.open', 'caja.close', 'caja.view', 'reports.view', 'clients.edit', 'discounts.apply'] },
  mesero: { label: 'Mesero', permissions: ['orders.create', 'orders.edit', 'orders.pay', 'orders.view', 'tables.manage', 'clients.edit', 'discounts.apply'] },
  cocinero: { label: 'Cocinero', permissions: ['orders.view', 'kitchen.manage'] },
  repartidor: { label: 'Repartidor', permissions: ['orders.view', 'delivery.manage'] },
})

const defaultState = () => ({
  meta: { businessName: 'POSTIA', currency: 'MXN', phone: '', address: '' },
  settings: defaultSettings(),
  roles: defaultRoles(),
  users: [{ id: 'u-admin', name: 'Administrador', role: 'admin', password: '1234', active: true }],
  categories: [],
  modGroups: [],
  products: [],
  salons: [],
  tables: [],
  orders: [],
  nextFolio: 1000,
  caja: { sessions: [] },
  clients: [],
  coupons: [],
  campaigns: [],
  riders: [],
  inventoryItems: [],
  inventoryMovements: [],
  audit: [],
  rules: [],
  menuDigital: { enabled: true, mode: 'order', services: { llevar: true, domicilio: true, mesa: true }, accent: '#16A34A', welcome: 'Bienvenido a POSTIA' },
})

export function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    const s = JSON.parse(raw)
    const d = defaultState()
    // Fusión segura: garantiza que todos los arrays/objetos existan
    return {
      ...d,
      ...s,
      settings: { ...d.settings, ...(s.settings || {}), payments: { ...d.settings.payments, ...(s.settings?.payments || {}) }, notifications: { ...d.settings.notifications, ...(s.settings?.notifications || {}) }, appearance: { ...d.settings.appearance, ...(s.settings?.appearance || {}) }, printer: { ...d.settings.printer, ...(s.settings?.printer || {}) }, delivery: { ...d.settings.delivery, ...(s.settings?.delivery || {}) } },
      roles: { ...d.roles, ...(s.roles || {}) },
      caja: Array.isArray(s.caja?.sessions) ? { sessions: s.caja.sessions } : { sessions: [] },
      menuDigital: { ...d.menuDigital, ...(s.menuDigital || {}) },
      categories: Array.isArray(s.categories) ? s.categories : [],
      modGroups: Array.isArray(s.modGroups) ? s.modGroups : [],
      products: Array.isArray(s.products) ? s.products : [],
      salons: Array.isArray(s.salons) ? s.salons : [],
      tables: Array.isArray(s.tables) ? s.tables : [],
      orders: Array.isArray(s.orders) ? s.orders : [],
      clients: Array.isArray(s.clients) ? s.clients : [],
      coupons: Array.isArray(s.coupons) ? s.coupons : [],
      campaigns: Array.isArray(s.campaigns) ? s.campaigns : [],
      riders: Array.isArray(s.riders) ? s.riders : [],
      inventoryItems: Array.isArray(s.inventoryItems) ? s.inventoryItems : [],
      inventoryMovements: Array.isArray(s.inventoryMovements) ? s.inventoryMovements : [],
      nextFolio: Number.isFinite(s.nextFolio) ? s.nextFolio : 1000,
      users: Array.isArray(s.users) && s.users.length ? s.users : d.users,
      audit: Array.isArray(s.audit) ? s.audit : [],
      rules: Array.isArray(s.rules) ? s.rules : [],
      meta: { ...d.meta, ...(s.meta || {}) },
    }
  } catch {
    return defaultState()
  }
}

export function writeState(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
  return s
}

export function resetAll() {
  localStorage.removeItem(KEY)
  writeState(defaultState())
  return readState()
}

// ---- Sesión de usuario ----
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { id: 'u-admin', name: 'Administrador', role: 'admin' }
}
export function setCurrentUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify({ id: u.id, name: u.name, role: u.role }))
}
export function can(user, perm) {
  if (!user) return false
  const s = readState()
  const role = s.roles[user.role]
  if (!role) return false
  return role.permissions.includes('*') || role.permissions.includes(perm)
}

// ---- Auditoría ----
export function logAudit({ user, action, detail, orderId, amount, before, after }) {
  const s = readState()
  s.audit.push({
    id: uid(), user: user?.name || 'Sistema', role: user?.role || 'sistema',
    action, detail, orderId, amount: amount != null ? Number(amount) : undefined,
    before, after, date: nowISO(),
  })
  writeState(s)
  return s
}
export function getAudit() {
  return readState().audit
}
export function clearAudit(user) {
  if (!user || user.role !== 'admin') return readState()
  const s = readState()
  s.audit = []
  writeState(s)
  return s
}

// ---- Settings ----
export function getSettings() { return readState().settings }
export function updateSettings(patch) {
  const s = readState()
  s.settings = {
    ...s.settings, ...patch,
    printer: { ...s.settings.printer, ...(patch.printer || {}) },
    payments: { ...s.settings.payments, ...(patch.payments || {}) },
    notifications: { ...s.settings.notifications, ...(patch.notifications || {}) },
    appearance: { ...s.settings.appearance, ...(patch.appearance || {}) },
    delivery: { ...s.settings.delivery, ...(patch.delivery || {}) },
  }
  writeState(s)
  syncBg(() => syncSettingsToSupabase(s.settings))
  return s
}
export function getMenuDigital() { return readState().menuDigital }
export function updateMenuDigital(patch) {
  const s = readState()
  s.menuDigital = { ...s.menuDigital, ...patch, services: { ...s.menuDigital.services, ...(patch.services || {}) }, updatedAt: nowISO() }
  writeState(s)
  syncBg(() => syncMenuDigitalToSupabase(s.menuDigital))
  return s
}

// ---- Usuarios / roles ----
export function getRoles() { return readState().roles }
export function saveRole(roleId, permissions) {
  const s = readState()
  if (s.roles[roleId]) s.roles[roleId].permissions = permissions
  writeState(s)
  return s
}
export function addUser(u) {
  const s = readState()
  const user = { id: uid(), name: u.name, role: u.role || 'cajero', password: u.password || '1234', active: u.active !== false, updatedAt: nowISO() }
  s.users.push(user)
  writeState(s)
  syncBg(() => syncUserToSupabase(user))
  return s
}
export function updateUser(id, patch) {
  const s = readState()
  const i = s.users.findIndex((u) => u.id === id)
  if (i >= 0) s.users[i] = { ...s.users[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncUserToSupabase(s.users[i]))
  return s
}
export function deleteUser(id) {
  const s = readState()
  s.users = s.users.filter((u) => u.id !== id)
  writeState(s)
  syncBg(() => deleteUserFromSupabase(id))
  return s
}
export function login(name, password) {
  const s = readState()
  const u = s.users.find((x) => x.name.toLowerCase() === String(name || '').trim().toLowerCase() && x.password === password && x.active)
  if (!u) return null
  setCurrentUser(u)
  return u
}
export function authorizeSupervisor(password) {
  const s = readState()
  const sup = s.users.find((x) => x.role === 'supervisor' && x.active)
  if (sup && sup.password === password) return sup
  const admin = s.users.find((x) => x.role === 'admin' && x.active)
  if (admin && admin.password === password) return admin
  return null
}

// ---- Categorías ----
export function addCategory(c) {
  const s = readState()
  const cat = { id: uid(), name: c.name, emoji: c.emoji || '🍽️', order: s.categories.length, featured: !!c.featured, updatedAt: nowISO() }
  s.categories.push(cat)
  writeState(s)
  syncBg(() => syncCategoryToSupabase(cat))
  return s
}
export function updateCategory(id, patch) {
  const s = readState()
  const i = s.categories.findIndex((x) => x.id === id)
  if (i >= 0) s.categories[i] = { ...s.categories[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncCategoryToSupabase(s.categories[i]))
  return s
}
export function deleteCategory(id) {
  const s = readState()
  s.categories = s.categories.filter((x) => x.id !== id)
  s.products = s.products.map((p) => (p.categoryId === id ? { ...p, categoryId: '' } : p))
  writeState(s)
  syncBg(() => deleteCategoryFromSupabase(id))
  return s
}
export function categoryName(s, id) {
  return s.categories.find((c) => c.id === id)?.name || 'General'
}

// ---- Grupos de modificadores ----
export function addModGroup(g) {
  const s = readState()
  const mg = {
    id: uid(), name: g.name, type: g.type || 'sabor', required: !!g.required,
    min: Number(g.min) || 0, max: Number(g.max) || 4, surchargeSecond: g.surchargeSecond || null,
    defaultValue: g.defaultValue || '', freeCount: Number(g.freeCount) || 0,
    description: g.description || '', category: g.category || '', image: g.image || '',
    items: (g.items || []).map((it) => ({ id: uid(), name: it.name, price: Number(it.price) || 0, description: it.description || '' })),
    updatedAt: nowISO(),
  }
  s.modGroups.push(mg)
  writeState(s)
  syncBg(() => syncModGroupToSupabase(mg))
  return s
}
export function updateModGroup(id, patch) {
  const s = readState()
  const i = s.modGroups.findIndex((x) => x.id === id)
  if (i >= 0) {
    const cur = s.modGroups[i]
    const items = patch.items
      ? patch.items.map((it) => (it.id ? it : { ...it, id: uid() })).map((it) => ({ ...it, price: Number(it.price) || 0, description: it.description || '' }))
      : cur.items
    const { surchargeOn, surchargePrice, hasImage, ...cleanPatch } = patch
    s.modGroups[i] = {
      ...cur, ...cleanPatch, items,
      max: Number(patch.max ?? cur.max), min: Number(patch.min ?? cur.min),
      defaultValue: patch.defaultValue ?? cur.defaultValue ?? '',
      freeCount: Number(patch.freeCount ?? cur.freeCount ?? 0),
      description: (patch.description ?? cur.description ?? '').trim(),
      category: (patch.category ?? cur.category ?? '').trim(),
      image: hasImage !== undefined ? (patch.image || '') : (patch.image ?? cur.image ?? ''),
      updatedAt: nowISO(),
    }
  }
  writeState(s)
  if (i >= 0) syncBg(() => syncModGroupToSupabase(s.modGroups[i]))
  return s
}
export function deleteModGroup(id) {
  const s = readState()
  s.modGroups = s.modGroups.filter((x) => x.id !== id)
  s.products = s.products.map((p) => ({ ...p, modGroupIds: (p.modGroupIds || []).filter((g) => g !== id) }))
  writeState(s)
  syncBg(() => deleteModGroupFromSupabase(id))
  return s
}

// ---- Productos ----
export function addProduct(p) {
  const s = readState()
  const prod = {
    id: uid(), name: p.name, description: p.description || '', emoji: p.emoji || '🍽️',
    image: p.image || '', price: Number(p.price) || 0, cost: Number(p.cost) || 0,
    categoryId: p.categoryId || '', sku: p.sku || '', available: p.available !== false,
    featured: !!p.featured, order: Number(p.order) || 0, stock: Number(p.stock) || 0,
    unitLabel: p.unitLabel || 'pieza', lowStockAt: p.lowStockAt != null ? Number(p.lowStockAt) : 5,
    modGroupIds: p.modGroupIds || [], promo: p.promo && p.promo.bundle > 1 && p.promo.price > 0 ? p.promo : null,
    updatedAt: nowISO(),
  }
  s.products.push(prod)
  writeState(s)
  syncBg(() => syncProductToSupabase(prod))
  return prod
}
export function updateProduct(id, patch) {
  const s = readState()
  const i = s.products.findIndex((p) => p.id === id)
  if (i >= 0) {
    s.products[i] = {
      ...s.products[i], ...patch, updatedAt: nowISO(),
      price: patch.price != null ? Number(patch.price) : s.products[i].price,
      cost: patch.cost != null ? Number(patch.cost) : s.products[i].cost,
      promo: patch.promo === null ? null : patch.promo ? patch.promo : s.products[i].promo,
    }
  }
  writeState(s)
  if (i >= 0) syncBg(() => syncProductToSupabase(s.products[i]))
  return s
}
export function deleteProduct(id) {
  const s = readState()
  s.products = s.products.filter((p) => p.id !== id)
  s.inventoryMovements = s.inventoryMovements.filter((m) => m.productId !== id)
  writeState(s)
  syncBg(() => deleteProductFromSupabase(id))
  return s
}
export function getProduct(s, id) { return s.products.find((p) => p.id === id) }

// ---- Precios y líneas ----
export const modPrice = (mods = []) => sum(mods, (m) => Number(m.price) || 0)
export const unitPrice = (product, mods = []) => (Number(product?.price) || 0) + modPrice(mods)
export const lineTotals = (product, qty, mods = []) => {
  const regularUnit = Number(product?.price) || 0
  const hasMods = (mods || []).length > 0
  const promo = product?.promo && !hasMods ? product.promo : null
  const regular = qty * regularUnit
  let subtotal = qty * (regularUnit + modPrice(mods))
  let bundles = 0
  if (promo && promo.bundle > 1 && qty >= promo.bundle) {
    bundles = Math.floor(qty / promo.bundle)
    const rem = qty % promo.bundle
    subtotal = bundles * promo.price + rem * regularUnit
  }
  return { subtotal, regular, saved: regular - subtotal, bundles, promo, hasMods }
}

// ---- Pedidos ----
export function buildItem(product, qty, mods = [], note = '') {
  const t = lineTotals(product, qty, mods)
  return {
    id: uid(), productId: product.id, name: product.name, emoji: product.emoji,
    qty, price: unitPrice(product, mods), unitBase: Number(product.price) || 0,
    modifiers: mods.map((m) => ({ groupId: m.groupId, groupName: m.groupName, id: m.id, name: m.name, price: Number(m.price) || 0 })),
    note, lineTotal: t.subtotal, saved: t.saved,
  }
}
export const orderSubtotal = (items) => sum(items, (i) => i.lineTotal)

function applyCoupon(s, code, subtotal, serviceType, clientId) {
  if (!code) return { discount: 0, coupon: null }
  const coupon = s.coupons.find((c) => c.code.toLowerCase() === String(code).trim().toLowerCase())
  if (!coupon || !coupon.active) return { discount: 0, coupon: null, error: 'Cupón no existe o está inactivo' }
  const now = Date.now()
  if (coupon.start && new Date(coupon.start).getTime() > now) return { discount: 0, coupon: null, error: 'Cupón aún no válido' }
  if (coupon.end && new Date(coupon.end).getTime() < now) return { discount: 0, coupon: null, error: 'Cupón expirado' }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { discount: 0, coupon: null, error: 'Cupón agotado' }
  if (coupon.minPurchase && subtotal < coupon.minPurchase) return { discount: 0, coupon: null, error: `Compra mínima de $${coupon.minPurchase}` }
  const discount = coupon.type === 'percent' ? subtotal * (coupon.value / 100) : Math.min(Number(coupon.value) || 0, subtotal)
  return { discount, coupon }
}

export function createOrder({ serviceType = 'mostrador', tableId, client, items, discount = 0, discountReason = '', tip = 0, deliveryCost = 0, packagingCost = 0, couponCode, createdBy, status, kitchenStatus, title }) {
  const s = readState()
  // Folio por día: los pedidos reinician en #1 cada día para que el usuario
  // entienda qué número de pedido lleva en el día. El índice único de la BD
  // es (folio_date, folio), así que folios se repiten entre días sin colisión.
  const folioDate = todayKey()
  const maxFolioHoy = s.orders.reduce(
    (m, o) => (o.folioDate === folioDate ? Math.max(m, Number(o.folio) || 0) : m),
    0
  )
  const folio = maxFolioHoy + 1
  const subtotal = orderSubtotal(items)
  const cp = applyCoupon(s, couponCode, subtotal, serviceType, client?.id)
  const finalDiscount = Math.max(0, Number(discount) || 0) + cp.discount
  const tipN = Number(tip) || 0
  const shipN = Number(deliveryCost) || 0
  const packN = Number(packagingCost) || 0
  const order = {
    id: uid(), folio, folioDate,
    serviceType, tableId: tableId || null,
    client: client ? { id: client.id, name: client.name, phone: client.phone, address: client.address, colony: client.colony, reference: client.reference } : null,
    items, subtotal,
    discount: Math.min(finalDiscount, subtotal), discountReason,
    tip: Number(tip) || 0, deliveryCost: Number(deliveryCost) || 0, packagingCost: Number(packagingCost) || 0,
    total: Math.max(0, subtotal - Math.min(finalDiscount, subtotal) + tipN + shipN + packN),
    couponCode: cp.coupon ? couponCode : null, couponId: cp.coupon ? cp.coupon.id : null,
    status: status || 'preparando', kitchenStatus: kitchenStatus || 'preparando',
    payment: null, paid: false, paymentInfo: null, cashReceived: null, cashChange: null,
    createdBy: createdBy?.name || 'Sistema', createdByRole: createdBy?.role,
    createdAt: nowISO(), paidAt: null, closedAt: null, canceledAt: null, cancelReason: null,
    riderId: null,
    title: title || '',
    updatedAt: nowISO(),
  }
  s.nextFolio = Math.max(s.nextFolio, folio + 1)
  s.orders.push(order)
  if (tableId) {
    const t = s.tables.find((tb) => tb.id === tableId)
    if (t) t.orderId = order.id
  }
  writeState(s)
  logAudit({ user: createdBy, action: 'order.created', detail: `Pedido #${order.folio} creado (${serviceType})`, orderId: order.id, amount: order.total })
  runRules('order.nuevo', { order, state: readState() })
  // Sincronizar con Supabase en segundo plano (no bloquea el flujo)
  syncBg(() => syncOrderToSupabase(order))
  return readState()
}

export function getOrder(id) { return readState().orders.find((o) => o.id === id) }

function recomputeOrder(s, order) {
  order.subtotal = orderSubtotal(order.items)
  const cp = applyCoupon(s, order.couponCode, order.subtotal, order.serviceType, order.client?.id)
  const finalDiscount = Math.max(0, order.discount || 0) + cp.discount
  order.discount = Math.min(finalDiscount, order.subtotal)
  order.total = Math.max(0, order.subtotal - order.discount + (Number(order.tip) || 0) + (Number(order.deliveryCost) || 0) + (Number(order.packagingCost) || 0))
  order.couponId = cp.coupon ? cp.coupon.id : null
}

export function updateOrder(id, patch, user) {
  const s = readState()
  const o = s.orders.find((x) => x.id === id)
  if (!o) return readState()
  const prevStatus = o.status
  Object.assign(o, patch)
  if (patch.client) {
    o.client = { id: patch.client.id, name: patch.client.name, phone: patch.client.phone, address: patch.client.address, colony: patch.client.colony, reference: patch.client.reference }
  }
  o.updatedAt = nowISO()
  recomputeOrder(s, o)
  if (patch.status && patch.status !== prevStatus) {
    handleStatusChange(s, o, prevStatus, patch.status, patch.reason, user)
  }
  writeState(s)
  logAudit({ user, action: 'order.updated', detail: `Pedido #${o.folio} actualizado`, orderId: o.id })
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}

export function addItemsToOrder(orderId, items, user) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o) return readState()
  o.items = [...o.items, ...items]
  o.updatedAt = nowISO()
  recomputeOrder(s, o)
  writeState(s)
  logAudit({ user, action: 'order.addItems', detail: `Pedido #${o.folio}: +${items.length} artículos`, orderId, amount: sum(items, (i) => i.lineTotal) })
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}

export function updateOrderItem(orderId, itemId, patch) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o) return readState()
  const it = o.items.find((i) => i.id === itemId)
  if (it) {
    Object.assign(it, patch)
    if (patch.qty != null) { it.qty = Number(patch.qty); it.lineTotal = it.qty * it.price }
    if (patch.modifiers) { it.modifiers = patch.modifiers; it.price = it.unitBase + modPrice(patch.modifiers); it.lineTotal = it.qty * it.price }
  }
  recomputeOrder(s, o)
  o.updatedAt = nowISO()
  writeState(s)
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}
export function removeOrderItem(orderId, itemId) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  if (o) {
    o.items = o.items.filter((i) => i.id !== itemId)
    o.updatedAt = nowISO()
    recomputeOrder(s, o)
    if (o.items.length === 0) o.status = 'cancelado'
  }
  writeState(s)
  syncBg(() => o && syncOrderToSupabase(o))
  return readState()
}

export function setOrderStatus(id, status, { reason, user }) {
  const s = readState()
  const o = s.orders.find((x) => x.id === id)
  if (!o) return readState()
  const prev = o.status
  o.status = status
  o.updatedAt = nowISO()
  if (status === 'cancelado') {
    o.cancelReason = reason || ''
    o.canceledAt = nowISO()
    if (o.tableId) { const t = s.tables.find((tb) => tb.id === o.tableId); if (t && t.orderId === o.id) { t.status = 'libre'; t.orderId = null } }
  }
  if (status === 'finalizado') o.closedAt = nowISO()
  writeState(s)
  logAudit({ user, action: 'order.status', detail: `Pedido #${o.folio}: ${ORDER_STATUS_LABEL[prev]} → ${ORDER_STATUS_LABEL[status]}${reason ? ` · ${reason}` : ''}`, orderId: o.id })
  runRules('order.' + status, { order: readState().orders.find((x) => x.id === id), state: readState() })
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}

export function setKitchenStatus(id, kstatus, user) {
  const s = readState()
  const o = s.orders.find((x) => x.id === id)
  if (!o) return readState()
  o.kitchenStatus = kstatus
  o.updatedAt = nowISO()
  if (kstatus === 'preparando' && o.status === 'nuevo') o.status = 'preparando'
  if (kstatus === 'listo' && o.status === 'preparando') {
    // pedidos de mostrador/mesa pasan directo a "por cobrar"; delivery/menú digital
    // se quedan en "listo" para que assignRider pueda pasar el repartidor a "encamino"
    o.status = (o.serviceType === 'domicilio' || o.serviceType === 'menudigital') ? 'listo' : 'porcobrar'
  }
  writeState(s)
  logAudit({ user, action: 'kitchen.status', detail: `Cocina: pedido #${o.folio} → ${KITCHEN_STATUS_LABEL[kstatus]}`, orderId: o.id })
  runRules('order.' + kstatus, { order: readState().orders.find((x) => x.id === id), state: readState() })
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}

export function paymentBreakdown(base, method, settings = getSettings()) {
  const baseNum = Number(base) || 0
  if (method !== 'tarjeta' || !settings.payments.applyCommission) {
    return { charge: baseNum, commission: 0, rounding: 0 }
  }
  const pct = (Number(settings.payments.cardCommission) || 0) / 100
  const commission = baseNum * pct
  const raw = baseNum + commission
  const charge = settings.payments.roundUp ? Math.ceil(raw) : Math.round(raw * 100) / 100
  return { charge, commission, rounding: charge - raw }
}

export function payOrder(orderId, { payment, cashReceived, user }) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o || o.paid) return readState()
  const machineId = getMachineIdPublic()
  // Adquirir lock de cobro para multi-máquina (no bloqueante)
  acquirePayLock(orderId, machineId).catch(e => console.error('Supabase acquire lock error:', e.message))
  const info = paymentBreakdown(o.total, payment)
  o.payment = payment
  o.paid = true
  o.paymentInfo = info
  o.paidAt = nowISO()
  o.status = 'finalizado'
  o.kitchenStatus = 'entregado'
  if (cashReceived != null && payment === 'efectivo') {
    o.cashReceived = Number(cashReceived)
    o.cashChange = Number(cashReceived) - info.charge
  }
  if (o.tableId) { const t = s.tables.find((tb) => tb.id === o.tableId); if (t && t.orderId === o.id) { t.status = 'libre'; t.orderId = null } }
  const session = s.caja.sessions.find((c) => c.status === 'abierta')
  if (session) {
    session.sales.push({ orderId: o.id, folio: o.folio, method: payment, base: o.total, commission: info.commission, charge: info.charge, rounding: info.rounding, date: nowISO(), user: user?.name })
  }
  if (o.couponId) { const c = s.coupons.find((x) => x.id === o.couponId); if (c) c.usedCount = (c.usedCount || 0) + 1 }
  o.updatedAt = nowISO()
  writeState(s)
  logAudit({ user, action: 'order.paid', detail: `Pedido #${o.folio} cobrado (${payment})`, orderId, amount: o.total })
  runRules('order.paid', { order: readState().orders.find((x) => x.id === orderId), state: readState() })
  // Liberar el lock de cobro para multi-máquina
  releasePayLock(o.id).catch(e => console.error('Supabase release lock error:', e.message))
  // Sincronizar con Supabase
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}

// --- Order Locking ---
// Prevents concurrent editing: when User A opens an order, User B sees a lock banner and cannot modify it.
// Uses the existing locked_by / locked_at columns on orders.
const LOCK_TTL_MS = 5 * 60 * 1000 // 5 min — locks auto-expire

/** Returns { locked: true, by: 'Name', since: Date } or { locked: false } */
export function isOrderLocked(order, currentUser) {
  if (!order?.lockedBy) return { locked: false }
  // Same user = not locked (they own the lock)
  if (currentUser?.id && order.lockedBy === currentUser.id) return { locked: false }
  if (order.lockedBy === getMachineIdPublic()) return { locked: false }
  // Check TTL
  if (order.lockedAt) {
    const age = Date.now() - new Date(order.lockedAt).getTime()
    if (age > LOCK_TTL_MS) return { locked: false } // stale lock
  }
  // Look up user name
  const s = readState()
  const locker = s.users?.find(u => u.id === order.lockedBy)
  return { locked: true, by: locker?.name || 'Otro usuario', since: order.lockedAt }
}

/** Acquire editing lock on an order (atomic via RPC, local fallback) */
export function acquireOrderLock(orderId, user) {
  const s = readState()
  const o = s.orders.find(x => x.id === orderId)
  if (!o) return false
  // Don't override own lock
  if (o.lockedBy && o.lockedBy !== getMachineIdPublic() && o.lockedBy !== user?.id) return false
  o.lockedBy = user?.id || getMachineIdPublic()
  o.lockedAt = nowISO()
  o.updatedAt = nowISO()
  writeState(s)
  // Try atomic remote lock (best-effort)
  acquireOrderLockRpc(orderId, user?.id).catch(e => console.error('Supabase acquire order lock error:', e?.message))
  syncBg(() => syncOrderToSupabase(o))
  return true
}

/** Release editing lock */
export function releaseOrderLock(orderId) {
  const s = readState()
  const o = s.orders.find(x => x.id === orderId)
  if (!o) return
  o.lockedBy = null
  o.lockedAt = null
  o.updatedAt = nowISO()
  writeState(s)
  // Release remote lock (best-effort)
  releaseOrderLockRpc(orderId).catch(e => console.error('Supabase release order lock error:', e?.message))
  syncBg(() => syncOrderToSupabase(o))
}

export function cancelOrder(orderId, { reason, user }) {
  return setOrderStatus(orderId, 'cancelado', { reason, user })
}

export function assignRider(orderId, riderId) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  const r = s.riders.find((x) => x.id === riderId)
  if (!o || !r) return readState()
  o.riderId = riderId
  if (o.serviceType === 'domicilio' || o.serviceType === 'menudigital') {
    r.status = 'ocupado'
    r.currentOrderId = orderId
    if (o.status === 'listo' || o.status === 'porcobrar') r.status = 'encamino'
    if (o.status === 'listo' && o.kitchenStatus === 'listo') o.status = 'porcobrar'
  }
  o.updatedAt = nowISO()
  r.updatedAt = nowISO()
  writeState(s)
  logAudit({ user: getCurrentUser(), action: 'delivery.assign', detail: `Repartidor ${r.name} asignado a #${o.folio}`, orderId, amount: o.total })
  syncBg(() => syncOrderToSupabase(o))
  syncBg(() => syncRiderToSupabase(r))
  return readState()
}
export function setRiderStatus(riderId, status, orderId) {
  const s = readState()
  const r = s.riders.find((x) => x.id === riderId)
  if (r) {
    r.status = status
    r.currentOrderId = status === 'disponible' ? null : orderId || r.currentOrderId
    if (status === 'disponible') r.deliveriesCount = (r.deliveriesCount || 0) + 1
    r.updatedAt = nowISO()
  }
  writeState(s)
  if (r) syncBg(() => syncRiderToSupabase(r))
  return readState()
}

// ---- Mesas / salones ----
export function addSalon(n) {
  const s = readState()
  const salon = { id: uid(), name: n, updatedAt: nowISO() }
  s.salons.push(salon)
  writeState(s)
  syncBg(() => syncSalonToSupabase(salon))
  return s
}
export function updateSalon(id, patch) {
  const s = readState()
  const i = s.salons.findIndex((x) => x.id === id)
  if (i >= 0) s.salons[i] = { ...s.salons[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncSalonToSupabase(s.salons[i]))
  return s
}
export function deleteSalon(id) {
  const s = readState()
  s.salons = s.salons.filter((x) => x.id !== id)
  s.tables = s.tables.filter((t) => t.salonId !== id)
  writeState(s)
  syncBg(() => deleteSalonFromSupabase(id))
  return s
}
export function addTable({ salonId, name, capacity }) {
  const s = readState()
  const t = { id: uid(), salonId, name, capacity: Number(capacity) || 4, status: 'libre', orderId: null, updatedAt: nowISO() }
  s.tables.push(t)
  writeState(s)
  syncBg(() => syncTableToSupabase(t))
  return s
}
export function updateTable(id, patch) {
  const s = readState()
  const i = s.tables.findIndex((x) => x.id === id)
  if (i >= 0) s.tables[i] = { ...s.tables[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncTableToSupabase(s.tables[i]))
  return s
}
export function deleteTable(id) {
  const s = readState()
  s.tables = s.tables.filter((x) => x.id !== id)
  writeState(s)
  syncBg(() => deleteTableFromSupabase(id))
  return s
}
export function freeTable(tableId) {
  const s = readState()
  const t = s.tables.find((x) => x.id === tableId)
  if (t) { t.status = 'libre'; t.orderId = null; t.updatedAt = nowISO() }
  writeState(s)
  if (t) syncBg(() => syncTableToSupabase(t))
  return s
}
export function moveTable(orderId, tableId) {
  const s = readState()
  const o = s.orders.find((x) => x.id === orderId)
  if (!o) return readState()
  const old = s.tables.find((t) => t.id === o.tableId)
  if (old && old.orderId === o.id) { old.status = 'libre'; old.orderId = null }
  const nt = s.tables.find((t) => t.id === tableId)
  if (nt) { nt.status = 'ocupada'; nt.orderId = o.id; nt.updatedAt = nowISO() }
  o.tableId = tableId
  o.updatedAt = nowISO()
  writeState(s)
  syncBg(() => nt && syncTableToSupabase(nt))
  syncBg(() => syncOrderToSupabase(o))
  return readState()
}
export function mergeTables(targetTableId, fromTableId) {
  // La cuenta de fromTableId se agrega al target; se libera fromTableId.
  const s = readState()
  const from = s.tables.find((t) => t.id === fromTableId)
  const target = s.tables.find((t) => t.id === targetTableId)
  if (!from || !target || !from.orderId) return readState()
  const o = s.orders.find((x) => x.id === from.orderId)
  if (o) {
    o.tableId = target.id
    if (target.orderId) {
      const targetOrder = s.orders.find((x) => x.id === target.orderId)
      if (targetOrder && !targetOrder.paid) {
        targetOrder.items = [...targetOrder.items, ...o.items]
        recomputeOrder(s, targetOrder)
        targetOrder.updatedAt = nowISO()
        o.status = 'cancelado'
        o.cancelReason = 'Cuenta unida'
      }
    } else {
      target.orderId = o.id
      target.status = 'ocupada'
    }
    from.status = 'libre'
    from.orderId = null
    from.updatedAt = nowISO()
    target.updatedAt = nowISO()
    o.updatedAt = nowISO()
  }
  writeState(s)
  syncBg(() => from && syncTableToSupabase(from))
  syncBg(() => target && syncTableToSupabase(target))
  syncBg(() => o && syncOrderToSupabase(o))
  return readState()
}

// ---- Caja ----
export function openCaja({ openingCash, user }) {
  const s = readState()
  if (s.caja.sessions.some((c) => c.status === 'abierta')) return readState()
  s.caja.sessions.push({
    id: uid(), openedAt: nowISO(), openedBy: user?.name || 'Sistema',
    openingCash: Number(openingCash) || 0, status: 'abierta',
    sales: [], expenses: [], extraIncomes: [], retiros: [],
    closedAt: null, closedBy: null, cashCounted: null, expectedCash: null, difference: null, roundingProfit: null,
  })
  writeState(s)
  logAudit({ user, action: 'caja.open', detail: 'Caja abierta', amount: Number(openingCash) || 0 })
  return readState()
}
export function activeCaja() {
  const s = readState()
  return s.caja.sessions.find((c) => c.status === 'abierta') || null
}
export function isCajaOpen() { return !!activeCaja() }
export function cajaHistory() { return readState().caja.sessions }
export function cajaSummary(session) {
  if (!session) return { cashSales: 0, cardSales: 0, transferSales: 0, qrSales: 0, totalSales: 0, totalExpenses: 0, extraIncomes: 0, totalRetiros: 0, commissions: 0, rounding: 0, expectedCash: 0 }
  const cashSales = sum(session.sales.filter((x) => x.method === 'efectivo'), (x) => x.charge)
  const cardSales = sum(session.sales.filter((x) => x.method === 'tarjeta'), (x) => x.base)
  const transferSales = sum(session.sales.filter((x) => x.method === 'transferencia'), (x) => x.charge)
  const qrSales = sum(session.sales.filter((x) => x.method === 'qr'), (x) => x.charge)
  const commissions = sum(session.sales, (x) => x.commission)
  const rounding = sum(session.sales, (x) => x.rounding)
  const totalExpenses = sum(session.expenses, (x) => x.amount)
  const extraIncomes = sum(session.extraIncomes, (x) => x.amount)
  const totalRetiros = sum(session.retiros, (x) => x.amount)
  const cashExtra = sum(session.extraIncomes.filter((x) => x.method === 'efectivo'), (x) => x.amount)
  const cashExp = sum(session.expenses.filter((x) => x.method === 'efectivo'), (x) => x.amount)
  const expectedCash = session.openingCash + cashSales + cashExtra - cashExp - totalRetiros
  return { cashSales, cardSales, transferSales, qrSales, totalSales: cashSales + cardSales + transferSales + qrSales, totalExpenses, extraIncomes, totalRetiros, commissions, rounding, expectedCash }
}
export function addExpense({ concept, provider, amount, method, user }) {
  const s = readState()
  const c = s.caja.sessions.find((x) => x.status === 'abierta')
  if (c) c.expenses.push({ id: uid(), concept, provider: provider || '', amount: Number(amount) || 0, method: method || 'efectivo', user: user?.name || 'Sistema', date: nowISO() })
  writeState(s)
  logAudit({ user, action: 'caja.expense', detail: `Gasto: ${concept}`, amount: Number(amount) || 0 })
  return readState()
}
export function addExtraIncome({ concept, amount, method, user }) {
  const s = readState()
  const c = s.caja.sessions.find((x) => x.status === 'abierta')
  if (c) c.extraIncomes.push({ id: uid(), concept, amount: Number(amount) || 0, method: method || 'efectivo', user: user?.name || 'Sistema', date: nowISO() })
  writeState(s)
  logAudit({ user, action: 'caja.income', detail: `Ingreso extra: ${concept}`, amount: Number(amount) || 0 })
  return readState()
}
export function addRetiro({ amount, note, user }) {
  const s = readState()
  const c = s.caja.sessions.find((x) => x.status === 'abierta')
  if (c) c.retiros.push({ id: uid(), amount: Number(amount) || 0, note, user: user?.name || 'Sistema', date: nowISO() })
  writeState(s)
  logAudit({ user, action: 'caja.retiro', detail: `Retiro${note ? ': ' + note : ''}`, amount: Number(amount) || 0 })
  return readState()
}
export function closeCaja({ cashCounted, user }) {
  const s = readState()
  const c = s.caja.sessions.find((x) => x.status === 'abierta')
  if (!c) return readState()
  const sumr = cajaSummary(c)
  c.status = 'cerrada'
  c.closedAt = nowISO()
  c.closedBy = user?.name || 'Sistema'
  c.cashCounted = Number(cashCounted) || 0
  c.expectedCash = sumr.expectedCash
  c.difference = c.cashCounted - c.expectedCash
  c.roundingProfit = sumr.rounding
  writeState(s)
  logAudit({ user, action: 'caja.close', detail: `Caja cerrada · diferencia ${c.difference >= 0 ? '+' : ''}${c.difference}`, amount: c.difference })
  runRules('caja.closed', { state: readState(), session: c })
  return readState()
}

// ---- Clientes ----
export function addClient(c) {
  const s = readState()
  const client = { id: uid(), name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '', createdAt: nowISO(), updatedAt: nowISO() }
  s.clients.push(client)
  writeState(s)
  syncBg(() => syncClientToSupabase(client))
  return s
}
export function updateClient(id, patch) {
  const s = readState()
  const i = s.clients.findIndex((x) => x.id === id)
  if (i >= 0) s.clients[i] = { ...s.clients[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncClientToSupabase(s.clients[i]))
  return s
}
export function deleteClient(id) {
  const s = readState()
  s.clients = s.clients.filter((x) => x.id !== id)
  writeState(s)
  syncBg(() => deleteClientFromSupabase(id))
  return s
}
export function findOrCreateClient({ name, phone }) {
  const s = readState()
  const clean = String(phone || '').replace(/\D/g, '')
  const existing = s.clients.find((c) => (clean && c.phone && c.phone.replace(/\D/g, '') === clean) || (String(c.name).toLowerCase() === String(name || '').trim().toLowerCase() && name))
  if (existing) return { client: existing, created: false }
  const client = { id: uid(), name, phone: phone || '', address: '', notes: '', createdAt: nowISO(), updatedAt: nowISO() }
  s.clients.push(client)
  writeState(s)
  syncBg(() => syncClientToSupabase(client))
  return { client, created: true }
}

// ---- Cupones ----
export function addCoupon(c) {
  const s = readState()
  const coupon = { id: uid(), code: String(c.code || '').toUpperCase(), name: c.name || '', type: c.type || 'percent', value: Number(c.value) || 0, minPurchase: Number(c.minPurchase) || 0, start: c.start || null, end: c.end || null, maxUses: Number(c.maxUses) || 0, usedCount: 0, clientId: c.clientId || null, categoryIds: c.categoryIds || [], productIds: c.productIds || [], active: c.active !== false, updatedAt: nowISO() }
  s.coupons.push(coupon)
  writeState(s)
  syncBg(() => syncCouponToSupabase(coupon))
  return s
}
export function updateCoupon(id, patch) {
  const s = readState()
  const i = s.coupons.findIndex((x) => x.id === id)
  if (i >= 0) s.coupons[i] = { ...s.coupons[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncCouponToSupabase(s.coupons[i]))
  return s
}
export function deleteCoupon(id) {
  const s = readState()
  s.coupons = s.coupons.filter((x) => x.id !== id)
  writeState(s)
  syncBg(() => deleteCouponFromSupabase(id))
  return s
}

// ---- Campañas ----
export function addCampaign(c) {
  const s = readState()
  const camp = { id: uid(), name: c.name, description: c.description || '', active: c.active !== false, start: c.start || null, end: c.end || null, createdAt: nowISO(), updatedAt: nowISO() }
  s.campaigns.push(camp)
  writeState(s)
  syncBg(() => syncCampaignToSupabase(camp))
  return s
}
export function updateCampaign(id, patch) {
  const s = readState()
  const i = s.campaigns.findIndex((x) => x.id === id)
  if (i >= 0) s.campaigns[i] = { ...s.campaigns[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncCampaignToSupabase(s.campaigns[i]))
  return s
}
export function deleteCampaign(id) {
  const s = readState()
  s.campaigns = s.campaigns.filter((x) => x.id !== id)
  writeState(s)
  syncBg(() => deleteCampaignFromSupabase(id))
  return s
}

// ---- Repartidores ----
export function addRider(r) {
  const s = readState()
  const rider = { id: uid(), name: r.name, phone: r.phone || '', status: 'disponible', currentOrderId: null, deliveriesCount: 0, active: r.active !== false, updatedAt: nowISO() }
  s.riders.push(rider)
  writeState(s)
  syncBg(() => syncRiderToSupabase(rider))
  return s
}
export function updateRider(id, patch) {
  const s = readState()
  const i = s.riders.findIndex((x) => x.id === id)
  if (i >= 0) s.riders[i] = { ...s.riders[i], ...patch, updatedAt: nowISO() }
  writeState(s)
  if (i >= 0) syncBg(() => syncRiderToSupabase(s.riders[i]))
  return s
}
export function deleteRider(id) {
  const s = readState()
  s.riders = s.riders.filter((x) => x.id !== id)
  writeState(s)
  syncBg(() => deleteRiderFromSupabase(id))
  return s
}

// ---- Inventario por ingrediente ----
export function addInventoryItem(i) {
  const s = readState()
  s.inventoryItems.push({ id: uid(), name: i.name, unit: i.unit || 'pieza', stock: Number(i.stock) || 0, minStock: Number(i.minStock) || 0, cost: Number(i.cost) || 0, category: i.category || '', lastIn: null, lastOut: null })
  writeState(s)
  return s
}
export function updateInventoryItem(id, patch) {
  const s = readState()
  const i = s.inventoryItems.findIndex((x) => x.id === id)
  if (i >= 0) s.inventoryItems[i] = { ...s.inventoryItems[i], ...patch }
  writeState(s)
  return s
}
export function deleteInventoryItem(id) {
  const s = readState()
  s.inventoryItems = s.inventoryItems.filter((x) => x.id !== id)
  s.inventoryMovements = s.inventoryMovements.filter((m) => m.itemId !== id)
  writeState(s)
  return s
}
export function addMovement({ itemId, type, qty, cost, note, user }) {
  const s = readState()
  const item = s.inventoryItems.find((x) => x.id === itemId)
  if (!item) return readState()
  const q = Number(qty) || 0
  const mv = { id: uid(), itemId, type, qty: q, cost: Number(cost) || item.cost, note: note || '', user: user?.name || 'Sistema', date: nowISO() }
  s.inventoryMovements.push(mv)
  if (type === 'entrada') item.stock += q
  else if (type === 'salida') item.stock = Math.max(0, item.stock - q)
  else if (type === 'ajuste') item.stock = Math.max(0, q)
  else if (type === 'merma') item.stock = Math.max(0, item.stock - q)
  item.lastIn = type === 'entrada' ? mv.date : item.lastIn
  item.lastOut = (type === 'salida' || type === 'merma') ? mv.date : item.lastOut
  writeState(s)
  if (type === 'salida' || type === 'merma') {
    const low = s.inventoryItems.filter((x) => x.stock <= x.minStock)
    if (low.some((x) => x.id === itemId)) runRules('inventory.bajo', { state: readState(), item })
  }
  return readState()
}

// ---- Automatizaciones (reglas) ----
export function addRule(r) {
  const s = readState()
  s.rules.push({ id: uid(), name: r.name || 'Nueva regla', when: r.when, then: r.then, target: r.target || '', active: r.active !== false })
  writeState(s)
  return s
}
export function updateRule(id, patch) {
  const s = readState()
  const i = s.rules.findIndex((x) => x.id === id)
  if (i >= 0) s.rules[i] = { ...s.rules[i], ...patch }
  writeState(s)
  return s
}
export function deleteRule(id) {
  const s = readState()
  s.rules = s.rules.filter((x) => x.id !== id)
  writeState(s)
  return s
}

export function runRules(event, { order, state, item, session }) {
  const s = state || readState()
  const msgs = []
  for (const r of s.rules) {
    if (!r.active || r.when !== event) continue
    let msg = ''
    if (r.then === 'notify') {
      msg = r.target ? `🔔 ${r.target}: ${eventLabel(event)}` : `🔔 ${eventLabel(event)}`
    } else if (r.then === 'sound') {
      msg = `🔊 ${eventLabel(event)}`
    } else if (r.then === 'print') {
      msg = `🖨️ Imprimir comanda: ${eventLabel(event)}`
    }
    if (msg) msgs.push(msg)
  }
  if (msgs.length) {
    try { window.dispatchEvent(new CustomEvent('postia:notify', { detail: { messages: msgs } })) } catch { /* noop */ }
  }
  return msgs
}
function eventLabel(e) {
  const map = {
    'order.nuevo': 'Pedido nuevo', 'order.preparando': 'Pedido en preparación',
    'order.listo': 'Pedido listo', 'order.paid': 'Pedido pagado',
    'order.cancelado': 'Pedido cancelado', 'inventory.bajo': 'Inventario bajo',
    'caja.closed': 'Caja cerrada',
  }
  return map[e] || e
}
