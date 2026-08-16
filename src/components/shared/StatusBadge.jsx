import React from 'react'
import { Badge } from '../ui'
import { ORDER_STATUS_LABEL, KITCHEN_STATUS_LABEL, SERVICE_LABEL } from '../../lib/storage'

const STATUS_TONE = {
  nuevo: 'info', preparando: 'warning', listo: 'success',
  porcobrar: 'warning', finalizado: 'muted', cancelado: 'danger',
}
const KITCHEN_TONE = { nuevo: 'info', preparando: 'warning', listo: 'success', entregado: 'muted' }

function StatusPill({ tone, label }) {
  return (
    <span className={`status-pill ${tone} px-2 py-0.5 text-xs text-white`}>
      {label}
    </span>
  )
}

export function OrderStatusBadge({ status }) {
  return <StatusPill tone={STATUS_TONE[status] || 'muted'} label={ORDER_STATUS_LABEL[status] || status} />
}
export function KitchenStatusBadge({ status }) {
  return <StatusPill tone={KITCHEN_TONE[status] || 'muted'} label={KITCHEN_STATUS_LABEL[status] || status} />
}
export function ServiceBadge({ type }) {
  return <Badge tone="white">{SERVICE_LABEL[type] || type}</Badge>
}

export function OrderItemsList({ items, compact = false }) {
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.id} className={compact ? 'text-xs text-muted' : 'text-sm'}>
          <div className="font-medium text-night flex items-baseline gap-1">
            <span className="font-mono">{it.qty}×</span> {it.emoji} {it.name}
            <span className="ml-auto font-mono font-semibold text-brand">{fmtM(it.lineTotal)}</span>
          </div>
          {it.modifiers?.length > 0 && (
            <div className="pl-4 text-[11px] text-muted">
              {it.modifiers.map((m, i) => <span key={i}>{m.name}{m.price ? ` +${fmtM(m.price)}` : ''} · </span>)}
            </div>
          )}
          {it.note && <div className="pl-4 text-[11px] text-gold-dark font-medium">📝 {it.note}</div>}
        </div>
      ))}
    </div>
  )
}

function fmtM(v) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(v) || 0)
}
