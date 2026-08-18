import React from 'react'
import { fmtMoney, fmtDateTime } from '../../lib/format'
import { ORDER_STATUS_LABEL, SERVICE_LABEL, PAYMENT_METHODS } from '../../lib/storage'
import { Button, Modal } from '../ui'

export default function OrderDetailModal({ order, open, onClose }) {
  if (!open || !order) return null
  const method = PAYMENT_METHODS.find((p) => p.id === order.payment)

  let content
  try {
    content = (
      <>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted">Servicio:</span>
            <span className="text-xs font-semibold text-night">{SERVICE_LABEL[order.serviceType] || order.serviceType}</span>
            <span className="text-xs text-muted">•</span>
            <span className="text-xs font-semibold text-muted">Estado:</span>
            <span className="text-xs font-semibold text-night">{ORDER_STATUS_LABEL[order.status] || order.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-page p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">Creación</div>
              <div className="text-xs font-semibold text-night mt-1">{fmtDateTime(order.createdAt)}</div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">Cierre / Cobro</div>
              <div className="text-xs font-semibold text-night mt-1">{fmtDateTime(order.paidAt || order.closedAt || '—')}</div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-page p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Cliente</div>
            <div className="text-xs font-semibold text-night mt-1">{order.client?.name || 'Sin cliente'}</div>
          </div>

          <div className="rounded-xl border border-line bg-page p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-muted">Pago</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Método</span>
              <span className="text-xs font-semibold text-night">{method ? `${method.icon} ${method.label}` : order.payment || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Estado</span>
              <span className={`text-xs font-semibold ${order.paid ? 'text-success' : 'text-warning'}`}>{order.paid ? 'Pagado' : 'No pagado'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Total</span>
              <span className="text-sm font-bold text-night font-mono">{fmtMoney(order.total)}</span>
            </div>
            {order.paymentInfo && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Cobrado</span>
                <span className="text-xs font-semibold text-night font-mono">{fmtMoney(order.paymentInfo.charge)}</span>
              </div>
            )}
            {order.cashReceived != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Efectivo recibido</span>
                <span className="text-xs font-semibold text-night font-mono">{fmtMoney(order.cashReceived)}</span>
              </div>
            )}
            {order.cashChange != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Cambio</span>
                <span className="text-xs font-semibold text-night font-mono">{fmtMoney(order.cashChange)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line bg-page/60">
          <Button variant="ghost" className="w-full" onClick={onClose}>Cerrar</Button>
        </div>
      </>
    )
  } catch (e) {
    console.error('Error renderizando OrderDetailModal:', e)
    content = (
      <>
        <div className="text-xs text-danger font-semibold">No se pudo mostrar el detalle completo.</div>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cerrar</Button>
      </>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`Detalle del pedido #${order.folio}`} maxW="max-w-lg">
      {content}
    </Modal>
  )
}
