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

// Mapeo camelCase (JS) → snake_case (BD), con soporte para objetos anidados (cliente → client_*)
const toSnake = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      for (const [nk, nv] of Object.entries(v)) {
        const nestedSnake = nk.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
        if (nv != null) out[`${snake}_${nestedSnake}`] = nv
      }
    } else if (v != null) {
      out[snake] = v
    }
  }
  return out
}

// Sync helpers para escribir en Supabase desde el state local
export async function syncOrderToSupabase(order) {
  const mapped = toSnake(order)
  const { error } = await supabase
    .from('orders')
    .upsert(mapped, { onConflict: 'id' })
  if (error) {
    console.error('Supabase sync order error:', error.message)
    return false
  }
  return true
}

export async function syncOrderItemsToSupabase(orderId, items) {
  // Los items se guardan dentro del JSONB de orders, no en tabla separada
  // pero si queremos consultarlos individualmente, usar esta función
  const { error } = await supabase
    .from('orders')
    .update({ items })
    .eq('id', orderId)
  if (error) {
    console.error('Supabase sync items error:', error.message)
    return false
  }
  return true
}

// Lock de cobro para multi-máquina
export async function acquirePayLock(orderId, machineId) {
  // Intenta adquirir el lock usando la función can_pay_order
  const { data, error } = await supabase.rpc('can_pay_order', {
    p_order_id: orderId,
    p_machine_id: machineId
  })
  if (error) {
    console.error('Supabase acquire lock error:', error.message)
    // Fallback: intentar con update directo
    const { data: result } = await supabase
      .from('orders')
      .update({ locked_by: machineId, locked_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('locked_by', null)
      .select('locked_by')
    if (result && result.length > 0) {
      return true
    }
    return false
  }
  return data === true
}

export async function releasePayLock(orderId) {
  const { error } = await supabase.rpc('release_order_lock', {
    p_order_id: orderId
  })
  if (error) {
    console.error('Supabase release lock error:', error.message)
    // Fallback
    await supabase
      .from('orders')
      .update({ locked_by: null, locked_at: null })
      .eq('id', orderId)
  }
}

// Sincronizar todo el state al inicio (para poblar Supabase con datos locales)
export async function syncFullStateToSupabase(state) {
  // Sincronizar pedidos (sin datos sensibles)
  for (const order of state.orders || []) {
    await syncOrderToSupabase(order)
  }
  // Sincronizar productos
  for (const product of state.products || []) {
    const { error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' })
    if (error) console.error('Supabase sync product error:', error.message)
  }
  // Sincronizar categorías
  for (const category of state.categories || []) {
    const { error } = await supabase
      .from('categories')
      .upsert(category, { onConflict: 'id' })
    if (error) console.error('Supabase sync category error:', error.message)
  }
  // Sincronizar mesas
  for (const table of state.tables || []) {
    const { error } = await supabase
      .from('tables')
      .upsert(table, { onConflict: 'id' })
    if (error) console.error('Supabase sync table error:', error.message)
  }
  // Sincronizar clientes
  for (const client of state.clients || []) {
    const { error } = await supabase
      .from('clients')
      .upsert(client, { onConflict: 'id' })
    if (error) console.error('Supabase sync client error:', error.message)
  }
  // Sincronizar riders
  for (const rider of state.riders || []) {
    const { error } = await supabase
      .from('riders')
      .upsert(rider, { onConflict: 'id' })
    if (error) console.error('Supabase sync rider error:', error.message)
  }
  // Sincronizar settings
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 'default', ...state.settings }, { onConflict: 'id' })
  if (error) console.error('Supabase sync settings error:', error.message)
  // NO sincronizar users (contiene contraseñas en texto plano)
}

// Realtime sync: suscribirse a cambios en orders y notificar al estado local
export function startRealtimeSync(onOrderChange) {
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
    }, (payload) => {
      if (onOrderChange) {
        onOrderChange(payload)
      }
    })
    .subscribe()

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
  return data || []
}

// Cargar state completo desde Supabase (para inicializar)
export async function loadStateFromSupabase() {
  const [orders, products, categories, tables, clients, riders, users, settings] = await Promise.all([
    loadOrdersFromSupabase(),
    supabase.from('products').select('*').order('order', { ascending: true }).then(r => r.data || []),
    supabase.from('categories').select('*').order('order', { ascending: true }).then(r => r.data || []),
    supabase.from('tables').select('*').then(r => r.data || []),
    supabase.from('clients').select('*').then(r => r.data || []),
    supabase.from('riders').select('*').then(r => r.data || []),
    supabase.from('users').select('*').then(r => r.data || []),
    supabase.from('settings').select('*').eq('id', 'default').single().then(r => r.data || null),
  ])
  return {
    orders,
    products,
    categories,
    tables,
    clients,
    riders,
    users,
    settings: settings || { printer: {}, payments: {}, notifications: {}, appearance: {}, delivery: {} },
  }
}
