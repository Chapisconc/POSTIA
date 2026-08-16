import React, { useMemo, useState } from 'react'
import { TrendingDown, Banknote, CalendarDays } from 'lucide-react'
import { Card, Badge, Tabs, EmptyState, PageHeader, StatCard, SearchInput } from '../ui'
import { fmtMoney, fmtDateTime } from '../../lib/format'
import { expenseStats, rangeFrom } from '../../lib/stats'
import { PAYMENT_METHODS } from '../../lib/storage'

const methodLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label || id
const methodEmoji = (id) => ({ efectivo: '💵', tarjeta: '💳', transferencia: '📲', qr: '🔳' }[id] || '💵')

const PERIODS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'todas', label: 'Todas' },
]

export default function Gastos({ state, refresh, onNav, params, user }) {
  const [period, setPeriod] = useState('mes')
  const [search, setSearch] = useState('')

  const { from, to } = useMemo(() => rangeFrom(period), [period])
  const st = useMemo(() => expenseStats(state, from, to), [state, from, to])

  const periodEntries = useMemo(() => {
    const fromT = from ? from.getTime() : null
    const list = []
    for (const c of state.caja.sessions) {
      for (const e of c.expenses) {
        if (fromT && new Date(e.date).getTime() < fromT) continue
        list.push(e)
      }
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [state, from])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return periodEntries
    return periodEntries.filter(
      (e) =>
        e.concept.toLowerCase().includes(q) ||
        (e.provider || '').toLowerCase().includes(q) ||
        (e.user || '').toLowerCase().includes(q),
    )
  }, [periodEntries, search])

  const periodLabel = PERIODS.find((p) => p.id === period)?.label.toLowerCase() || ''

  return (
    <div className="space-y-5">
      <PageHeader title="Gastos" subtitle="Salidas de dinero registradas en las jornadas" />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs items={PERIODS} value={period} onChange={setPeriod} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar gasto, proveedor…" className="w-full sm:w-72" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={TrendingDown} label="Total del periodo" value={fmtMoney(st.total)} tone="danger" sub={`${periodEntries.length} movimientos`} />
            <StatCard icon={Banknote} label="Conceptos" value={String(st.byConcept.length)} tone="brand" sub={`Métodos: efectivo, tarjeta, transferencia…`} />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-night">Desglose por concepto</h4>
              <Badge tone="danger">{st.byConcept.length}</Badge>
            </div>
            {st.byConcept.length === 0 ? (
              <EmptyState icon="🛒" title="Sin gastos" message="No hay gastos en el periodo seleccionado." />
            ) : (
              <div className="space-y-3">
                {st.byConcept.map(([concept, amount]) => {
                  const pct = st.total ? (amount / st.total) * 100 : 0
                  return (
                    <div key={concept}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-night truncate">{concept}</span>
                        <span className="font-mono font-bold text-danger">{fmtMoney(amount)}</span>
                      </div>
                      <div className="h-2 bg-line rounded-full overflow-hidden">
                        <div className="h-full bg-danger rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">{pct.toFixed(0)}% del total</div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-night">Registro de gastos</h4>
              <Badge tone="muted">{shown.length}</Badge>
            </div>
            {shown.length === 0 ? (
              <EmptyState icon="🧾" title="Sin movimientos" message="Los gastos registrados en las jornadas aparecerán aquí." />
            ) : (
              <div className="space-y-2">
                {shown.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 bg-page rounded-xl px-3 py-2.5">
                    <div className="w-9 h-9 rounded-xl bg-danger-soft text-danger grid place-items-center shrink-0">
                      <TrendingDown size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-night truncate">{e.concept}</div>
                      <div className="text-[11px] text-muted truncate">
                        {methodEmoji(e.method)} {methodLabel(e.method)}{e.provider ? ` · ${e.provider}` : ''} · {e.user}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-danger">{fmtMoney(e.amount)}</div>
                      <div className="text-[10px] text-muted">{fmtDateTime(e.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:sticky lg:top-[68px]">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-gold" />
            <h4 className="font-bold text-night">Del {periodLabel || 'periodo'}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total gastado</span>
              <span className="font-mono font-bold text-danger">{fmtMoney(st.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Conceptos</span>
              <span className="font-mono font-semibold text-night">{st.byConcept.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Movimientos</span>
              <span className="font-mono font-semibold text-night">{periodEntries.length}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase text-muted mb-2">Top conceptos</div>
            <div className="space-y-1.5">
              {st.byConcept.slice(0, 5).map(([c, a]) => (
                <div key={c} className="flex justify-between text-sm">
                  <span className="text-muted truncate">{c}</span>
                  <span className="font-mono font-semibold text-night shrink-0">{fmtMoney(a)}</span>
                </div>
              ))}
              {st.byConcept.length === 0 && <p className="text-xs text-muted">Sin datos en el periodo.</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
