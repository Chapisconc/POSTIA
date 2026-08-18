import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react'
import { readState, getCurrentUser, login, writeState } from './lib/storage'
import { seedIfEmpty } from './lib/seed'
import { ToastViewport, Button, Input } from './components/ui'
import AppShell from './components/layout/AppShell'
import { soundOk } from './lib/sound'
import { toast } from './lib/notify'
import { verifyConnection, startRealtimeSync, loadStateFromSupabase, syncFullStateToSupabase, toCamel } from './lib/supabase-client'

// Lazy loading (Fase 1 #29): cada módulo es un chunk aparte. El cajero que entra a
// POS no descarga Marketing/Auditoría/Fidelidad de inmediato. Reduce el JS inicial.
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const POS = lazy(() => import('./components/pos/POS'))
const Pedidos = lazy(() => import('./components/orders/Pedidos'))
const Mesas = lazy(() => import('./components/tables/Mesas'))
const Cocina = lazy(() => import('./components/kitchen/Cocina'))
const Domicilios = lazy(() => import('./components/delivery/Domicilios'))
const Productos = lazy(() => import('./components/catalog/Productos'))
const Categorias = lazy(() => import('./components/catalog/Categorias'))
const Modificadores = lazy(() => import('./components/catalog/Modificadores'))
const Inventario = lazy(() => import('./components/inventory/Inventario'))
const Clientes = lazy(() => import('./components/clients/Clientes'))
const Caja = lazy(() => import('./components/cash/Caja'))
const Jornadas = lazy(() => import('./components/cash/Jornadas'))
const Gastos = lazy(() => import('./components/cash/Gastos'))
const Reportes = lazy(() => import('./components/reports/Reportes'))
const HistorialPedidos = lazy(() => import('./components/ventas/HistorialPedidos'))
const Marketing = lazy(() => import('./components/growth/Marketing'))
const MenuDigital = lazy(() => import('./components/growth/MenuDigital'))
const Cupones = lazy(() => import('./components/growth/Cupones'))
const Fidelidad = lazy(() => import('./components/growth/Fidelidad'))
const Automatizaciones = lazy(() => import('./components/growth/Automatizaciones'))
const Repartidores = lazy(() => import('./components/delivery/Repartidores'))
const Equipo = lazy(() => import('./components/admin/Equipo'))
const Impresion = lazy(() => import('./components/admin/Impresion'))
const PagosCfg = lazy(() => import('./components/admin/PagosCfg'))
const NotificacionesCfg = lazy(() => import('./components/admin/NotificacionesCfg'))
const Apariencia = lazy(() => import('./components/admin/Apariencia'))
const Auditoria = lazy(() => import('./components/admin/Auditoria'))
const SettingsPage = lazy(() => import('./components/admin/SettingsPage'))
const MenuPage = lazy(() => import('./MenuPage'))

const MODULES = {
  inicio: Dashboard, pos: POS, pedidos: Pedidos, mesas: Mesas, cocina: Cocina, domicilios: Domicilios,
  productos: Productos, categorias: Categorias, modificadores: Modificadores, inventario: Inventario, clientes: Clientes,
  caja: Caja, jornadas: Jornadas, gastos: Gastos, reportes: Reportes, historial: HistorialPedidos,
  marketing: Marketing, menudigital: MenuDigital, cupones: Cupones, fidelidad: Fidelidad, automatizaciones: Automatizaciones,
  repartidores: Repartidores,
  equipo: Equipo, impresion: Impresion, pagos: PagosCfg, notificaciones: NotificacionesCfg,
  apariencia: Apariencia, auditoria: Auditoria, configuracion: SettingsPage,
}

// Fallback ligero mientras carga el chunk de un módulo.
function PageSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-line" />
      <div className="h-40 rounded-xl bg-line" />
      <div className="h-40 rounded-xl bg-line" />
    </div>
  )
}

function isMenuMode() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('menu') === '1'
}

export default function App() {
  const [tab, setTab] = useState('pedidos')
  const [params, setParams] = useState(null)
  const [state, setState] = useState(() => { seedIfEmpty(); return readState() })
  const [user, setUser] = useState(getCurrentUser())
  const [showLogin, setShowLogin] = useState(false)
  const [loginForm, setLoginForm] = useState({ name: '', password: '' })
  const [menuMode] = useState(isMenuMode)

  const refresh = useCallback(() => { seedIfEmpty(); setState(readState()) }, [])

  // Polling local cada 30s
  useEffect(() => {
    const t = setInterval(() => setState((s) => ({ ...s })), 30000)
    return () => clearInterval(t)
  }, [])

  // Intentar conectar a Supabase y iniciar realtime sync al montar.
  // El realtime DEBE iniciarse SIEMPRE (aunque falle la carga inicial) para que
  // los cambios en un dispositivo se reflejen al instante en los demás.
  useEffect(() => {
    let cleanup = null
    let pollTimer = null
    async function initSupabase() {
      try {
        const connected = await verifyConnection()
        if (!connected) {
          console.log('Supabase no disponible, usando localStorage')
          return
        }
        // Carga inicial best-effort: NO debe bloquear el arranque del realtime
        try {
          const remoteState = await loadStateFromSupabase()
          const hasRemoteData = remoteState && (
            (remoteState.orders?.length || 0) + (remoteState.products?.length || 0) +
            (remoteState.categories?.length || 0) + (remoteState.users?.length || 0) > 0
          )
          if (hasRemoteData) {
            const local = readState()
            const mergeCollection = (localArr = [], remoteArr = []) => {
              const merged = new Map()
              for (const item of localArr) merged.set(item.id, item)
              for (const item of remoteArr) {
                const existing = merged.get(item.id)
                if (!existing || (item.updatedAt || '').localeCompare(existing.updatedAt || '') > 0) {
                  merged.set(item.id, item)
                }
              }
              return [...merged.values()]
            }
            const merged = {
              ...local,
              orders: mergeCollection(local.orders, remoteState.orders),
              products: mergeCollection(local.products, remoteState.products),
              categories: mergeCollection(local.categories, remoteState.categories),
              tables: mergeCollection(local.tables, remoteState.tables),
              clients: mergeCollection(local.clients, remoteState.clients),
              riders: mergeCollection(local.riders, remoteState.riders),
              users: mergeCollection(local.users, remoteState.users),
              modGroups: mergeCollection(local.modGroups, remoteState.modGroups),
              coupons: mergeCollection(local.coupons, remoteState.coupons),
              campaigns: mergeCollection(local.campaigns, remoteState.campaigns),
              salons: mergeCollection(local.salons, remoteState.salons),
              menuDigital: remoteState.menuDigital
                ? (local.menuDigital?.updatedAt && remoteState.menuDigital.updatedAt && local.menuDigital.updatedAt > remoteState.menuDigital.updatedAt
                    ? local.menuDigital : remoteState.menuDigital)
                : local.menuDigital,
            }
            if (remoteState.settings) merged.settings = remoteState.settings
            setState(merged)
            writeState(merged)
          } else {
            const local = readState()
            await syncFullStateToSupabase(local)
          }
        } catch (e) {
          console.error('Carga inicial Supabase omitida:', e.message)
        }
        // REALTIME: se suscribe SIEMPRE (independiente de la carga inicial).
        // Nota: el realtime de Supabase puede no entregar eventos de forma fiable en
        // algunas configuraciones locales; el polling de abajo es la garantía de sync.
        cleanup = startRealtimeSync((payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          const key = TABLE_TO_KEY[payload.table]
          if (!key) return
          setState(prev => {
            if (key === 'settings') {
              return eventType === 'DELETE' ? prev : { ...prev, settings: toCamel(newRecord) }
            }
            if (key === 'menuDigital') {
              return eventType === 'DELETE' ? prev : { ...prev, menuDigital: toCamel(newRecord) }
            }
            if (eventType === 'INSERT' && newRecord) {
              const rec = toCamel(newRecord)
              if (!prev[key].some(x => x.id === rec.id)) {
                if (key === 'orders') {
                  const dup = prev[key].find(x => x.folio === rec.folio && x.folioDate === rec.folioDate)
                  if (dup) return { ...prev, [key]: prev[key].map(x => x.folio === rec.folio && x.folioDate === rec.folioDate ? rec : x) }
                }
                return { ...prev, [key]: [...prev[key], rec] }
              }
              return prev
            }
            if (eventType === 'UPDATE' && newRecord) {
              const rec = toCamel(newRecord)
              const matchId = (x) => x.id === rec.id
              const matchFolio = key === 'orders' ? (x) => x.folio === rec.folio && x.folioDate === rec.folioDate : null
              return { ...prev, [key]: prev[key].map(x => (matchId(x) || (matchFolio && matchFolio(x))) ? rec : x) }
            }
            if (eventType === 'DELETE' && oldRecord) {
              const oldRec = toCamel(oldRecord)
              return { ...prev, [key]: prev[key].filter(x => x.id !== oldRec.id) }
            }
            return prev
          })
          if (key === 'orders') {
            const rec = newRecord ? toCamel(newRecord) : null
            const oldRec = oldRecord ? toCamel(oldRecord) : null
            if (eventType === 'INSERT' && rec) {
              toast(`Nuevo pedido #${rec.folio}`, 'info')
            } else if (eventType === 'UPDATE' && rec) {
              if (rec.paid && (!oldRec || !oldRec.paid)) {
                toast(`Pedido #${rec.folio} cobrado`, 'success')
              } else if (rec.status === 'cancelado' && (!oldRec || oldRec.status !== 'cancelado')) {
                toast(`Pedido #${rec.folio} cancelado`, 'error')
              } else if (oldRec && rec.status && rec.status !== oldRec.status) {
                toast(`Pedido #${rec.folio} → ${rec.status}`, 'info')
              }
            } else if (eventType === 'DELETE' && oldRec) {
              toast(`Pedido #${oldRec.folio} eliminado`, 'warning')
            }
          }
        })
        // POLLING de respaldo: garantiza que los cambios en un dispositivo se reflejen
        // en los demás aunque el realtime de Supabase no entregue eventos. Fusiona solo
        // lo que cambió (por updatedAt) para no provocar re-renders innecesarios.
        const mergeRemote = (prev, remote) => {
          const mergeCollection = (localArr = [], remoteArr = []) => {
            const m = new Map()
            for (const it of localArr) m.set(it.id, it)
            for (const it of remoteArr) {
              const ex = m.get(it.id)
              if (!ex || (it.updatedAt || '').localeCompare(ex.updatedAt || '') > 0) m.set(it.id, it)
            }
            return [...m.values()]
          }
          const next = {
            ...prev,
            orders: mergeCollection(prev.orders, remote.orders || []),
            products: mergeCollection(prev.products, remote.products || []),
            categories: mergeCollection(prev.categories, remote.categories || []),
            tables: mergeCollection(prev.tables, remote.tables || []),
            clients: mergeCollection(prev.clients, remote.clients || []),
            riders: mergeCollection(prev.riders, remote.riders || []),
            users: mergeCollection(prev.users, remote.users || []),
            modGroups: mergeCollection(prev.modGroups, remote.modGroups || []),
            coupons: mergeCollection(prev.coupons, remote.coupons || []),
            campaigns: mergeCollection(prev.campaigns, remote.campaigns || []),
            salons: mergeCollection(prev.salons, remote.salons || []),
          }
          if (remote.menuDigital) next.menuDigital = remote.menuDigital
          if (remote.settings) next.settings = remote.settings
          // Detectar si algo cambió para evitar re-render
          const changed =
            JSON.stringify(next.orders.map(o => [o.id, o.status, o.paid, o.updatedAt]).sort()) !==
            JSON.stringify(prev.orders.map(o => [o.id, o.status, o.paid, o.updatedAt]).sort()) ||
            JSON.stringify(next.products.map(p => [p.id, p.updatedAt]).sort()) !==
            JSON.stringify(prev.products.map(p => [p.id, p.updatedAt]).sort())
          return changed ? next : prev
        }
        const pollRemote = async () => {
          try {
            const remote = await loadStateFromSupabase()
            if (!remote) return
            setState(prev => mergeRemote(prev, remote))
          } catch { /* red intermitente: ignorar */ }
        }
        pollTimer = setInterval(pollRemote, 3000)
      } catch (e) {
        console.error('Supabase init error:', e.message)
      }
    }
    initSupabase().catch(e => console.error('Supabase error:', e))
    return () => { if (cleanup) cleanup(); if (pollTimer) clearInterval(pollTimer) }
  }, [])

  const onNav = useCallback((id, p) => {
    setTab(id)
    setParams(p || null)
    setShowLogin(false)
  }, [])

  const doLogin = (e) => {
    e.preventDefault()
    const u = login(loginForm.name, loginForm.password)
    if (!u) { toast('Usuario o contraseña incorrectos', 'error'); return }
    setUser(getCurrentUser()); setShowLogin(false); soundOk(); refresh()
  }

  if (menuMode) return <MenuPage state={state} />

  const ActiveModule = MODULES[tab] || Dashboard

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <AppShell tab={tab} onNav={onNav} state={state} user={user} onRequestLogin={() => setShowLogin(true)}>
        <Suspense fallback={<PageSkeleton />}>
          <ActiveModule state={state} refresh={refresh} onNav={onNav} params={params} user={user} />
        </Suspense>
      </AppShell>

      {/* Login */}
      {showLogin && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4 bg-night/50 backdrop-blur-sm" onClick={() => setShowLogin(false)}>
          <form onSubmit={doLogin} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl border border-line shadow-lg p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-brand grid place-items-center text-2xl mb-2">🌿</div>
              <h3 className="text-lg font-bold text-night">Iniciar sesión</h3>
              <p className="text-xs text-muted">Demo: Administrador/1234 · Carlos/4321 · Cajero/1234</p>
            </div>
            <div className="space-y-2">
              <Input value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} placeholder="Usuario" required />
              <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Contraseña" required />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </div>
      )}

      <ToastViewport />
    </div>
  )
}
