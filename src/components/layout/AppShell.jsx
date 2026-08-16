import React, { useState, useEffect } from 'react'
import { MoreHorizontal, Receipt, ChefHat, Package, Tags, Users, Banknote, BarChart3, Palette, Menu, QrCode } from 'lucide-react'
import Topbar from './Topbar'
import Sidebar, { GROUPS } from './Sidebar'
import { useTheme } from '../../lib/theme'
import { Button } from '../ui'
import { isCajaOpen } from '../../lib/storage'
import { toast } from '../../lib/notify'
import QRMenuModal from '../shared/QRMenuModal'

const MOBILE_NAV = [
  { id: 'pedidos', label: 'Pedidos', icon: Receipt },
  { id: 'cocina', label: 'Cocina', icon: ChefHat },
]

const MOBILE_MORE = [
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'categorias', label: 'Categorías', icon: Tags },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'caja', label: 'Caja', icon: Banknote },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  { id: 'apariencia', label: 'Apariencia', icon: Palette },
]

export default function AppShell({ tab, onNav, state, user, onRequestLogin, children }) {
  const cajaAbierta = isCajaOpen()
  const [prefs, setPrefs] = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [qrMenuOpen, setQrMenuOpen] = useState(false)
  const laptopMQ = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px) and (max-width: 1439px)')
  const [collapsed, setCollapsed] = useState(() => {
    if (prefs.sidebar === 'compacto') return true
    if (prefs.sidebar === 'expandido') return false
    return laptopMQ ? laptopMQ.matches : false
  })
  const [moreOpen, setMoreOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)

  useEffect(() => {
    if (!laptopMQ) return
    const onChange = (e) => { if (prefs.sidebar === 'auto') setCollapsed(e.matches) }
    laptopMQ.addEventListener('change', onChange)
    return () => laptopMQ.removeEventListener('change', onChange)
  }, [laptopMQ, prefs.sidebar])

  useEffect(() => {
    if (prefs.sidebar === 'compacto') setCollapsed(true)
    else if (prefs.sidebar === 'expandido') setCollapsed(false)
  }, [prefs.sidebar])

  const nav = (id, p) => {
    onNav(id, p)
    setSidebarOpen(false)
    setMoreOpen(false)
    setUserMenu(false)
  }

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?menu=1`
    : `${window.location.origin}?menu=1`

  return (
    <div className="h-screen flex flex-col bg-page overflow-hidden">
      <Topbar state={state} user={user} userMenu={userMenu} setUserMenu={setUserMenu}
        onOpenMenu={() => setSidebarOpen(true)} onLoginOpen={onRequestLogin}
        onNav={nav} />

      {/* Cuerpo: Sidebar + contenido */}
      <div className="flex flex-1 min-h-0">
        <Sidebar groups={GROUPS} tab={tab} onNav={nav} cajaAbierta={cajaAbierta}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
          collapsed={collapsed} toggleCollapse={() => setCollapsed((c) => !c)}
          menuAbierto={menuAbierto}
          onMenuPreview={() => toast('Vista previa del menú digital', 'info')}
          onMenuQr={() => setQrMenuOpen(true)}
          orderCount={state.orders.filter(o => !['finalizado', 'cancelado'].includes(o.status)).length} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 w-full px-4 pt-4 pb-24 lg:px-6 lg:pb-5 xl:px-8 overflow-x-hidden overflow-y-auto flex flex-col">
            {children}
          </main>

          <footer className="hidden lg:block text-center text-xs text-muted py-4 shrink-0">
            POSTIA · Datos guardados en este navegador
          </footer>
        </div>
      </div>

      {/* Barra de navegación inferior (móvil / tablet) */}
      {tab !== 'pos' && (
        <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-line px-2 pb-[max(env(safe-area-inset-bottom),8px)] flex items-end justify-around overflow-x-hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          {MOBILE_NAV.map((it) => {
            const Icon = it.icon
            const active = tab === it.id
            return (
              <button key={it.id} onClick={() => nav(it.id)}
                className={`flex flex-1 min-w-0 flex-col items-center gap-0.5 px-2 pt-2 pb-1 rounded-xl text-[10px] font-semibold transition touch-target ${active ? 'text-brand' : 'text-muted hover:text-night'}`}>
                <Icon size={21} className={active ? 'text-brand' : 'text-muted'} />
                <span className="truncate max-w-full">{it.label}</span>
              </button>
            )
          })}
          <button onClick={() => setMoreOpen(true)}
            className={`flex flex-1 min-w-0 flex-col items-center gap-0.5 px-2 pt-2 pb-1 rounded-xl text-[10px] font-semibold transition touch-target ${MOBILE_MORE.some((m) => m.id === tab) ? 'text-brand' : 'text-muted hover:text-night'}`}>
            <MoreHorizontal size={21} className={MOBILE_MORE.some((m) => m.id === tab) ? 'text-brand' : 'text-muted'} />
            <span className="truncate max-w-full">Más</span>
          </button>
        </nav>
      )}

      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden bg-night/40" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-card rounded-t-3xl shadow-2xl p-4 pb-[max(env(safe-area-inset-bottom),16px)] animate-pop">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-night">Más opciones</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Cerrar" className="text-muted hover:text-night text-xl leading-none p-1">×</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOBILE_MORE.map((it) => {
                const Icon = it.icon
                const active = tab === it.id
                return (
                  <button key={it.id} onClick={() => nav(it.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition ${active ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-night hover:bg-page'}`}>
                    <Icon size={20} className={active ? 'text-brand' : 'text-muted'} />
                    {it.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* QR Menú Modal */}
      {qrMenuOpen && (
        <QRMenuModal url={menuUrl} onClose={() => setQrMenuOpen(false)} />
      )}
    </div>
  )
}
