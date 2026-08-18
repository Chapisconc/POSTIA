import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  Banknote, ShoppingCart, Receipt, Wallet, TrendingUp, CreditCard,
  Percent, Coins, Download, Users, MapPin, UtensilsCrossed, Package,
} from 'lucide-react'
import {
  Card, StatCard, Button, Badge, Field, Select, Tabs, EmptyState, PageHeader,
} from '../ui'
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, todayKey } from '../../lib/format'
import {
  paidOrders, salesByHour, salesByDay, salesByMonth, salesByPayment,
  topProducts, ordersByStatus, ordersByType, categoryStats, tableStats,
  deliveryStats, expenseStats, clientStatsAll, rangeFrom,
} from '../../lib/stats'
import { ORDER_STATUS_LABEL, SERVICE_LABEL, PAYMENT_METHODS } from '../../lib/storage'

const PIE_COLORS = ['#16A34A', '#0EA5E9', '#A855F7', '#F59E0B', '#EF4444', '#64748B', '#EC4899']
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]

const STATUS_TONE = {
  nuevo: 'blue', preparando: 'amber', listo: 'brand', porcobrar: 'gold',
  finalizado: 'success', cancelado: 'danger',
}
const TYPE_TONE = {
  mostrador: 'brand', mesa: 'night', domicilio: 'purple', menudigital: 'blue',
}
const TABLE_TONE = {
  libre: 'success', ocupada: 'amber', cuenta: 'gold', pagada: 'blue',
}
const TABLE_LABEL = {
  libre: 'Libre', ocupada: 'Ocupada', cuenta: 'Cuenta', pagada: 'Pagada',
}

function periodRange(period) {
  if (period === '7d' || period === '30d') {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (period === '7d' ? 6 : 29))
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  const r = rangeFrom(period === 'hoy' || period === 'mes' ? period : 'hoy')
  if (period === 'hoy' || period === 'mes') return r
  return rangeFrom('hoy')
}

function sum(arr, f) {
  return arr.reduce((a, x) => a + (f(x) || 0), 0)
}

function exportCsv(orders) {
  const header = ['folio', 'fecha', 'metodo', 'subtotal', 'descuento', 'total']
  const rows = orders.map((o) => [
    o.folio,
    o.paidAt || '',
    o.payment || '',
    Number(o.subtotal) || 0,
    Number(o.discount) || 0,
    Number(o.total) || 0,
  ])
  const esc = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [header.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reportes-pedidos-${todayKey()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TAB_ITEMS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'graficas', label: 'Gráficas' },
  { id: 'pagos', label: 'Métodos de pago' },
  { id: 'productos', label: 'Top productos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'hora', label: 'Por hora / día' },
  { id: 'estados', label: 'Pedidos por estado' },
  { id: 'tipos', label: 'Tipos de servicio' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'domicilios', label: 'Domicilios' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'clientes', label: 'Clientes top' },
]

export default function Reportes({ state, refresh, onNav, params, user }) {
  const [period, setPeriod] = useState('hoy')
  const [tab, setTab] = useState('resumen')

  const { from, to } = useMemo(() => periodRange(period), [period])
  const orders = useMemo(() => paidOrders(state, from, to), [state, from, to])

  const kpis = useMemo(() => {
    const ventas = sum(orders, (o) => o.total)
    const pedidos = orders.length
    const ticket = pedidos ? ventas / pedidos : 0
    const exp = expenseStats(state, from, to)
    const descuentos = sum(orders, (o) => o.discount)
    let comisiones = 0
    let redondeos = 0
    for (const c of state.caja?.sessions || []) {
      for (const s of c.sales || []) {
        const d = new Date(s.date)
        if (from && d < from) continue
        if (to && d > to) continue
        comisiones += Number(s.commission) || 0
        redondeos += Number(s.rounding) || 0
      }
    }
    if (comisiones === 0 && redondeos === 0) {
      for (const o of orders) {
        const info = o.paymentInfo
        if (info) {
          comisiones += Number(info.commission) || 0
          redondeos += Number(info.rounding) || 0
        }
      }
    }
    const ganancia = ventas - exp.total
    let efectivo = 0, tarjeta = 0, transferencia = 0, qr = 0, otros = 0
    for (const o of orders) {
      const m = o.payment || 'otro'
      if (m === 'efectivo') efectivo += o.total
      else if (m === 'tarjeta') tarjeta += o.total
      else if (m === 'transferencia') transferencia += o.total
      else if (m === 'qr') qr += o.total
      else otros += o.total
    }
    return {
      ventas, pedidos, ticket, gastos: exp.total, ganancia,
      comisiones, redondeos, descuentos,
      efectivo, tarjeta, transferencia, qr, otros,
    }
  }, [orders, state, from, to])

  const byDay = useMemo(() => salesByDay(state, period === '30d' ? 30 : period === 'mes' ? 31 : 14), [state, period])
  const byHour = useMemo(() => salesByHour(state, todayKey()), [state])
  const byMonth = useMemo(() => salesByMonth(state, 6), [state])
  const byPay = useMemo(() => salesByPayment(state, from, to), [state, from, to])
  const tops = useMemo(() => topProducts(state, 15, from, to), [state, from, to])
  const cats = useMemo(() => categoryStats(state, from, to), [state, from, to])
  const byStatus = useMemo(() => ordersByStatus(state), [state])
  const byType = useMemo(() => ordersByType(state), [state])
  const tables = useMemo(() => tableStats(state), [state])
  const deliv = useMemo(() => deliveryStats(state, from, to), [state, from, to])
  const exp = useMemo(() => expenseStats(state, from, to), [state, from, to])
  const clients = useMemo(() => clientStatsAll(state).slice(0, 10), [state])

  const expensesList = useMemo(() => {
    const list = []
    for (const c of state.caja?.sessions || []) {
      for (const e of c.expenses || []) {
        if (from && new Date(e.date) < from) continue
        if (to && new Date(e.date) > to) continue
        list.push({ ...e, sessionId: c.id })
      }
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [state, from, to])

  const hourDow = useMemo(() => {
    const dowMap = {}
    for (const i of DOW_ORDER) dowMap[i] = { dow: i, label: DOW[i], ventas: 0, pedidos: 0 }
    const hourMap = {}
    for (let h = 0; h < 24; h++) hourMap[h] = { hour: h, label: `${h}:00`, ventas: 0, pedidos: 0 }
    for (const o of orders) {
      if (!o.paidAt) continue
      const d = new Date(o.paidAt)
      const di = d.getDay()
      const h = d.getHours()
      dowMap[di].ventas += o.total || 0
      dowMap[di].pedidos += 1
      hourMap[h].ventas += o.total || 0
      hourMap[h].pedidos += 1
    }
    const byDow = DOW_ORDER.map((i) => dowMap[i])
    const byH = Object.values(hourMap).filter((x) => x.pedidos > 0 || (x.hour >= 8 && x.hour <= 23))
    const avgHour = byH.length
      ? byH.reduce((a, x) => a + (x.pedidos ? x.ventas / x.pedidos : 0), 0) / byH.filter((x) => x.pedidos).length || 0
      : 0
    return { byDow, byH, avgHour }
  }, [orders])

  const topRev = tops.reduce((a, p) => a + p.revenue, 0) || 1
  const maxCat = cats[0]?.revenue || 1
  const payTotal = byPay.reduce((a, p) => a + p.value, 0) || 1

  const periodLabel = { hoy: 'Hoy', '7d': '7 días', '30d': '30 días', mes: 'Este mes' }[period] || period

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        subtitle={`Análisis de ventas · ${periodLabel}`}
        actions={
          <>
            <Field label="Periodo">
              <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="min-w-[140px]">
                <option value="hoy">Hoy</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="mes">Este mes</option>
              </Select>
            </Field>
            <Button variant="outline" onClick={() => exportCsv(orders)} className="self-end">
              <Download size={16} className="inline mr-1" /> Exportar CSV
            </Button>
          </>
        }
      />

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {tab === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Banknote} label="Ventas" value={fmtMoney(kpis.ventas)} sub={periodLabel} tone="brand" />
            <StatCard icon={Receipt} label="Pedidos" value={fmtNum(kpis.pedidos)} sub="Pagados en rango" tone="blue" />
            <StatCard icon={ShoppingCart} label="Ticket prom." value={fmtMoney(kpis.ticket)} sub="Por pedido" tone="gold" />
            <StatCard icon={Wallet} label="Gastos" value={fmtMoney(kpis.gastos)} sub="En el periodo" tone="danger" />
            <StatCard icon={TrendingUp} label="Ganancia bruta" value={fmtMoney(kpis.ganancia)} sub="Ventas − gastos" tone="night" />
            <StatCard icon={CreditCard} label="Comisiones tarjeta" value={fmtMoney(kpis.comisiones)} sub="Cajas del rango" tone="purple" />
            <StatCard icon={Coins} label="Redondeos" value={fmtMoney(kpis.redondeos)} sub="Ajuste de cobro" tone="amber" />
            <StatCard icon={Percent} label="Descuentos" value={fmtMoney(kpis.descuentos)} sub="Aplicados" tone="pink" />
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="text-sm font-bold text-night mb-3 flex items-center gap-2">
              <Wallet size={16} className="text-brand" /> Desglose por método de pago
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.efectivo > 0 && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Efectivo</div>
                  <div className="font-mono font-extrabold text-lg text-emerald-800 dark:text-emerald-300 mt-0.5">{fmtMoney(kpis.efectivo)}</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-500">{kpis.ventas ? ((kpis.efectivo / kpis.ventas) * 100).toFixed(1) : 0}%</div>
                </div>
              )}
              {kpis.tarjeta > 0 && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase">Tarjeta</div>
                  <div className="font-mono font-extrabold text-lg text-blue-800 dark:text-blue-300 mt-0.5">{fmtMoney(kpis.tarjeta)}</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-500">{kpis.ventas ? ((kpis.tarjeta / kpis.ventas) * 100).toFixed(1) : 0}%</div>
                </div>
              )}
              {kpis.transferencia > 0 && (
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
                  <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase">Transferencia</div>
                  <div className="font-mono font-extrabold text-lg text-purple-800 dark:text-purple-300 mt-0.5">{fmtMoney(kpis.transferencia)}</div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-500">{kpis.ventas ? ((kpis.transferencia / kpis.ventas) * 100).toFixed(1) : 0}%</div>
                </div>
              )}
              {kpis.qr > 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">QR</div>
                  <div className="font-mono font-extrabold text-lg text-amber-800 dark:text-amber-300 mt-0.5">{fmtMoney(kpis.qr)}</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-500">{kpis.ventas ? ((kpis.qr / kpis.ventas) * 100).toFixed(1) : 0}%</div>
                </div>
              )}
              {kpis.otros > 0 && (
                <div className="rounded-xl bg-page dark:bg-gray-800/30 border border-line dark:border-gray-700 p-3">
                  <div className="text-[11px] font-semibold text-night-light dark:text-gray-400 uppercase">Otros</div>
                  <div className="font-mono font-extrabold text-lg text-night dark:text-gray-300 mt-0.5">{fmtMoney(kpis.otros)}</div>
                  <div className="text-[10px] text-muted dark:text-muted">{kpis.ventas ? ((kpis.otros / kpis.ventas) * 100).toFixed(1) : 0}%</div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Global (ventas − gastos)</span>
              <span className="font-mono font-extrabold text-lg text-night">{fmtMoney(kpis.ganancia)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'graficas' && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-night">Ventas por día</h3>
              <Badge tone="brand">{byDay.length} días</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDay} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={48} tickFormatter={(v) => '$' + fmtNum(v)} />
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-night">Ventas por hora (hoy)</h3>
                <Badge tone="gold">Hoy</Badge>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byHour} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={44} tickFormatter={(v) => '$' + fmtNum(v)} />
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Bar dataKey="value" name="Ventas" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-night">Ventas por mes</h3>
                <Badge tone="purple">6 meses</Badge>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={44} tickFormatter={(v) => '$' + fmtNum(v)} />
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Bar dataKey="ventas" name="Ventas" fill="#A855F7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'pagos' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-bold text-night mb-3">Distribución</h3>
            {byPay.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byPay} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {byPay.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon="💳" title="Sin pagos" message="No hay ventas pagadas en el periodo." />
            )}
          </Card>
          <Card className="p-5 overflow-auto">
            <h3 className="font-bold text-night mb-3">Detalle por método</h3>
            {byPay.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase border-b border-line">
                    <th className="py-2">Método</th>
                    <th className="py-2 text-right">Monto</th>
                    <th className="py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {byPay.map((p) => {
                    const pm = PAYMENT_METHODS.find((m) => m.label === p.name)
                    return (
                      <tr key={p.name} className="border-b border-line/60">
                        <td className="py-2.5 font-semibold text-night">{pm?.icon || '•'} {p.name}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-night">{fmtMoney(p.value)}</td>
                        <td className="py-2.5 text-right font-mono text-muted">{Math.round((p.value / payTotal) * 100)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-3 font-bold text-night">Total</td>
                    <td className="pt-3 text-right font-mono font-extrabold text-brand dark:text-night">{fmtMoney(payTotal)}</td>
                    <td className="pt-3 text-right font-mono text-muted">100%</td>
                  </tr>
                </tfoot>
              </table>
            ) : null}
          </Card>
        </div>
      )}

      {tab === 'productos' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-night">Top productos</h3>
            <Badge tone="brand">Top {tops.length}</Badge>
          </div>
          {tops.length ? (
            <div className="space-y-3">
              {tops.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-3">
                  <span className={`w-7 h-7 grid place-items-center rounded-full text-sm font-bold shrink-0 ${i === 0 ? 'bg-gold-soft text-gold' : i === 1 ? 'bg-line text-muted' : i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-page text-muted'}`}>
                    {['🥇', '🥈', '🥉'][i] || i + 1}
                  </span>
                  <span className="text-xl shrink-0">{p.emoji || '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm gap-2">
                      <span className="font-semibold text-night truncate">{p.name}</span>
                      <span className="font-mono text-muted shrink-0">{fmtNum(p.qty)} ud</span>
                    </div>
                    <div className="h-2 bg-line rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(4, (p.revenue / topRev) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-brand dark:text-night">{fmtMoney(p.revenue)}</div>
                    <div className="text-[11px] text-muted font-mono">{Math.round((p.revenue / topRev) * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🍗" title="Sin productos" message="No hay ventas de productos en el periodo." />
          )}
        </Card>
      )}

      {tab === 'categorias' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-night">Ventas por categoría</h3>
            <Badge tone="purple">{cats.length}</Badge>
          </div>
          {cats.length ? (
            <div className="space-y-4">
              {cats.map((c) => (
                <div key={c.categoryId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-night">{c.name}</span>
                    <span className="font-mono text-muted">{fmtNum(c.qty)} ud · <span className="font-bold text-brand dark:text-night">{fmtMoney(c.revenue)}</span></span>
                  </div>
                  <div className="h-3 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.max(4, (c.revenue / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📂" title="Sin categorías" message="No hay ventas categorizadas en el periodo." />
          )}
        </Card>
      )}

      {tab === 'hora' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-night">Por día de la semana</h3>
              <Badge tone="night">Lun–Dom</Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourDow.byDow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={44} tickFormatter={(v) => '$' + fmtNum(v)} />
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Bar dataKey="ventas" name="Ventas" fill="#0F172A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {hourDow.byDow.map((d) => (
                <div key={d.dow} className="bg-page rounded-lg p-1.5">
                  <div className="text-[10px] text-muted">{d.label}</div>
                  <div className="font-mono text-xs font-bold text-night">{d.pedidos}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-night">Por hora</h3>
              <Badge tone="gold">Ticket prom. {fmtMoney(hourDow.avgHour || 0)}</Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourDow.byH} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={44} tickFormatter={(v) => '$' + fmtNum(v)} />
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Bar dataKey="ventas" name="Ventas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {tab === 'estados' && (
        <Card className="p-5">
          <h3 className="font-bold text-night mb-4">Pedidos por estado</h3>
          {byStatus.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {byStatus.map((s) => (
                <div key={s.name} className="bg-page rounded-xl p-4 flex items-center justify-between">
                  <Badge tone={STATUS_TONE[s.name] || 'muted'}>{ORDER_STATUS_LABEL[s.name] || s.name}</Badge>
                  <span className="font-mono text-2xl font-extrabold text-night">{fmtNum(s.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📋" title="Sin pedidos" message="Aún no hay pedidos registrados." />
          )}
        </Card>
      )}

      {tab === 'tipos' && (
        <Card className="p-5">
          <h3 className="font-bold text-night mb-4">Tipos de servicio</h3>
          {byType.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {byType.map((t) => (
                <div key={t.name} className="bg-page rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-1">
                    {{ mostrador: '🥡', mesa: '🍽️', domicilio: '🛵', menudigital: '📱' }[t.name] || '•'}
                  </div>
                  <Badge tone={TYPE_TONE[t.name] || 'muted'}>{SERVICE_LABEL[t.name] || t.name}</Badge>
                  <div className="font-mono text-2xl font-extrabold text-night mt-2">{fmtNum(t.value)}</div>
                  <div className="text-xs text-muted">pedidos</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🛎️" title="Sin tipos" message="Aún no hay pedidos por tipo de servicio." />
          )}
        </Card>
      )}

      {tab === 'mesas' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed size={18} className="text-night" />
            <h3 className="font-bold text-night">Estado de mesas</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(tables).map(([k, v]) => (
              <div key={k} className="bg-page rounded-2xl p-4 text-center">
                <Badge tone={TABLE_TONE[k] || 'muted'}>{TABLE_LABEL[k] || k}</Badge>
                <div className="font-mono text-3xl font-extrabold text-night mt-2">{fmtNum(v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted text-center">
            Total mesas: <span className="font-mono font-bold text-night">{fmtNum(state.tables?.length || 0)}</span>
          </div>
        </Card>
      )}

      {tab === 'domicilios' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={Package} label="Total" value={fmtNum(deliv.total)} sub="En periodo" tone="night" />
            <StatCard icon={MapPin} label="Entregados" value={fmtNum(deliv.entregados)} sub="Completados" tone="brand" />
            <StatCard icon={ShoppingCart} label="En camino" value={fmtNum(deliv.enCamino)} sub="Activos" tone="blue" />
            <StatCard icon={Receipt} label="Cancelados" value={fmtNum(deliv.cancelados)} sub="No entregados" tone="danger" />
            <StatCard icon={Banknote} label="Ingresos" value={fmtMoney(deliv.revenue)} sub="Pagados" tone="gold" />
          </div>
        </div>
      )}

      {tab === 'gastos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={Wallet} label="Total gastos" value={fmtMoney(exp.total)} sub={periodLabel} tone="danger" />
            <StatCard icon={Receipt} label="Conceptos" value={fmtNum(exp.byConcept.length)} sub="Distintos" tone="amber" />
            <StatCard icon={Coins} label="Registros" value={fmtNum(expensesList.length)} sub="En cajas" tone="night" />
          </div>
          {exp.byConcept.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-night mb-3">Por concepto</h3>
              <div className="space-y-2">
                {exp.byConcept.map(([concept, amount]) => (
                  <div key={concept} className="flex justify-between items-center py-2 border-b border-line/60 last:border-0">
                    <span className="font-medium text-night">{concept}</span>
                    <span className="font-mono font-bold text-danger">{fmtMoney(amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="font-bold text-night mb-3">Lista de gastos</h3>
            {expensesList.length ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted uppercase border-b border-line">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Concepto</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesList.map((e, i) => (
                      <tr key={e.id || i} className="border-b border-line/60">
                        <td className="py-2 text-muted">{fmtDateTime(e.date)}</td>
                        <td className="py-2 font-medium text-night">{e.concept || '—'}</td>
                        <td className="py-2 text-right font-mono font-bold text-danger">{fmtMoney(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="💸" title="Sin gastos" message="No hay gastos registrados en el periodo." />
            )}
          </Card>
        </div>
      )}

      {tab === 'clientes' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand" />
              <h3 className="font-bold text-night">Clientes top</h3>
            </div>
            <Badge tone="brand">Top 10</Badge>
          </div>
          {clients.length ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase border-b border-line">
                    <th className="py-2">#</th>
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Pedidos</th>
                    <th className="py-2 text-right">Ticket prom.</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={c.id} className="border-b border-line/60">
                      <td className="py-2.5">
                        <span className={`w-6 h-6 inline-grid place-items-center rounded-full text-xs font-bold ${i === 0 ? 'bg-gold-soft text-gold' : i === 1 ? 'bg-line text-muted' : i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-page text-muted'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-night">{c.name || 'Sin nombre'}</div>
                        {c.phone && <div className="text-xs text-muted">{c.phone}</div>}
                      </td>
                      <td className="py-2.5 text-right font-mono">{fmtNum(c.ordersCount)}</td>
                      <td className="py-2.5 text-right font-mono text-muted">{fmtMoney(c.avgTicket)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-brand dark:text-night">{fmtMoney(c.totalSpent)}</td>
                      <td className="py-2.5 text-right text-xs text-muted">{c.lastOrder ? fmtDate(c.lastOrder) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="👥" title="Sin clientes" message="Aún no hay clientes con compras registradas." />
          )}
        </Card>
      )}
    </div>
  )
}
