import React, { useMemo, useState } from 'react'
import {
  CalendarClock, ChevronDown, TrendingDown, ArrowLeftRight,
  PlusCircle, Receipt, Coins, TrendingUp,
} from 'lucide-react'
import { Card, Button, Badge, Tabs, EmptyState, PageHeader, StatCard } from '../ui'
import { fmtMoney, fmtTime, fmtDate } from '../../lib/format'
import { cajaSummary, PAYMENT_METHODS } from '../../lib/storage'

const methodLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label || id
const methodEmoji = (id) => ({ efectivo: '💵', tarjeta: '💳', transferencia: '📲', qr: '🔳' }[id] || '💵')

const durLabel = (a, b) => {
  const ms = new Date(b) - new Date(a)
  if (!(ms > 0)) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.round((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

const PERIODS = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'todas', label: 'Todas' },
]

export default function Jornadas({ state, refresh, onNav, params, user }) {
  const [period, setPeriod] = useState('todas')
  const [openId, setOpenId] = useState(null)

  const from = useMemo(() => {
    if (period === 'hoy') { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
    if (period === '7d') { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d }
    if (period === '30d') { const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d }
    return null
  }, [period])

  const sessions = useMemo(() => {
    return state.caja.sessions
      .filter((c) => !from || new Date(c.openedAt) >= from)
      .slice()
      .reverse()
  }, [state, from])

  const totals = useMemo(() => {
    let ventas = 0, gastos = 0, diferencia = 0, redondeos = 0
    for (const c of sessions) {
      const s = cajaSummary(c)
      ventas += s.totalSales
      gastos += s.totalExpenses
      redondeos += s.rounding
      if (c.difference != null) diferencia += c.difference
    }
    return { ventas, gastos, diferencia, redondeos }
  }, [sessions])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jornadas"
        subtitle="Historial de aperturas y cierres de caja"
        actions={<Button onClick={() => onNav('caja')}><PlusCircle size={16} className="mr-1.5" /> Abrir nueva jornada</Button>}
      />

      <Tabs items={PERIODS} value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Ventas del periodo" value={fmtMoney(totals.ventas)} tone="brand" />
        <StatCard icon={TrendingDown} label="Gastos" value={fmtMoney(totals.gastos)} tone="danger" />
        <StatCard icon={ArrowLeftRight} label="Diferencia" value={`${totals.diferencia >= 0 ? '+' : '−'}${fmtMoney(Math.abs(totals.diferencia))}`} tone={totals.diferencia >= 0 ? 'gold' : 'danger'} />
        <StatCard icon={Coins} label="Redondeos" value={fmtMoney(totals.redondeos)} tone="blue" />
      </div>

      {sessions.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon="🗓️"
            title="Sin jornadas en este periodo"
            message="Abre la caja para iniciar un turno."
            action={<Button onClick={() => onNav('caja')}>Abrir caja</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((c) => {
            const s = cajaSummary(c)
            const abierta = c.status === 'abierta'
            const open = openId === c.id
            const diff = c.difference
            return (
              <Card key={c.id} className="overflow-hidden">
                <button className="w-full text-left p-4 hover:bg-page/50 transition" onClick={() => setOpenId(open ? null : c.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${abierta ? 'bg-success-soft text-success-dark' : 'bg-gold-soft text-gold'}`}>
                        <CalendarClock size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-night">{fmtDate(c.openedAt)}</span>
                          {abierta ? <Badge tone="success">En curso</Badge> : <Badge tone="muted">Cerrada</Badge>}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {fmtTime(c.openedAt)} → {abierta ? 'ahora' : fmtTime(c.closedAt)} · {durLabel(c.openedAt, abierta ? new Date() : c.closedAt)} · {c.openedBy}
                        </div>
                      </div>
                    </div>
                    {!abierta && (
                      <Badge tone={diff > 0.001 ? 'success' : diff < -0.001 ? 'danger' : 'muted'}>
                        {diff >= 0 ? 'Sobrante ' : 'Faltante '}{fmtMoney(Math.abs(diff))}
                      </Badge>
                    )}
                    <ChevronDown size={18} className={`text-muted transition shrink-0 ${open ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                    {[
                      { label: 'Ventas', v: fmtMoney(s.totalSales), c: 'text-brand-dark' },
                      { label: 'Gastos', v: fmtMoney(s.totalExpenses), c: 'text-danger' },
                      { label: 'Extra', v: fmtMoney(s.extraIncomes), c: 'text-gold' },
                      { label: 'Retiros', v: fmtMoney(s.totalRetiros), c: 'text-muted' },
                      { label: 'Esperado', v: fmtMoney(s.expectedCash), c: 'text-night' },
                      { label: 'Redondeos', v: fmtMoney(s.rounding), c: 'text-muted' },
                    ].map((x) => (
                      <div key={x.label} className="bg-page rounded-xl p-2 text-center">
                        <div className="text-[10px] text-muted uppercase">{x.label}</div>
                        <div className={`font-mono font-bold text-sm ${x.c}`}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-line p-4 space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { label: 'Fondo inicial', v: fmtMoney(c.openingCash) },
                        { label: 'Efectivo esperado', v: fmtMoney(s.expectedCash) },
                        { label: 'Efectivo contado', v: c.cashCounted != null ? fmtMoney(c.cashCounted) : '—' },
                        { label: 'Diferencia', v: diff != null ? `${diff >= 0 ? '+' : '−'}${fmtMoney(Math.abs(diff))}` : '—', colored: true },
                        { label: 'Redondeos', v: fmtMoney(s.rounding) },
                      ].map((x) => (
                        <div key={x.label} className={`rounded-xl p-3 ${x.colored ? (diff > 0.001 ? 'bg-success-soft' : diff < -0.001 ? 'bg-danger-soft' : 'bg-page') : 'bg-page'}`}>
                          <div className="text-[10px] uppercase text-muted font-bold">{x.label}</div>
                          <div className={`font-mono font-bold mt-0.5 ${x.colored ? (diff > 0.001 ? 'text-success-dark' : diff < -0.001 ? 'text-danger' : 'text-night') : 'text-night'}`}>{x.v}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-night mb-2">Ventas · {c.sales?.length || 0}</div>
                      {(c.sales || []).length === 0 ? (
                        <p className="text-xs text-muted">Sin ventas en esta jornada.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(c.sales || []).map((v) => (
                            <div key={v.folio} className="flex items-center gap-2 bg-page rounded-xl px-3 py-2 text-sm">
                              <span className="font-mono font-bold text-night w-14 shrink-0">#{v.folio}</span>
                              <span className="text-muted flex-1 min-w-0 truncate">{methodEmoji(v.method)} {methodLabel(v.method)}</span>
                              <span className="font-mono text-muted">{fmtMoney(v.base)}</span>
                              {v.commission > 0 && <span className="font-mono text-danger text-xs">−{fmtMoney(v.commission)}</span>}
                              <span className="font-mono font-bold text-brand w-20 text-right">{fmtMoney(v.charge)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                      <div>
                        <div className="text-sm font-bold text-night mb-2 flex items-center gap-1.5">
                          <TrendingDown size={14} className="text-danger" /> Gastos · {c.expenses?.length || 0}
                        </div>
                        {(c.expenses || []).length === 0 ? (
                          <p className="text-xs text-muted">Sin gastos.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(c.expenses || []).map((e) => (
                              <div key={e.id} className="bg-page rounded-xl px-3 py-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <span className="font-semibold text-night truncate">{e.concept}</span>
                                  <span className="font-mono font-bold text-danger shrink-0">{fmtMoney(e.amount)}</span>
                                </div>
                                <div className="text-[11px] text-muted">
                                  {methodEmoji(e.method)} {methodLabel(e.method)}{e.provider ? ` · ${e.provider}` : ''} · {fmtTime(e.date)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-bold text-night mb-2 flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-brand" /> Ingresos extra · {c.extraIncomes?.length || 0}
                        </div>
                        {(c.extraIncomes || []).length === 0 ? (
                          <p className="text-xs text-muted">Sin ingresos extra.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(c.extraIncomes || []).map((e) => (
                              <div key={e.id} className="bg-page rounded-xl px-3 py-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <span className="font-semibold text-night truncate">{e.concept}</span>
                                  <span className="font-mono font-bold text-success-dark shrink-0">{fmtMoney(e.amount)}</span>
                                </div>
                                <div className="text-[11px] text-muted">
                                  {methodEmoji(e.method)} {methodLabel(e.method)} · {fmtTime(e.date)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-bold text-night mb-2 flex items-center gap-1.5">
                          <ArrowLeftRight size={14} className="text-sky-600" /> Retiros · {c.retiros?.length || 0}
                        </div>
                        {(c.retiros || []).length === 0 ? (
                          <p className="text-xs text-muted">Sin retiros.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(c.retiros || []).map((r) => (
                              <div key={r.id} className="bg-page rounded-xl px-3 py-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <span className="font-semibold text-night truncate">{r.note || 'Retiro'}</span>
                                  <span className="font-mono font-bold text-night shrink-0">{fmtMoney(r.amount)}</span>
                                </div>
                                <div className="text-[11px] text-muted">· {fmtTime(r.date)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
