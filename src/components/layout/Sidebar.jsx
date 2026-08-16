import React, { useCallback, useEffect, useState } from 'react'
import { X, ChevronsLeft, ChevronsRight, Receipt, ChefHat, Package, Tags, Users, Banknote, BarChart3, Palette, Settings, History, Layers, Menu, QrCode, Home } from 'lucide-react'

export const GROUPS = [
  { label: 'Operación', items: [
    { id: 'pedidos', label: 'Pedidos', icon: Receipt, badge: 'orders' },
    { id: 'cocina', label: 'Cocina', icon: ChefHat },
    { id: 'caja', label: 'Caja', icon: Banknote },
  ]},
  { label: 'Catálogo', items: [
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'categorias', label: 'Categorías', icon: Tags },
    { id: 'modificadores', label: 'Modificadores', icon: Layers },
  ]},
  { label: 'Menú Digital', items: [
    { id: '__menu_preview', label: 'Vista previa', icon: Menu, action: 'menuPreview' },
    { id: '__menu_qr', label: 'QR y enlaces', icon: QrCode, action: 'menuQr' },
  ]},
  { label: 'Reportes', items: [
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ]},
  { label: 'Administración', items: [
    { id: 'clientes', label: 'Clientes', icon: Users },
  ]},
]

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const SidebarNav = React.memo(function SidebarNav({ groups, tab, onNav, collapsed, orderCount, menuAbierto, onMenuPreview, onMenuQr }) {
  const handleNav = useCallback((id) => () => onNav(id), [onNav])

  const getBadgeCount = (badge) => {
    if (badge === 'orders') return orderCount > 0 ? orderCount : null
    return null
  }

  const handleItemClick = (it) => {
    if (it.action === 'menuPreview') return onMenuPreview()
    if (it.action === 'menuQr') return onMenuQr()
    onNav(it.id)
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navegación principal">
      {/* Inicio — standalone */}
      <button
        onClick={handleNav('inicio')}
        title={collapsed ? 'Inicio' : undefined}
        aria-current={tab === 'inicio' ? 'page' : undefined}
        className={cn(
          'group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1',
          collapsed && 'justify-center px-2',
          tab === 'inicio'
            ? 'bg-brand text-white shadow-md shadow-brand/20'
            : 'text-white/70 hover:text-white hover:bg-white/8'
        )}
      >
        {tab === 'inicio' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />}
        <Home size={18} className={cn('shrink-0', tab === 'inicio' ? '' : 'group-hover:scale-105')} />
        {!collapsed && <span>Inicio</span>}
      </button>

      {groups.map((g) => (
        <div key={g.label} className="mt-3">
          {!collapsed && (
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">{g.label}</div>
          )}
          <div className="space-y-0.5" role="list">
            {g.items.map((it) => {
              const Icon = it.icon
              const active = tab === it.id
              const badgeCount = getBadgeCount(it.badge)
              const isMenuPreview = it.action === 'menuPreview'
              const previewActive = isMenuPreview && menuAbierto
              const itemActive = active || previewActive

              return (
                <button
                  key={it.id}
                  onClick={() => handleItemClick(it)}
                  title={collapsed ? it.label : undefined}
                  aria-current={itemActive ? 'page' : undefined}
                  role="listitem"
                  className={cn(
                    'group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 touch-target',
                    collapsed && 'justify-center px-2',
                    itemActive
                      ? 'bg-brand/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/6'
                  )}
                >
                  {itemActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand rounded-r-full" />}
                  {isMenuPreview && menuAbierto && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 animate-pulse" />}
                  <Icon size={16} className={cn('shrink-0 transition-transform duration-200', itemActive ? '' : 'group-hover:scale-105')} />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                  {!collapsed && isMenuPreview && (
                    <span className="ml-auto text-[10px] text-white/60">{menuAbierto ? 'Activo' : 'Inactivo'}</span>
                  )}
                  {!collapsed && badgeCount && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 grid place-items-center text-[10px] font-bold bg-brand text-white rounded-full">{badgeCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
})

const CajaStatus = React.memo(function CajaStatus({ cajaAbierta, collapsed, onNavigateTo }) {
  return (
    <div className="shrink-0 px-3 py-3 border-t border-white/8">
      <button
        onClick={onNavigateTo}
        title={collapsed ? (cajaAbierta ? 'Caja abierta' : 'Caja cerrada') : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 touch-target',
          collapsed && 'justify-center',
          'text-white/60 hover:text-white hover:bg-white/6'
        )}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', cajaAbierta ? 'bg-emerald-400' : 'bg-red-400')} />
          <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', cajaAbierta ? 'bg-emerald-400' : 'bg-red-500')} />
        </span>
        {!collapsed && <span className="font-medium">{cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}</span>}
      </button>
    </div>
  )
})

export default function Sidebar({ groups, tab, onNav, cajaAbierta, sidebarOpen, setSidebarOpen, collapsed, toggleCollapse, menuAbierto, onMenuPreview, onMenuQr, orderCount, user }) {
  useEffect(() => {
    if (!sidebarOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [sidebarOpen])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  const navProps = { groups, tab, onNav, collapsed, orderCount, menuAbierto, onMenuPreview, onMenuQr }

  return (
    <>
      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-out lg:hidden',
          'bg-[#131620]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 h-12 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-white text-sm font-black">P</span>
            <span className="text-base font-extrabold text-white tracking-tight">POSTIA</span>
          </div>
          <button
            className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition touch-icon"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarNav {...navProps} collapsed={false} />
        <CajaStatus cajaAbierta={cajaAbierta} collapsed={false} onNavigateTo={() => onNav('caja')} />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col transition-[width] duration-300 ease-out',
          'bg-[#131620]',
          collapsed ? 'w-[60px]' : 'w-60'
        )}
        aria-label="Navegación principal"
      >
        <div className={cn('flex items-center border-b border-white/8 h-12 shrink-0', collapsed ? 'justify-center px-2' : 'px-4')}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5 w-full">
              <span className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center text-xs font-bold text-white uppercase shrink-0">{user?.name?.[0] || 'U'}</span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-white truncate">{user?.name || 'Usuario'}</div>
                <div className="text-[10px] text-white/60 capitalize">{user?.role || 'admin'}</div>
              </div>
            </div>
          ) : (
            <span className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center text-xs font-bold text-white uppercase">{user?.name?.[0] || 'U'}</span>
          )}
          {!collapsed && (
            <button
              onClick={toggleCollapse}
              aria-label="Colapsar menú"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition ml-1"
            >
              <ChevronsLeft size={14} />
            </button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center py-2 border-b border-white/8">
            <button
              onClick={toggleCollapse}
              aria-label="Expandir menú"
              className="flex items-center justify-center w-7 h-7 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        )}
        <SidebarNav {...navProps} />
        <CajaStatus cajaAbierta={cajaAbierta} collapsed={collapsed} onNavigateTo={() => onNav('caja')} />
      </aside>
    </>
  )
}
