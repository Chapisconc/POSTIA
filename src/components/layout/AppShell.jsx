import React, { useState, useEffect } from 'react'
import { MoreHorizontal, Receipt, ChefHat, Package, Tags, Users, Banknote, BarChart3, Palette, QrCode, History, Utensils, Layers } from 'lucide-react'
import Topbar from './Topbar'
import Sidebar, { GROUPS } from './Sidebar'
import { useTheme } from '../../lib/theme'

import { isCajaOpen } from '../../lib/storage'
import { toast } from '../../lib/notify'
import QRMenuModal from '../shared/QRMenuModal'

const MOBILE_NAV = [
  { id: 'pedidos', label: 'Pedidos', icon: Receipt },
  { id: 'historial', label: 'Ventas', icon: History },
  { id: '__menu_preview', label: 'Menú', icon: Utensils },
]

const MOBILE_MORE = [
  { id: 'cocina', label: 'Cocina', icon: ChefHat },
  { id: 'caja', label: 'Caja', icon: Banknote },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'categorias', label: 'Categorías', icon: Tags },
  { id: 'modificadores', label: 'Modificadores', icon: Layers },
  { id: '__menu_qr', label: 'QR y enlaces', icon: QrCode },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  { id: 'clientes', label: 'Clientes', icon: Users },
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
        <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-line px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 flex items-center justify-around shadow-[0_-2px_8px_rgba(0,0,0,0.06)]" style={{ minHeight: 56 }}>
          {MOBILE_NAV.map((it) => {
            const Icon = it.icon
            const active = tab === it.id
            return (
              <button key={it.id} onClick={() => nav(it.id)}
                className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all touch-target ${active ? 'text-brand dark:text-night' : 'text-muted hover:text-night'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? 'text-brand dark:text-night' : 'text-muted'} />
                <span className="truncate max-w-full">{it.label}</span>
              </button>
            )
          })}
          <button onClick={() => setMoreOpen(true)}
            className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all touch-target ${MOBILE_MORE.some((m) => m.id === tab) ? 'text-brand dark:text-night' : 'text-muted hover:text-night'}`}>
            <MoreHorizontal size={20} strokeWidth={MOBILE_MORE.some((m) => m.id === tab) ? 2.5 : 2} className={MOBILE_MORE.some((m) => m.id === tab) ? 'text-brand' : 'text-muted'} />
            <span className="truncate max-w-full">Más</span>
          </button>
        </nav>
      )}

      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden bg-night/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <aside className="fixed top-0 right-0 bottom-0 z-50 lg:hidden w-[78%] max-w-xs bg-card shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
              <span className="type-body font-bold text-night">Más opciones</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Cerrar" className="text-muted hover:text-night text-xl leading-none p-2 touch-icon">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {MOBILE_MORE.map((it) => {
                const Icon = it.icon
                const active = tab === it.id
                return (
                  <button key={it.id} onClick={() => nav(it.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl type-body font-semibold transition touch-target ${active ? 'bg-brand-soft text-brand-dark' : 'text-night hover:bg-page'}`}>
                    <Icon size={20} className={active ? 'text-brand dark:text-night' : 'text-muted'} />
                    {it.label}
                  </button>
                )
              })}
            </div>
          </aside>
        </>
      )}

      {/* QR Menú Modal */}
      {qrMenuOpen && (
        <QRMenuModal url={menuUrl} onClose={() => setQrMenuOpen(false)} />
      )}
    </div>
  )
}
