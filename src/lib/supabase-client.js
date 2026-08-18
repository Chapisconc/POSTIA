// POSTIA — Cliente Supabase
// Connection to Supabase project for data persistence and realtime sync.

import { createClient } from '@supabase/supabase-js'

// Vite uses import.meta.env; Next.js uses process.env
// Support both for compatibility
const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL)
  || (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL)
  || 'https://anruvmeypudkrdvymsns.supabase.co'
const SUPABASE_ANON_KEY = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY)
  || (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  || 'sb_publishable_15WYzIdFqGwwPvGEaCWPUw_NZaIW_Sz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Verificar conexión
export async function verifyConnection() {
  try {
    const { error } = await supabase.from('orders').select('count').limit(1)
    if (error) {
      console.error('Supabase connection error:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('Supabase connection failed:', e.message)
    return false
  }
}

// Mapeo camelCase (JS) → snake_case (BD), preservando objetos anidados como JSONB
const toSnake = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toSnake)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[snake] = JSON.parse(JSON.stringify(v))
    } else if (Array.isArray(v)) {
      out[snake] = v.map(item => (typeof item === 'string' && item.length < 36 && !item.includes('-')) ? toValidUuid(item) : item)
    } else if (v != null) {
      out[snake] = v
    }
  }
  return out
}

// Mapeo snake_case (BD) → camelCase (JS)
export const toCamel = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toCamel)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v
  }
  return out
}

// Validar y convertir ID a UUID; si no es UUID válido, generar uno determinístico
function toValidUuid(id) {
  if (!id) return undefined
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRe.test(id)) return id
  let hash = 0
  const str = String(id)
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex}-0000-4000-8000-${hex.slice(0, 12).padStart(12, '0')}`
}

// Filtrar objeto a solo columnas conocidas
function pickKnown(obj, columns) {
  const out = {}
  for (const col of columns) {
    if (obj[col] !== undefined) out[col] = obj[col]
  }
  return out
}

// Columnas conocidas por tabla (whitelist) — must match actual DB columns exactly
const COLUMNS = {
  orders: ['id','folio','folio_date','service_type','table_id','client_id','client_name','client_phone','client_address','client_colony','client_reference','items','subtotal','discount','discount_reason','tip','delivery_cost','packaging_cost','total','coupon_code','coupon_id','status','kitchen_status','payment','paid','payment_info','paid_at','cash_received','cash_change','created_by','created_by_role','created_at','closed_at','canceled_at','cancel_reason','rider_id','locked_by','locked_at','next_folio','updated_at','note','updated_by','canceled_by','printed_at','client'],
  products: ['id','name','description','emoji','image','price','cost','category_id','sku','available','featured','order','stock','unit_label','low_stock_at','mod_group_ids','promo','created_at','updated_at'],
  categories: ['id','name','description','emoji','image','order','featured','created_at','updated_at'],
  tables: ['id','name','capacity','status','salon_id','order_id','created_at','updated_at'],
  clients: ['id','name','phone','address','colony','reference','notes','created_at','updated_at'],
  riders: ['id','name','phone','active','status','current_order_id','deliveries_count','created_at','updated_at'],
  users: ['id','name','role','password','active','created_at','updated_at'],
  settings: ['id','printer','payments','notifications','appearance','delivery','created_at','updated_at'],
  mod_groups: ['id','name','type','required','min','max','surcharge_second','default_value','free_count','description','category','image','items','created_at','updated_at'],
  coupons: ['id','code','type','value','min_purchase','max_uses','used_count','start','end','active','client_id','category_ids','product_ids','created_at','updated_at'],
  campaigns: ['id','name','description','start','end','active','created_at','updated_at'],
  salons: ['id','name','order','created_at','updated_at'],
  menu_digital: ['id','enabled','mode','services','accent','welcome','created_at','updated_at'],
}

// Generic sync function for any table
async function syncEntityToSupabase(table, entity) {
  const mapped = toSnake({ ...entity, id: toValidUuid(entity.id) })
  // Convert known UUID fields
  const uuidFields = ['category_id', 'table_id', 'client_id', 'rider_id', 'coupon_id', 'locked_by', 'salon_id', 'order_id', 'current_order_id', 'product_id', 'user_id']
  for (const field of uuidFields) {
    if (mapped[field]) mapped[field] = toValidUuid(mapped[field])
  }
  const columns = COLUMNS[table] || []
  const filtered = pickKnown(mapped, columns)
  const { error } = await supabase
    .from(table)
    .upsert(filtered, { onConflict: 'id' })
  if (error) {
    console.error(`Supabase sync ${table} error:`, error.message)
    return false
  }
  return true
}

async function deleteEntityFromSupabase(table, id) {
  const validId = toValidUuid(id)
  if (!validId) return false
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', validId)
  if (error) {
    console.error(`Supabase delete ${table} error:`, error.message)
    return false
  }
  return true
}

// Si el folio tuvo que corregirse contra la BD, persistir el cambio en el
// estado local (localStorage) para que nextFolio y el pedido queden alineados.
// Se escribe directo a localStorage para no crear dependencia circular con storage.js.
function updateLocalOrderFolio(orderId, folio) {
  try {
    const KEY = 'pdv_state_v2'
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    const o = (s.orders || []).find((x) => x.id === orderId)
    if (o) {
      o.folio = folio
      if (!Number.isFinite(s.nextFolio) || folio >= s.nextFolio) s.nextFolio = folio + 1
      localStorage.setItem(KEY, JSON.stringify(s))
    }
  } catch { /* noop */ }
}

// Sync de pedidos: debe respetar el índice único orders_folio_idx.
// Si el upsert por id choca porque el folio ya está ocupado por OTRO id
// (estado desalineado tras el merge local↔remoto o pedidos de sesiones previas),
// pedimos un folio nuevo y único a la BD vía la RPC get_next_folio() y reintentamos.
export async function syncOrderToSupabase(order) {
  const cols = COLUMNS.orders || []
  const payload = pickKnown(toSnake({ ...order, id: toValidUuid(order.id) }), cols)
  const { error } = await supabase
    .from('orders')
    .upsert(payload, { onConflict: 'id' })
  if (!error) return true
  // 409 por folio duplicado: obtener folio fresco de la BD y reintentar
  if (/folio_idx|duplicate key/i.test(error.message || '')) {
    try {
      const { data: folio, error: rpcErr } = await supabase.rpc('get_next_folio', { p_date: order.folioDate || new Date().toISOString().slice(0, 10) })
      if (!rpcErr && folio) {
        const o2 = pickKnown(toSnake({ ...order, id: toValidUuid(order.id), folio }), cols)
        const { error: e2 } = await supabase
          .from('orders')
          .upsert(o2, { onConflict: 'folio_date,folio' })
        if (!e2) {
          try { updateLocalOrderFolio(order.id, folio) } catch { /* noop */ }
          return true
        }
      }
    } catch { /* noop */ }
  }
  console.error('Supabase sync orders error:', error.message)
  return false
}

export async function syncProductToSupabase(product) {
  return syncEntityToSupabase('products', product)
}

export async function syncCategoryToSupabase(category) {
  return syncEntityToSupabase('categories', category)
}

export async function syncTableToSupabase(table) {
  return syncEntityToSupabase('tables', table)
}

export async function syncClientToSupabase(client) {
  return syncEntityToSupabase('clients', client)
}

export async function syncRiderToSupabase(rider) {
  return syncEntityToSupabase('riders', rider)
}

export async function syncUserToSupabase(user) {
  return syncEntityToSupabase('users', user)
}

export async function syncSettingsToSupabase(settings) {
  const settingsMapped = toSnake({ id: '00000000-0000-0000-0000-000000000001', ...settings })
  const columns = COLUMNS.settings
  const filtered = pickKnown(settingsMapped, columns)
  const { error } = await supabase
    .from('settings')
    .upsert(filtered, { onConflict: 'id' })
  if (error) {
    console.error('Supabase sync settings error:', error.message)
    return false
  }
  return true
}

export async function syncModGroupToSupabase(modGroup) {
  return syncEntityToSupabase('mod_groups', modGroup)
}

export async function syncCouponToSupabase(coupon) {
  return syncEntityToSupabase('coupons', coupon)
}

export async function syncCampaignToSupabase(campaign) {
  return syncEntityToSupabase('campaigns', campaign)
}

export async function syncSalonToSupabase(salon) {
  return syncEntityToSupabase('salons', salon)
}

export async function syncMenuDigitalToSupabase(menuDigital) {
  return syncEntityToSupabase('menu_digital', { id: '00000000-0000-0000-0000-000000000002', ...menuDigital })
}

// Delete functions
export async function deleteOrderFromSupabase(id) {
  return deleteEntityFromSupabase('orders', id)
}

export async function deleteProductFromSupabase(id) {
  return deleteEntityFromSupabase('products', id)
}

export async function deleteCategoryFromSupabase(id) {
  return deleteEntityFromSupabase('categories', id)
}

export async function deleteTableFromSupabase(id) {
  return deleteEntityFromSupabase('tables', id)
}

export async function deleteClientFromSupabase(id) {
  return deleteEntityFromSupabase('clients', id)
}

export async function deleteRiderFromSupabase(id) {
  return deleteEntityFromSupabase('riders', id)
}

export async function deleteUserFromSupabase(id) {
  return deleteEntityFromSupabase('users', id)
}

export async function deleteModGroupFromSupabase(id) {
  return deleteEntityFromSupabase('mod_groups', id)
}

export async function deleteCouponFromSupabase(id) {
  return deleteEntityFromSupabase('coupons', id)
}

export async function deleteCampaignFromSupabase(id) {
  return deleteEntityFromSupabase('campaigns', id)
}

export async function deleteSalonFromSupabase(id) {
  return deleteEntityFromSupabase('salons', id)
}

// Lock de cobro para multi-máquina
export async function acquirePayLock(orderId, machineId) {
  const { data, error } = await supabase.rpc('can_pay_order', {
    p_order_id: orderId,
    p_machine_id: machineId
  })
  if (error) {
    console.error('Supabase acquire lock error:', error.message)
    const { data: result } = await supabase
      .from('orders')
      .update({ locked_by: machineId, locked_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('locked_by', null)
      .select('locked_by')
    if (result && result.length > 0) return true
    return false
  }
  return data === true
}

export async function releasePayLock(orderId) {
  const { error } = await supabase.rpc('release_order_lock', {
    p_order_id: orderId,
    p_machine_id: getMachineId()
  })
  if (error) {
    console.error('Supabase release lock error:', error.message)
    await supabase
      .from('orders')
      .update({ locked_by: null, locked_at: null })
      .eq('id', orderId)
      .eq('locked_by', getMachineId())
  }
}

// --- Order Editing Lock (prevents concurrent edits on the same order) ---

const getMachineId = () => {
  let id = null
  try { id = localStorage.getItem('postia_machine_id') } catch {}
  if (!id) { id = crypto.randomUUID?.() || 'mach-' + Date.now(); try { localStorage.setItem('postia_machine_id', id) } catch {} }
  return id
}

export function getMachineIdPublic() { return getMachineId() }

/** Atomically try to acquire editing lock. Returns true if acquired/owned, false if locked by another machine. */
export async function acquireOrderLock(orderId, machineId) {
  const mid = machineId || getMachineId()
  const { data, error } = await supabase.rpc('acquire_order_lock', {
    p_order_id: orderId,
    p_machine_id: mid
  })
  if (error) {
    console.error('Supabase acquire order lock error:', error.message)
    // Fallback: optimistic local-only
    return null
  }
  return data === true
}

/** Release editing lock (only if we own it) */
export async function releaseOrderLock(orderId, machineId) {
  const mid = machineId || getMachineId()
  const { error } = await supabase.rpc('release_order_lock', {
    p_order_id: orderId,
    p_machine_id: mid
  })
  if (error) {
    console.error('Supabase release order lock error:', error.message)
    await supabase
      .from('orders')
      .update({ locked_by: null, locked_at: null })
      .eq('id', orderId)
      .eq('locked_by', mid)
  }
}

// Sincronizar todo el state al inicio (para poblar Supabase con datos locales)
export async function syncFullStateToSupabase(state) {
  for (const category of state.categories || []) {
    await syncCategoryToSupabase(category)
  }
  for (const product of state.products || []) {
    await syncProductToSupabase(product)
  }
  for (const table of state.tables || []) {
    await syncTableToSupabase(table)
  }
  for (const client of state.clients || []) {
    await syncClientToSupabase(client)
  }
  for (const rider of state.riders || []) {
    await syncRiderToSupabase(rider)
  }
  for (const user of state.users || []) {
    await syncUserToSupabase(user)
  }
  for (const modGroup of state.modGroups || []) {
    await syncModGroupToSupabase(modGroup)
  }
  for (const coupon of state.coupons || []) {
    await syncCouponToSupabase(coupon)
  }
  for (const campaign of state.campaigns || []) {
    await syncCampaignToSupabase(campaign)
  }
  for (const salon of state.salons || []) {
    await syncSalonToSupabase(salon)
  }
  for (const order of state.orders || []) {
    await syncOrderToSupabase(order)
  }
  await syncSettingsToSupabase(state.settings)
  if (state.menuDigital) {
    await syncMenuDigitalToSupabase(state.menuDigital)
  }
}

// Realtime sync: suscribirse a cambios en TODAS las tablas
// Each mount gets a unique channel name to avoid React StrictMode collision
export function startRealtimeSync(onChange) {
  const tables = [
    'orders', 'products', 'categories', 'tables', 'clients',
    'riders', 'users', 'settings', 'mod_groups', 'coupons',
    'campaigns', 'salons', 'menu_digital'
  ]

  const channelName = 'postia-realtime-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  let channel = supabase.channel(channelName)
  for (const t of tables) {
    channel = channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: t,
    }, (payload) => onChange?.(payload))
  }
  channel.subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Cargar pedidos desde Supabase (para inicializar el state local)
export async function loadOrdersFromSupabase() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Supabase load orders error:', error.message)
    return []
  }
  return (data || []).map(toCamel)
}

// Cargar state completo desde Supabase (para inicializar)
export async function loadStateFromSupabase() {
  const [orders, products, categories, tables, clients, riders, users, settings, modGroups, coupons, campaigns, salons, menuDigital] = await Promise.all([
    loadOrdersFromSupabase(),
    supabase.from('products').select('*').order('order', { ascending: true }).then(r => (r.data || []).map(toCamel)),
    supabase.from('categories').select('*').order('order', { ascending: true }).then(r => (r.data || []).map(toCamel)),
    supabase.from('tables').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('clients').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('riders').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('users').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('settings').select('*').eq('id', '00000000-0000-0000-0000-000000000001').single().then(r => r.data ? toCamel(r.data) : null),
    supabase.from('mod_groups').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('coupons').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('campaigns').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('salons').select('*').then(r => (r.data || []).map(toCamel)),
    supabase.from('menu_digital').select('*').eq('id', '00000000-0000-0000-0000-000000000002').maybeSingle().then(r => r.data ? toCamel(r.data) : null),
  ])
  return {
    orders,
    products,
    categories,
    tables,
    clients,
    riders,
    users,
    modGroups,
    coupons,
    campaigns,
    salons,
    menuDigital,
    settings: settings || { printer: {}, payments: {}, notifications: {}, appearance: {}, delivery: {} },
  }
}