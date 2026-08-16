import React, { useState, useEffect, useRef } from 'react'
import {
  ChefHat, Volume2, VolumeX, Printer, Eye, Clock, AlertTriangle,
  UtensilsCrossed, Bike, CheckCircle2, RefreshCw, Maximize2, Minimize2,
  ChevronDown,
} from 'lucide-react'
import TicketModal from '../shared/TicketModal'
import { fmtDuration, fmtTime } from '../../lib/format'
import { toast, toastOk, toastErr } from '../../lib/notify'
import { soundNewOrder, soundUrgent, setMuted, isMuted } from '../../lib/sound'
import { SERVICE_LABEL, setKitchenStatus, setOrderStatus, updateTable } from '../../lib/storage'

const URGENT_MS = 15 * 60 * 1000

function KitchenCard({ order, table, now, onReprint, onView, onAdvance, onPorCobrar }) {
  const [doneItems, setDoneItems] = useState(() => new Set())
  const elapsed = Math.max(0, now.getTime() - new Date(order.createdAt).getTime())
  const urgent = elapsed >= URGENT_MS
  const serviceLabel = order.serviceType === 'mesa' && table ? table.name : SERVICE_LABEL[order.serviceType] || order.serviceType

  const toggleItem = (itemId) => {
    setDoneItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const allDone = order.items.every((it) => doneItems.has(it.id))

  const markAllDone = () => {
    setDoneItems(new Set(order.items.map((it) => it.id)))
  }

  const getAction = () => {
    if (order.status === 'porcobrar') return null
    if (order.kitchenStatus === 'nuevo') return { label: '✓ ACEPTAR', onClick: () => onAdvance(order, 'preparando', `Pedido #${order.folio} en preparación`) }
    if (order.kitchenStatus === 'preparando') {
      if (order.serviceType === 'mesa') return { label: '💵 POR COBRAR', onClick: () => onPorCobrar(order) }
      if (order.serviceType === 'domicilio') return { label: '✓ LISTO PARA REPARTO', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} listo para reparto`) }
      return { label: '✓ ENTREGADO', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} entregado`) }
    }
    if (order.kitchenStatus === 'listo') {
      if (order.serviceType === 'mesa') return { label: '💵 POR COBRAR', onClick: () => onPorCobrar(order) }
      return { label: '✓ ENTREGADO', onClick: () => onAdvance(order, 'entregado', `Pedido #${order.folio} entregado`) }
    }
    return null
  }

  const action = getAction()
  const timerBg = urgent ? 'bg-danger-soft' : elapsed > 10 * 60 * 1000 ? 'bg-warning-soft' : 'bg-success-soft'
  const timerText = urgent ? 'text-danger' : elapsed > 10 * 60 * 1000 ? 'text-warning' : 'text-success'
  const timerBorder = urgent ? 'border-danger/30' : elapsed > 10 * 60 * 1000 ? 'border-warning/30' : 'border-success/30'

  return (
    <div className={`flex flex-col w-[280px] sm:w-[300px] shrink-0 rounded-2xl border bg-card overflow-hidden ${urgent ? 'border-danger/40' : 'border-line'}`}>
      {/* Header */}
      <div className={`px-3.5 py-2.5 ${urgent ? 'bg-danger-soft' : 'bg-page'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-page text-xs font-bold text-night">
              #{order.folio}
            </span>
            {urgent && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-danger-soft text-[10px] font-bold text-danger uppercase"><AlertTriangle size={10} /> URGENTE</span>}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold tabular-nums ${timerBg} ${timerText} ${timerBorder}`}>
            <Clock size={11} />
            {fmtDuration(elapsed)}
            {urgent && <span className="animate-pulse">⚠</span>}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          <span className="flex items-center gap-1 font-semibold text-night">
            {order.serviceType === 'domicilio' ? <Bike size={12} /> : <UtensilsCrossed size={12} />}
            {serviceLabel}
          </span>
          <span className="text-muted/40">·</span>
          <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {fmtTime(order.createdAt)}</span>
          {order.client?.name && <span className="text-muted/60 truncate">· {order.client.name}</span>}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-3 py-2.5 space-y-1.5 max-h-[320px] overflow-y-auto">
        {order.items.map((it) => {
          const done = doneItems.has(it.id)
          return (
            <div key={it.id} className={`flex items-start gap-2.5 py-1.5 border-b border-dashed last:border-0 ${done ? 'border-line/50' : 'border-line'}`}>
              <button
                type="button"
                onClick={() => toggleItem(it.id)}
                className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  done ? 'bg-success border-success text-white' : 'border-line hover:border-success'
                }`}
              >
                {done && <CheckCircle2 size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-muted tabular-nums">{it.qty}</span>
                  <span className={`text-sm font-semibold leading-tight ${done ? 'line-through text-muted' : 'text-night'}`}>{it.emoji} {it.name}</span>
                </div>
                {it.modifiers?.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-muted">{it.modifiers.map((m) => m.name).join(' · ')}</div>
                )}
                {it.note && <div className="mt-0.5 text-[11px] font-medium text-gold">📝 {it.note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-line space-y-2">
        <button
          type="button"
          onClick={markAllDone}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
            allDone
              ? 'bg-success text-white'
              : 'border border-success/40 text-success hover:bg-success/10'
          }`}
        >
          <CheckCircle2 size={15} /> {allDone ? '✓ MARCADO' : 'Marcar todo preparado'}
        </button>
        <div className="flex gap-1.5">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition"
            >
              {action.label}
            </button>
          )}
          <button type="button" onClick={onReprint}
            className="shrink-0 px-3 py-2 rounded-xl border border-line text-muted hover:bg-page transition text-xs font-semibold flex items-center gap-1">
            <Printer size={12} />
          </button>
          <button type="button" onClick={onView}
            className="shrink-0 px-3 py-2 rounded-xl border border-line text-muted hover:bg-page transition text-xs font-semibold flex items-center gap-1">
            <Eye size={12} />
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
  const seenRef = useRef(new Set())
  const urgentRef = useRef(new Set())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh])

  const active = state.orders.filter((o) => o.status !== 'finalizado' && o.status !== 'cancelado' && o.kitchenStatus !== 'entregado')

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
  const doPorCobrar = (o) => {
    try {
      setOrderStatus(o.id, 'porcobrar', { user })
      if (o.tableId) updateTable(o.tableId, { status: 'cuenta' })
      refresh()
      toastOk(`Pedido #${o.folio} por cobrar`)
    } catch (e) { console.error('Error al actualizar:', e); toastErr('Error al actualizar') }
  }

  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    setMutedState(m)
    toast(m ? '🔇 Sonido apagado' : '🔊 Sonido activado')
  }

  const markAllPrepared = () => {
    try {
      const toAdvance = active.filter((o) => o.kitchenStatus === 'preparando')
      toAdvance.forEach((o) => setKitchenStatus(o.id, 'listo', user))
      refresh()
      if (toAdvance.length > 0) toastOk(`${toAdvance.length} pedido(s) marcado(s) como listo(s)`)
    } catch (e) { console.error('Error al actualizar:', e); toastErr('Error al actualizar') }
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
  const listosCount = active.filter((o) => o.kitchenStatus === 'listo').length

  const sorted = [...active].sort((a, b) => {
    const ka = a.kitchenStatus === 'nuevo' ? 0 : a.kitchenStatus === 'preparando' ? 1 : 2
    const kb = b.kitchenStatus === 'nuevo' ? 0 : b.kitchenStatus === 'preparando' ? 1 : 2
    if (ka !== kb) return ka - kb
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

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
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-page text-sm">
              <span className="text-muted font-semibold">Cocina principal</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-brand-soft text-brand text-xs font-bold">{active.length}</span>
              <ChevronDown size={14} className="text-muted" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {preparandoCount > 0 && (
              <button
                type="button"
                onClick={markAllPrepared}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition"
              >
                <CheckCircle2 size={15} /> Marcar todas
              </button>
            )}
            <button type="button" onClick={refresh}
              className="w-9 h-9 rounded-xl border border-line grid place-items-center text-muted hover:bg-page transition touch-icon">
              <RefreshCw size={15} />
            </button>
            <button type="button" onClick={toggleFullscreen}
              className="hidden sm:grid w-9 h-9 rounded-xl border border-line grid place-items-center text-muted hover:bg-page transition touch-icon">
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button type="button" onClick={toggleMute}
              className="w-9 h-9 rounded-xl border border-line grid place-items-center text-muted hover:bg-page transition touch-icon">
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-muted">Nuevos</span>
            <span className="px-1.5 py-0.5 rounded-md bg-info-soft text-info font-bold">{nuevosCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-muted">Preparando</span>
            <span className="px-1.5 py-0.5 rounded-md bg-warning-soft text-warning font-bold">{preparandoCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-xs font-semibold whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-muted">Listos</span>
            <span className="px-1.5 py-0.5 rounded-md bg-success-soft text-success font-bold">{listosCount}</span>
          </span>
          <span className="text-[10px] font-mono text-muted/50 ml-2">{clock}</span>
        </div>
      </div>

      {/* Cards area — horizontal scroll */}
      <div className="px-4 py-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted/50">
            <ChefHat size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-semibold">Sin pedidos en cocina</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
            {sorted.map((o) => (
              <KitchenCard
                key={o.id}
                order={o}
                table={tableOf(o.tableId)}
                now={now}
                onReprint={() => setTicketOrder(o)}
                onView={() => onNav('pedidos', { orderId: o.id })}
                onAdvance={doAdvance}
                onPorCobrar={doPorCobrar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile mark all button */}
      {preparandoCount > 0 && (
        <div className="sm:hidden fixed bottom-16 left-4 right-4 z-20">
          <button
            type="button"
            onClick={markAllPrepared}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand text-white text-sm font-bold shadow-lg hover:bg-brand-dark transition"
          >
            <CheckCircle2 size={16} /> Marcar todas ({preparandoCount})
          </button>
        </div>
      )}

      <TicketModal order={ticketOrder} open={!!ticketOrder} onClose={() => setTicketOrder(null)} />
    </div>
  )
}
