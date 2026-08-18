import React, { useState, useEffect, useRef } from 'react'
import { ChefHat, Volume2, VolumeX, Printer, Eye, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import TicketModal from '../shared/TicketModal'
import { fmtDuration, fmtTime } from '../../lib/format'
import { toast, toastOk, toastErr } from '../../lib/notify'
import { soundNewOrder, soundUrgent, setMuted, isMuted } from '../../lib/sound'
import { SERVICE_LABEL, setKitchenStatus } from '../../lib/storage'

const URGENT_MS = 15 * 60 * 1000

function KitchenCard({ order, table, now, onReprint, onView, onAdvance }) {
  const elapsed = Math.max(0, now.getTime() - new Date(order.createdAt).getTime())
  const urgent = elapsed >= URGENT_MS
  const serviceLabel = order.serviceType === 'mesa' && table ? table.name : SERVICE_LABEL[order.serviceType] || order.serviceType

  const getAction = () => {
    if (order.status === 'porcobrar' || order.status === 'finalizado') {
      return { label: '✓ ENTREGADO', color: 'success', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} entregado`) }
    }
    if (order.kitchenStatus === 'nuevo') {
      return { label: '✓ ACEPTAR', color: 'info', onClick: () => onAdvance(order, 'preparando', `Pedido #${order.folio} en preparación`) }
    }
    if (order.kitchenStatus === 'preparando') {
      if (order.serviceType === 'domicilio') {
        return { label: '🚚 LISTO PARA REPARTO', color: 'brand', onClick: () => onAdvance(order, 'listo', `Pedido #${order.folio} listo para reparto`) }
      }
      return { label: '✓ LISTO', color: 'success', onClick: () => onAdvance(order, 'listo', `Pedido #${order.folio} listo`) }
    }
    if (order.kitchenStatus === 'listo') {
      if (order.serviceType === 'domicilio') {
        return { label: '🚚 ENTREGADO', color: 'success', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} entregado`) }
      }
      return { label: '✓ ENTREGADO', color: 'success', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} entregado`) }
    }
    return null
  }

  const action = getAction()
  const bgColor = urgent ? 'bg-danger-soft' : 'bg-page'
  const borderColor = urgent ? 'border-danger' : 'border-line'

  return (
    <div className={`flex flex-col w-full rounded-xl border ${borderColor} bg-card overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${bgColor} border-b border-line`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card text-xs font-bold text-night">#{order.folio}</span>
            {urgent && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger text-[10px] font-bold text-white uppercase"><AlertTriangle size={10} /> URGENTE</span>}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line">
            <Clock size={12} className="text-muted" />
            <span className={`text-xs font-mono font-bold tabular-nums ${urgent ? 'text-danger' : elapsed > 10 * 60 * 1000 ? 'text-warning' : 'text-success'}`}>{fmtDuration(elapsed)}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-night flex items-center gap-1">
            {order.serviceType === 'domicilio' ? '🚚' : order.serviceType === 'mesa' ? '🍽️' : '🛍️'}
            {serviceLabel}
          </span>
          <span className="text-muted/40">·</span>
          <span className="font-mono">{fmtTime(order.createdAt)}</span>
          {order.client?.name && <span className="truncate">· {order.client.name}</span>}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-3 py-2.5 space-y-1.5 overflow-y-auto max-h-[240px]">
        {order.items.map((it) => (
          <div key={it.id} className="flex items-baseline gap-2 py-1 last:border-0">
            <span className="text-xs font-bold text-muted tabular-nums w-5">{it.qty}</span>
            <span className="text-sm font-semibold text-night flex-1">{it.emoji} {it.name}</span>
            {it.note && <span title={it.note} className="text-xs text-gold">📝</span>}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-line space-y-2">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all touch-target
              ${action.color === 'brand' ? 'bg-brand text-white hover:bg-brand-dark' :
                action.color === 'success' ? 'bg-success text-white hover:bg-success-dark' :
                action.color === 'info' ? 'bg-info text-white hover:bg-info-dark' :
                'bg-danger text-white hover:bg-danger-dark'}`}
          >
            <CheckCircle2 size={16} /> {action.label}
          </button>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onReprint}
            className="flex-1 h-10 rounded-xl border border-line grid place-items-center text-muted hover:bg-page text-xs font-medium touch-target">
            <Printer size={14} /> Ticket
          </button>
          <button type="button" onClick={onView}
            className="flex-1 h-10 rounded-xl border border-line grid place-items-center text-muted hover:bg-page text-xs font-medium touch-target">
            <Eye size={14} /> Detalle
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Cocina({ state, refresh, onNav, params, user }) {
  const [now, setNow] = useState(() => new Date())
  const [muted, setMutedState] = useState(() => isMuted())
  const [ticketOrder, setTicketOrder] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const seenRef = useRef(new Set())
  const urgentRef = useRef(new Set())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh, isFullscreen])

  const active = state.orders.filter((o) =>
    o.status !== 'finalizado' && o.status !== 'cancelado' &&
    ['nuevo', 'preparando'].includes(o.kitchenStatus)
  )

  const today = new Date().toISOString().split('T')[0]
  const recent = state.orders
    .filter((o) => o.kitchenStatus === 'entregado' && o.closedAt?.startsWith(today))
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
    .slice(0, 10)

  // Tablero por estado de cocina: cada columna es un panel ajustable a la pantalla
  const boardOrders = state.orders.filter((o) =>
    o.status !== 'finalizado' && o.status !== 'cancelado' &&
    ['nuevo', 'preparando', 'listo'].includes(o.kitchenStatus)
  )
  const columns = [
    { key: 'nuevo', title: 'Pendientes', tone: 'danger', orders: boardOrders.filter((o) => o.kitchenStatus === 'nuevo') },
    { key: 'preparando', title: 'En preparación', tone: 'brand', orders: boardOrders.filter((o) => o.kitchenStatus === 'preparando') },
    { key: 'listo', title: 'Listos', tone: 'success', orders: boardOrders.filter((o) => o.kitchenStatus === 'listo') },
  ]
  const COL_TONE = {
    danger: 'bg-danger-soft text-danger-dark',
    brand: 'bg-brand-soft text-brand-dark',
    success: 'bg-success-soft text-success-dark',
  }

  const newSig = active.filter((o) => o.kitchenStatus === 'nuevo').map((o) => o.folio).sort((a, b) => a - b).join(',')
  useEffect(() => {
    const cur = new Set(newSig ? newSig.split(',') : [])
    let played = false
    for (const f of cur) {
      if (!seenRef.current.has(f)) { seenRef.current.add(f); played = true }
    }
    if (played) soundNewOrder()
  }, [newSig])

  useEffect(() => {
    for (const o of active) {
      if (Date.now() - new Date(o.createdAt).getTime() >= URGENT_MS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id)
        soundUrgent()
      }
    }
  }, [now])

  const tableOf = (id) => state.tables.find((t) => t.id === id)

  const doAdvance = (o, kstatus, msg) => {
    try { setKitchenStatus(o.id, kstatus, user); refresh(); toastOk(msg) }
    catch (e) { console.error('Error al actualizar:', e); toastErr('Error al actualizar') }
  }

  const markAllPrepared = () => {
    try {
      const toAdvance = active.filter((o) => o.kitchenStatus === 'preparando')
      toAdvance.forEach((o) => setKitchenStatus(o.id, 'listo', user))
      refresh()
      if (toAdvance.length > 0) toastOk(`${toAdvance.length} pedido(s) marcado(s) como listo(s)`)
    } catch (e) { console.error('Error al actualizar:', e); toastErr('Error al actualizar') }
  }

  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    setMutedState(m)
    toast(m ? '🔇 Sonido apagado' : '🔊 Sonido activado')
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const nuevosCount = active.filter((o) => o.kitchenStatus === 'nuevo').length
  const preparandoCount = active.filter((o) => o.kitchenStatus === 'preparando').length

  const clock = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className={`-mx-4 -my-5 bg-page min-h-[calc(100vh-120px)] ${isFullscreen ? 'fixed inset-0 z-[100] m-0 bg-page' : ''}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-danger grid place-items-center text-white"><ChefHat size={18} /></span>
              <span className="text-lg font-extrabold text-night tracking-wide">COCINA</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl border border-line bg-page text-sm">
              <span className="text-muted">Activos</span>
              <span className="px-1.5 py-0.5 rounded-md bg-danger-soft text-danger text-xs font-bold">{active.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {preparandoCount > 0 && (
              <button
                type="button"
                onClick={markAllPrepared}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition"
              >
                <CheckCircle2 size={15} /> Marcar listos ({preparandoCount})
              </button>
            )}
            <button type="button" onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${showHistory ? 'bg-brand text-white' : 'text-muted hover:bg-page border border-line'}`}>
              Historial
            </button>
            <span className="text-xs font-mono text-muted hidden sm:inline">{clock}</span>
            <button type="button" onClick={refresh}
              className="w-8 h-8 rounded-xl border border-line grid place-items-center text-muted hover:bg-page transition" aria-label="Actualizar">
              <RefreshCw size={14} />
            </button>
            <button type="button" onClick={toggleMute}
              className="w-8 h-8 rounded-xl border border-line grid place-items-center text-muted hover:bg-page transition" aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24 lg:pb-4">
        {showHistory ? (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-night mb-2">Órdenes del día</h3>
            {recent.length === 0 ? (
              <p className="text-sm text-muted">No hay órdenes entregadas hoy</p>
            ) : (
              recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2 bg-card rounded-xl border border-line">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-night text-xs">#{o.folio}</span>
                    <span className="text-xs text-muted truncate">{o.items.map(i => i.name).join(', ')}</span>
                  </div>
                  <button onClick={() => setTicketOrder(o)} className="text-xs text-muted hover:text-night">
                    <Eye size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : columns.every((c) => c.orders.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4 opacity-20">🍳</div>
            <p className="text-lg font-semibold text-night mb-1">Sin pedidos en cocina</p>
            <p className="text-sm text-muted max-w-xs">Los pedidos aparecerán aquí cuando se creen. Los nuevos pedidos suenan automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {columns.map((col) => {
              const list = [...col.orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              return (
                <section key={col.key} className="flex flex-col rounded-2xl border border-line bg-card/60 overflow-hidden min-h-[220px]">
                  <header className={`flex items-center justify-between px-4 py-2.5 border-b border-line ${COL_TONE[col.tone]}`}>
                    <span className="text-sm font-extrabold uppercase tracking-wide">{col.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-card text-xs font-bold">{list.length}</span>
                  </header>
                  <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
                    {list.length === 0 ? (
                      <p className="text-xs text-muted text-center py-6">Sin pedidos</p>
                    ) : list.map((o) => (
                      <KitchenCard
                        key={o.id}
                        order={o}
                        table={tableOf(o.tableId)}
                        now={now}
                        onReprint={() => setTicketOrder(o)}
                        onView={() => onNav('pedidos', { orderId: o.id })}
                        onAdvance={doAdvance}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <TicketModal order={ticketOrder} open={!!ticketOrder} onClose={() => setTicketOrder(null)} />
    </div>
  )
}
