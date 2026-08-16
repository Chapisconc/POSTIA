import React, { useState, useRef, useEffect } from 'react'
import { Search, User, MapPin, Clock, Printer, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fmtMoney } from '../../lib/format'

export default function ServiceTabs({ active, onSwitch, counts, className }) {
  const [local, setLocal] = useState(active)
  const allActive = local === 'all'
  const opts = [
    { value: 'all', label: 'Todos', count: null },
    { value: 'mostrador', label: 'Mostrador', count: counts?.mostrador },
    { value: 'domicilio', label: 'Domicilio', count: counts?.domicilio },
    { value: 'mesa', label: 'Mesas', count: counts?.mesa },
  ]

  useEffect(() => { setLocal(active) }, [active])

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1', className)}>
      {opts.map((it) => {
        const sel = it.value === local || (it.value === 'all' && !allActive)
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onSwitch(it.value === 'all' ? 'all' : it.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap shrink-0 touch-target',
              sel ? 'bg-brand text-white shadow-sm' : 'bg-card text-night border border-line hover:border-brand/50'
            )}
          >
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-md',
                  sel ? 'bg-white/20 text-white' : 'bg-page text-muted'
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function CartHeader({ order, type, address, clientName, timer, onClose, onPrint, onAddTip }) {
  const [focus, setFocus] = useState({ client: false, address: false, search: false })
  const clientRef = useRef(null)
  const addrRef = useRef(null)

  const bodyPlaceholder = (f) => {
    if (f.search) return 'Buscar cliente…'
    if (f.client) return 'Nombre cliente'
    if (f.address) return 'Calle y número'
    return 'Nombre'
  }

  return (
    <div className="border-t border-line bg-card px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-bold text-brand">#{order.folio}</span>
            <span className="text-muted capitalize">{type}</span>
            <span className="text-muted">·</span>
            <span className="text-muted capitalize">{order.status}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
            <Clock size={11} className="shrink-0" />
            <span>{timer}</span>
          </div>
          {address && (
            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Imprimir ticket" className="grid place-items-center w-9 h-9 rounded-xl border border-line hover:bg-page transition" onClick={onPrint}>
            <Printer size={16} />
          </button>
          <button type="button" aria-label="Cerrar" className="grid place-items-center w-9 h-9 rounded-xl border border-line hover:bg-page transition" onClick={onClose}>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={clientRef}
            type="text"
            value={clientName || ''}
            placeholder={bodyPlaceholder(focus)}
            onFocus={() => setFocus({ ...focus, client: true, search: focus.search || !clientName, address: false })}
            onBlur={() => setFocus({ client: false, address: false, search: false })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && focus.client) {
                addrRef.current?.focus()
                setFocus({ ...focus, client: false, address: true })
              }
            }}
            className="w-full pl-8 pr-2 py-2 rounded-xl border border-line bg-page text-night text-sm outline-none focus:border-brand transition"
          />
          {clientName ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">✓</span> : null}
        </div>
        <button
          type="button"
          className="grid place-items-center w-10 h-10 rounded-xl border border-line bg-card hover:bg-page transition shrink-0"
          onClick={() => clientRef.current?.focus()}
        >
          <User size={16} />
        </button>
      </div>

      {type === 'domicilio' && (
        <div className="relative">
          <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={addrRef}
            type="text"
            value={address || ''}
            placeholder={bodyPlaceholder(focus)}
            onFocus={() => setFocus({ ...focus, address: true, client: false, search: false })}
            onBlur={() => setFocus({ client: false, address: false, search: false })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && focus.address) {
                clientRef.current?.focus()
                setFocus({ ...focus, client: true, address: false })
              }
            }}
            className="w-full pl-8 pr-2 py-2 rounded-xl border border-line bg-page text-night text-sm outline-none focus:border-brand transition"
          />
        </div>
      )}
    </div>
  )
}
