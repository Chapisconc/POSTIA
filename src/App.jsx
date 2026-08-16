import React, { useState, useCallback, useEffect } from 'react'
import { readState, getCurrentUser, login } from './lib/storage'
import { seedIfEmpty } from './lib/seed'
import { ToastViewport, Button, Input } from './components/ui'
import AppShell from './components/layout/AppShell'
import { soundOk } from './lib/sound'
import { toast } from './lib/notify'
import { verifyConnection, startRealtimeSync, loadStateFromSupabase, syncFullStateToSupabase } from './lib/supabase-client'

import Dashboard from './components/dashboard/Dashboard'
import POS from './components/pos/POS'
import Pedidos from './components/orders/Pedidos'
import Mesas from './components/tables/Mesas'
import Cocina from './components/kitchen/Cocina'
import Domicilios from './components/delivery/Domicilios'
import Productos from './components/catalog/Productos'
import Categorias from './components/catalog/Categorias'
import Modificadores from './components/catalog/Modificadores'
import Inventario from './components/inventory/Inventario'
import Clientes from './components/clients/Clientes'
import Caja from './components/cash/Caja'
import Jornadas from './components/cash/Jornadas'
import Gastos from './components/cash/Gastos'
import Reportes from './components/reports/Reportes'
import HistorialPedidos from './components/ventas/HistorialPedidos'
import Marketing from './components/growth/Marketing'
import MenuDigital from './components/growth/MenuDigital'
import Cupones from './components/growth/Cupones'
import Fidelidad from './components/growth/Fidelidad'
import Automatizaciones from './components/growth/Automatizaciones'
import Repartidores from './components/delivery/Repartidores'
import Equipo from './components/admin/Equipo'
import Impresion from './components/admin/Impresion'
import PagosCfg from './components/admin/PagosCfg'
import NotificacionesCfg from './components/admin/NotificacionesCfg'
import Apariencia from './components/admin/Apariencia'
import Auditoria from './components/admin/Auditoria'
import SettingsPage from './components/admin/SettingsPage'
import MenuPage from './MenuPage'

const MODULES = {
  inicio: Dashboard, pos: POS, pedidos: Pedidos, mesas: Mesas, cocina: Cocina, domicilios: Domicilios,
  productos: Productos, categorias: Categorias, modificadores: Modificadores, inventario: Inventario, clientes: Clientes,
  caja: Caja, jornadas: Jornadas, gastos: Gastos, reportes: Reportes, historial: HistorialPedidos,
  marketing: Marketing, menudigital: MenuDigital, cupones: Cupones, fidelidad: Fidelidad, automatizaciones: Automatizaciones,
  repartidores: Repartidores,
  equipo: Equipo, impresion: Impresion, pagos: PagosCfg, notificaciones: NotificacionesCfg,
  apariencia: Apariencia, auditoria: Auditoria, configuracion: SettingsPage,
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

  // Intentar conectar a Supabase y iniciar realtime sync al montar
  useEffect(() => {
    async function initSupabase() {
      try {
        const connected = await verifyConnection()
        if (!connected) {
          console.log('Supabase no disponible, usando localStorage')
          return
        }
        // Cargar state desde Supabase y sincronizar si hay datos
        const remoteState = await loadStateFromSupabase()
        if (remoteState && remoteState.orders && remoteState.orders.length > 0) {
          const local = readState()
          // Merge: cada colección gana la versión con el updated_at más reciente por registro
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
          }
          setState(merged)
          toast('Conectado a Supabase', 'success')
        } else {
          const local = readState()
          await syncFullStateToSupabase(local)
        }
        // Iniciar realtime sync para recibir cambios de otros dispositivos
        const cleanup = startRealtimeSync((payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          if (eventType === 'INSERT' && newRecord) {
            // Un pedido nuevo fue creado en otro dispositivo
            setState(prev => {
              if (!prev.orders.some(o => o.id === newRecord.id)) {
                return { ...prev, orders: [...prev.orders, newRecord] }
              }
              return prev
            })
            toast(`Nuevo pedido #${newRecord.folio}`, 'info')
          } else if (eventType === 'UPDATE' && newRecord) {
            // Un pedido fue actualizado (estado, cobro, etc.)
            setState(prev => ({
              ...prev,
              orders: prev.orders.map(o => o.id === newRecord.id ? { ...o, ...newRecord } : o)
            }))
          } else if (eventType === 'DELETE' && oldRecord) {
            // Un pedido fue eliminado
            setState(prev => ({
              ...prev,
              orders: prev.orders.filter(o => o.id !== oldRecord.id)
            }))
          }
        })
        return () => cleanup && cleanup()
      } catch (e) {
        console.error('Supabase init error:', e.message)
      }
    }
    initSupabase().catch(e => console.error('Supabase error:', e))
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
        <ActiveModule state={state} refresh={refresh} onNav={onNav} params={params} user={user} />
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
