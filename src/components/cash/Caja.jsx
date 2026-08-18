import React, { useMemo, useState } from 'react'
import {
  Banknote, CreditCard, Smartphone, QrCode, Wallet, Lock, History,
  TrendingDown, PlusCircle, Coins, ArrowLeftRight, Receipt, CalendarClock,
} from 'lucide-react'
import { Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog, EmptyState, PageHeader, StatCard } from '../ui'
import { fmtMoney, fmtDateTime, fmtTime } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import { openCaja, closeCaja, addExpense, addExtraIncome, addRetiro, cajaSummary, PAYMENT_METHODS } from '../../lib/storage'

const methodLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label || id
const methodEmoji = (id) => ({ efectivo: '💵', tarjeta: '💳', transferencia: '📲', qr: '🔳' }[id] || '💵')

const SumRow = ({ label, value, minus, tone = 'night' }) => (
  <div className={`flex justify-between text-sm ${tone === 'muted' ? 'text-muted' : tone === 'danger' ? 'text-danger' : 'text-night'}`}>
    <span>{label}</span>
    <span className="font-mono font-semibold">{minus ? '−' : ''}{fmtMoney(value)}</span>
  </div>
)

export default function Caja({ state, refresh, onNav, params, user }) {
  const session = state.caja.sessions.find((c) => c.status === 'abierta') || null
  const sumr = useMemo(() => cajaSummary(session), [session])

  const [openingCash, setOpeningCash] = useState('1000')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exp, setExp] = useState({ concept: '', provider: '', amount: '', method: 'efectivo' })
  const [inc, setInc] = useState({ concept: '', amount: '', method: 'efectivo' })
  const [ret, setRet] = useState({ amount: '', note: '' })
  const [closeModal, setCloseModal] = useState(false)
  const [cashCounted, setCashCounted] = useState('')

  const lastClosed = state.caja.sessions.filter((s) => s.status === 'cerrada').slice(-1)[0]
  const lastSum = lastClosed ? cajaSummary(lastClosed) : null
  const counted = Number(cashCounted) || 0
  const liveDiff = counted - sumr.expectedCash

  const doOpen = () => {
    try {
      openCaja({ openingCash: Number(openingCash) || 0, user })
      toastOk(`Caja abierta con fondo de ${fmtMoney(Number(openingCash) || 0)}`)
      setConfirmOpen(false)
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const saveExpense = () => {
    if (!exp.concept.trim() || exp.amount === '') { toastErr('Captura concepto y monto'); return }
    try {
      addExpense({ concept: exp.concept.trim(), provider: exp.provider.trim(), amount: exp.amount, method: exp.method, user })
      toastOk('Gasto registrado')
      setExp({ concept: '', provider: '', amount: '', method: 'efectivo' })
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const saveIncome = () => {
    if (!inc.concept.trim() || inc.amount === '') { toastErr('Captura concepto y monto'); return }
    try {
      addExtraIncome({ concept: inc.concept.trim(), amount: inc.amount, method: inc.method, user })
      toastOk('Ingreso extra registrado')
      setInc({ concept: '', amount: '', method: 'efectivo' })
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const saveRetiro = () => {
    if (ret.amount === '') { toastErr('Captura el monto'); return }
    try {
      addRetiro({ amount: ret.amount, note: ret.note.trim(), user })
      toastOk('Retiro registrado')
      setRet({ amount: '', note: '' })
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const doClose = () => {
    if (cashCounted === '') { toastErr('Ingresa el efectivo contado'); return }
    try {
      closeCaja({ cashCounted: counted, user })
      toastOk('Caja cerrada correctamente')
      setCloseModal(false)
      setCashCounted('')
      refresh()
      onNav('jornadas')
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  if (!session) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Caja"
          subtitle="Abre la caja para registrar el turno y los movimientos de efectivo"
          actions={<Button variant="outline" onClick={() => onNav('jornadas')}><History size={16} className="mr-1.5" /> Historial de jornadas</Button>}
        />

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold grid place-items-center"><Wallet size={20} /></div>
              <div>
                <h3 className="font-bold text-night text-lg">Abrir caja</h3>
                <p className="text-xs text-muted">Fondo inicial con el que arranca el turno</p>
              </div>
            </div>
            <Field label="Fondo inicial (efectivo)">
              <Input type="number" min="0" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} className="!text-xl !font-mono" />
            </Field>
            <Button variant="gold" className="w-full !py-3.5 text-base mt-4" onClick={() => setConfirmOpen(true)}>
              <Lock size={18} className="mr-1.5" /> ABRIR CAJA
            </Button>
            <p className="mt-3 text-[11px] text-muted text-center">Esperado al cierre = fondo + ventas + ingresos − gastos − retiros</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock size={18} className="text-brand" />
              <h3 className="font-bold text-night">Última jornada</h3>
            </div>
            {lastClosed ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Fecha</span>
                  <span className="font-semibold text-night">{fmtDateTime(lastClosed.openedAt)} → {fmtTime(lastClosed.closedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Ventas</span>
                  <span className="font-mono font-semibold text-night">{fmtMoney(lastSum.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Efectivo esperado</span>
                  <span className="font-mono font-semibold text-night">{fmtMoney(lastSum.expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Contado</span>
                  <span className="font-mono font-semibold text-night">{fmtMoney(lastClosed.cashCounted)}</span>
                </div>
                <div className={`flex justify-between rounded-xl px-3 py-2 font-bold ${lastClosed.difference >= 0 ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger'}`}>
                  <span>{lastClosed.difference >= 0 ? 'Sobrante' : 'Faltante'}</span>
                  <span className="font-mono">{lastClosed.difference >= 0 ? '+' : '−'}{fmtMoney(Math.abs(lastClosed.difference))}</span>
                </div>
              </div>
            ) : (
              <EmptyState icon="🗓️" title="Sin jornadas" message="Aún no hay turnos cerrados." />
            )}
            <Button variant="outline" className="w-full mt-4" onClick={() => onNav('jornadas')}>Ver todas las jornadas</Button>
          </Card>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="Abrir caja"
          message={`¿Confirmas abrir la caja con un fondo de ${fmtMoney(Number(openingCash) || 0)}?`}
          confirmLabel="Sí, abrir"
          onConfirm={doOpen}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    )
  }

  const methods = [
    { label: 'Efectivo', icon: Banknote, tone: 'brand', value: sumr.cashSales, sub: 'En caja física' },
    { label: 'Tarjeta', icon: CreditCard, tone: 'blue', value: sumr.cardSales, sub: `Cobro ${fmtMoney(sumr.cardSales + sumr.commissions + sumr.rounding)} · Comisión ${fmtMoney(sumr.commissions)} · Redondeo ${fmtMoney(sumr.rounding)}` },
    { label: 'Transferencia', icon: Smartphone, tone: 'purple', value: sumr.transferSales, sub: 'Depósitos bancarios' },
    { label: 'QR', icon: QrCode, tone: 'night', value: sumr.qrSales, sub: 'Código QR' },
  ]
  const kpis = [
    { label: 'Ventas turno', icon: Receipt, tone: 'brand', value: sumr.totalSales },
    { label: 'Gastos', icon: TrendingDown, tone: 'danger', value: sumr.totalExpenses },
    { label: 'Ingresos extra', icon: PlusCircle, tone: 'gold', value: sumr.extraIncomes },
    { label: 'Retiros', icon: ArrowLeftRight, tone: 'blue', value: sumr.totalRetiros },
    { label: 'Efectivo esperado', icon: Wallet, tone: 'night', value: sumr.expectedCash },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caja"
        subtitle="Turno en curso — registra movimientos y cierra al terminar"
        actions={<Button variant="outline" onClick={() => onNav('jornadas')}><History size={16} className="mr-1.5" /> Jornadas</Button>}
      />

      <Card className="p-5 border-l-4 border-l-brand flex flex-wrap items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0">
          <Wallet size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-night text-lg">Caja abierta</h3>
            <Badge tone="success"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> ABIERTA</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Abierta el {fmtDateTime(session.openedAt)} por <span className="font-semibold text-night">{session.openedBy}</span> · Fondo inicial {fmtMoney(session.openingCash)}
          </p>
        </div>
        <Button variant="danger" onClick={() => { setCashCounted(''); setCloseModal(true) }}>
          <Lock size={15} className="mr-1.5" /> Cerrar caja
        </Button>
      </Card>

      <div>
        <h4 className="text-sm font-bold text-night uppercase tracking-wide mb-2">Ventas por método</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {methods.map((m) => (
            <StatCard key={m.label} icon={m.icon} label={m.label} value={fmtMoney(m.value)} sub={m.sub} tone={m.tone} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-night uppercase tracking-wide mb-2">KPI del turno</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <StatCard key={k.label} icon={k.icon} label={k.label} value={fmtMoney(k.value)} tone={k.tone} />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-danger" />
            <h4 className="font-bold text-night">Gasto</h4>
          </div>
          <div className="space-y-2">
            <Field label="Concepto">
              <Input value={exp.concept} onChange={(e) => setExp({ ...exp, concept: e.target.value })} placeholder="Ej. Compra de hielo" />
            </Field>
            <Field label="Proveedor">
              <Input value={exp.provider} onChange={(e) => setExp({ ...exp, provider: e.target.value })} placeholder="Opcional" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Monto">
                <Input type="number" min="0" step="0.01" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} placeholder="0.00" className="!font-mono" />
              </Field>
              <Field label="Método">
                <Select value={exp.method} onChange={(e) => setExp({ ...exp, method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                </Select>
              </Field>
            </div>
            <Button variant="danger" className="w-full" onClick={saveExpense}>Registrar gasto</Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle size={16} className="text-gold" />
            <h4 className="font-bold text-night">Ingreso extra</h4>
          </div>
          <div className="space-y-2">
            <Field label="Concepto">
              <Input value={inc.concept} onChange={(e) => setInc({ ...inc, concept: e.target.value })} placeholder="Ej. Deposito de propinas" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Monto">
                <Input type="number" min="0" step="0.01" value={inc.amount} onChange={(e) => setInc({ ...inc, amount: e.target.value })} placeholder="0.00" className="!font-mono" />
              </Field>
              <Field label="Método">
                <Select value={inc.method} onChange={(e) => setInc({ ...inc, method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                </Select>
              </Field>
            </div>
            <Button variant="gold" className="w-full" onClick={saveIncome}>Registrar ingreso</Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={16} className="text-sky-600" />
            <h4 className="font-bold text-night">Retiro</h4>
          </div>
          <div className="space-y-2">
            <Field label="Monto">
              <Input type="number" min="0" step="0.01" value={ret.amount} onChange={(e) => setRet({ ...ret, amount: e.target.value })} placeholder="0.00" className="!font-mono" />
            </Field>
            <Field label="Nota">
              <Input value={ret.note} onChange={(e) => setRet({ ...ret, note: e.target.value })} placeholder="Ej. Depósito al banco" />
            </Field>
            <Button variant="blue" className="w-full" onClick={saveRetiro}>Registrar retiro</Button>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={16} className="text-brand" />
          <h4 className="font-bold text-night">Ventas del turno</h4>
          <Badge tone="brand">{session.sales.length}</Badge>
        </div>
        {session.sales.length === 0 ? (
          <EmptyState icon="🧾" title="Sin ventas todavía" message="Las ventas cobradas en el turno aparecerán aquí." />
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[70px_1fr_1fr_1fr_1fr] gap-2 px-3 text-[10px] font-bold uppercase tracking-wide text-muted">
              <span>Folio</span><span>Método</span><span className="text-right">Base</span><span className="text-right">Comisión</span><span className="text-right">Cobro</span>
            </div>
            {session.sales.map((v) => (
              <div key={v.folio} className="grid grid-cols-2 sm:grid-cols-[70px_1fr_1fr_1fr_1fr] gap-2 items-center bg-page rounded-xl px-3 py-2 text-sm">
                <span className="font-mono font-bold text-night">#{v.folio}</span>
                <span className="text-muted truncate">{methodEmoji(v.method)} {methodLabel(v.method)}</span>
                <span className="font-mono text-right">{fmtMoney(v.base)}</span>
                <span className={`font-mono text-right ${v.commission > 0 ? 'text-danger' : 'text-muted'}`}>{v.commission > 0 ? `−${fmtMoney(v.commission)}` : '—'}</span>
                <span className="font-mono font-bold text-right text-brand dark:text-night">{fmtMoney(v.charge)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cerrar caja" maxW="max-w-lg">
        <div className="space-y-4">
          <Field label="Efectivo contado en caja" hint="Cuenta el dinero físico que hay al cierre">
            <Input type="number" min="0" step="0.01" autoFocus value={cashCounted} onChange={(e) => setCashCounted(e.target.value)} placeholder={fmtMoney(sumr.expectedCash)} className="!text-xl !font-mono" />
          </Field>
          <div className="rounded-2xl bg-page p-3 space-y-1.5">
            <SumRow label="Ventas efectivo" value={sumr.cashSales} />
            <SumRow label="Ventas tarjeta (base)" value={sumr.cardSales} />
            <SumRow label="Comisiones de tarjeta" value={sumr.commissions} tone="muted" />
            <SumRow label="Redondeos" value={sumr.rounding} tone="muted" />
            <SumRow label="Transferencia" value={sumr.transferSales} />
            <SumRow label="QR" value={sumr.qrSales} />
            <SumRow label="Ingresos extra" value={sumr.extraIncomes} />
            <SumRow label="Gastos" value={sumr.totalExpenses} minus tone="danger" />
            <SumRow label="Retiros" value={sumr.totalRetiros} minus />
            <div className="flex justify-between font-bold text-night border-t border-line pt-1.5">
              <span>Efectivo esperado</span><span className="font-mono">{fmtMoney(sumr.expectedCash)}</span>
            </div>
            <div className="flex justify-between font-bold text-night">
              <span>Efectivo contado</span><span className="font-mono">{fmtMoney(counted)}</span>
            </div>
            <div className={`flex justify-between rounded-xl px-3 py-2 font-bold ${liveDiff >= 0 ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger'}`}>
              <span>{liveDiff >= 0 ? 'Sobrante' : 'Faltante'}</span>
              <span className="font-mono">{liveDiff >= 0 ? '+' : '−'}{fmtMoney(Math.abs(liveDiff))}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={doClose}>Confirmar cierre</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
