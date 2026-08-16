import React, { useEffect, useMemo, useRef } from 'react'
import { FileText, ChefHat, Receipt } from 'lucide-react'
import { toastOk, toastErr } from '../../lib/notify'
import { printTicket } from '../../lib/ticket'

const TICKET_OPTIONS = [
  { kind: 'ticket', label: 'Ticket de cliente', desc: 'Recibo de venta', icon: FileText },
  { kind: 'kitchen', label: 'Comanda de cocina', desc: 'Para la cocina', icon: ChefHat },
  { kind: 'factura', label: 'Factura', desc: 'Comprobante con datos fiscales', icon: Receipt },
]

export default function PrintMenu({ order, state, open, onClose }) {
  const ref = useRef(null)
  const liveOrder = useMemo(() => (state?.orders || []).find((o) => o.id === order?.id) || order, [state?.orders, order?.id])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const print = (kind) => {
    onClose()
    const target = liveOrder || order
    if (!target) return
    const ok = printTicket(target, undefined, kind)
    if (ok) toastOk(`${kind === 'kitchen' ? 'Comanda' : kind === 'factura' ? 'Factura' : 'Ticket'} #${target.folio || target.id} enviado a impresión`)
    else toastErr('No se pudo imprimir')
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={ref} className="absolute right-0 top-full mt-2 z-50 min-w-[230px] bg-card border border-line rounded-xl shadow-2xl p-1 text-night">
        {TICKET_OPTIONS.map((opt, i) => (
          <React.Fragment key={opt.kind}>
            {i > 0 && <hr className="border-line my-1" />}
            <button type="button" onClick={() => print(opt.kind)} className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg hover:bg-page transition-colors text-left cursor-pointer">
              <opt.icon size={16} className="shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-night leading-tight">{opt.label}</span>
                <span className="block text-[11px] text-muted leading-tight">{opt.desc}</span>
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </>
  )
}
