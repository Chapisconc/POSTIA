import React, { useMemo, useState } from 'react'
import { CreditCard, Banknote, Percent } from 'lucide-react'
import {
  Card, Field, Input, Toggle, PageHeader, StatCard,
} from '../ui'
import { fmtMoney } from '../../lib/format'
import { toastOk } from '../../lib/notify'
import { updateSettings, getSettings, paymentBreakdown } from '../../lib/storage'

export default function PagosCfg({ state, refresh }) {
  const settings = state.settings || getSettings()
  const payments = settings.payments || {}
  const [local, setLocal] = useState({
    cardCommission: Number(payments.cardCommission) || 0,
    applyCommission: payments.applyCommission !== false,
    roundUp: payments.roundUp !== false,
  })

  const patch = (partial, silent) => {
    const next = { ...local, ...partial }
    setLocal(next)
    updateSettings({ payments: next })
    if (!silent) toastOk('Pagos actualizados')
    refresh()
  }

  const cardPreview = useMemo(
    () => paymentBreakdown(100, 'tarjeta', { payments: local }),
    [local],
  )

  const cashBase = 97.5
  const cashRounded = local.roundUp ? Math.ceil(cashBase) : cashBase

  return (
    <div className="space-y-5">
      <PageHeader title="Pagos" subtitle="Comisiones de tarjeta y redondeo de efectivo" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Percent} label="Comisión" value={`${local.cardCommission}%`} sub={local.applyCommission ? 'Activa' : 'Inactiva'} tone="gold" />
        <StatCard icon={CreditCard} label="Cobro $100" value={fmtMoney(cardPreview.charge)} sub="Tarjeta demo" tone="blue" />
        <StatCard icon={Banknote} label="Redondeo" value={local.roundUp ? 'ON' : 'OFF'} sub="Efectivo" tone="brand" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-night flex items-center gap-2"><CreditCard size={18} className="text-sky-600" /> Tarjeta</h3>
          <Field label="Comisión (%)" hint="Se suma al total cobrado al cliente">
            <Input
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={local.cardCommission}
              onChange={(e) => {
                const v = Number(e.target.value)
                setLocal((l) => ({ ...l, cardCommission: v }))
              }}
              onBlur={() => patch({ cardCommission: Number(local.cardCommission) || 0 })}
            />
          </Field>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-night">Aplicar comisión</div>
              <div className="text-xs text-muted">Incluir % en el cobro con tarjeta</div>
            </div>
            <Toggle checked={local.applyCommission} onChange={(v) => patch({ applyCommission: v })} />
          </div>
          <div className="rounded-xl border border-line bg-page p-4 space-y-1.5 text-sm">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Vista previa · venta $100</div>
            <div className="flex justify-between"><span className="text-muted">Base</span><span className="font-mono">{fmtMoney(100)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Comisión {local.cardCommission}%</span><span className="font-mono">+{fmtMoney(cardPreview.commission)}</span></div>
            {cardPreview.rounding > 0 && (
              <div className="flex justify-between"><span className="text-muted">Redondeo</span><span className="font-mono">+{fmtMoney(cardPreview.rounding)}</span></div>
            )}
            <div className="flex justify-between font-bold text-night border-t border-line pt-1.5">
              <span>Cobro al cliente</span>
              <span className="font-mono text-brand">{fmtMoney(cardPreview.charge)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-night flex items-center gap-2"><Banknote size={18} className="text-brand" /> Efectivo</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-night">Redondear hacia arriba</div>
              <div className="text-xs text-muted">Aplica en comisiones y totales con centavos</div>
            </div>
            <Toggle checked={local.roundUp} onChange={(v) => patch({ roundUp: v })} />
          </div>
          <div className="rounded-xl border border-line bg-page p-4 space-y-1.5 text-sm">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Vista previa · redondeo</div>
            <div className="flex justify-between"><span className="text-muted">Monto</span><span className="font-mono">{fmtMoney(cashBase)}</span></div>
            <div className="flex justify-between font-bold text-night border-t border-line pt-1.5">
              <span>Resultado</span>
              <span className="font-mono text-brand">{fmtMoney(cashRounded)}</span>
            </div>
            <p className="text-xs text-muted pt-1">
              {local.roundUp
                ? `${fmtMoney(cashBase)} se cobra como ${fmtMoney(cashRounded)}`
                : 'Sin redondeo al entero superior'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
