import React, { useState } from 'react'
import { Button, Field, Input, Segmented, Modal } from '../ui'
import { fmtMoney } from '../../lib/format'
import { PAYMENT_METHODS, paymentBreakdown, getSettings } from '../../lib/storage'

// Modal de cobro universal.
// props: order {total, ...}, open, onClose, onPay({payment, cashReceived})
export default function PaymentDialog({ order, open, onClose, onPay }) {
  const [payment, setPayment] = useState('efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const settings = getSettings()
  const info = paymentBreakdown(order?.total || 0, payment, settings)

  const presets = [0, 50, 100, 200, 500].filter((x) => x >= info.charge).concat(Math.ceil(info.charge / 100) * 100)
  const change = Number(cashReceived) - info.charge

  if (!order) return null
  return (
    <Modal open={open} onClose={onClose} title={`Cobrar pedido #${order.folio}`} maxW="max-w-lg">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-brand to-brand-dark text-white rounded-2xl p-4 text-center shadow-lg">
          <div className="text-xs uppercase tracking-wide text-white/70">Total a cobrar</div>
          <div className="text-3xl font-extrabold font-mono">{fmtMoney(order.total)}</div>
        </div>

        <div>
          <span className="text-xs font-semibold text-muted">Método de pago</span>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {PAYMENT_METHODS.map((p) => (
              <button key={p.id} onClick={() => { setPayment(p.id); setCashReceived('') }}
                className={`py-2 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 ${payment === p.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                <span className="text-lg">{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        {payment === 'tarjeta' && settings.payments.applyCommission && (
          <div className="bg-gold-soft/50 border border-gold/40 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted">Venta</span><span className="font-mono">{fmtMoney(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Comisión {settings.payments.cardCommission}%</span><span className="font-mono">−{fmtMoney(info.commission)}</span></div>
            {info.rounding > 0 && <div className="flex justify-between"><span className="text-muted">Redondeo</span><span className="font-mono">+{fmtMoney(info.rounding)}</span></div>}
            <div className="flex justify-between font-bold text-night border-t border-gold/40 pt-1"><span>Cobro al cliente</span><span className="font-mono">{fmtMoney(info.charge)}</span></div>
          </div>
        )}

        {payment === 'efectivo' && (
          <div className="space-y-2">
            <Field label="Efectivo recibido">
              <Input type="number" min="0" step="0.01" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder={fmtMoney(info.charge)} className="!text-lg !font-mono" />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(presets)].map((p) => (
                <button key={p} onClick={() => setCashReceived(String(p))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition ${Number(cashReceived) === p ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                  {fmtMoney(p)}
                </button>
              ))}
            </div>
            {cashReceived !== '' && (
              <div className={`flex justify-between rounded-xl px-3 py-2 font-bold text-sm ${change >= 0 ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger'}`}>
                <span>Cambio</span><span className="font-mono">{fmtMoney(Math.max(0, change))}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="gradient" className="flex-1 !py-3 text-base" onClick={() => onPay({ payment, cashReceived: payment === 'efectivo' && cashReceived !== '' ? Number(cashReceived) : null })}>
            Cobrar {fmtMoney(payment === 'tarjeta' ? info.charge : order.total)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
