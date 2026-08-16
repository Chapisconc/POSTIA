import React, { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  Banknote, ShoppingCart, Receipt, Package, Clock, PlusCircle, UtensilsCrossed,
  ChefHat, AlertTriangle, Bell, ArrowRight, Wallet,
} from 'lucide-react'
import { Card, StatCard, Badge, Button, EmptyState } from '../ui'
import { fmtMoney, fmtNum, fmtTime } from '../../lib/format'
import { todayStats, salesByHour, topProducts, rangeFrom } from '../../lib/stats'
import { activeCaja, cajaSummary } from '../../lib/storage'

export default function Dashboard({ state, onNav }) {
  const t = useMemo(() => todayStats(state), [state])
  const hours = useMemo(() => salesByHour(state), [state])
  const top = useMemo(() => topProducts(state, 5, ...Object.values(rangeFrom('hoy'))), [state])
  const session = activeCaja()

  const alerts = []
  for (const p of t.agotados) alerts.push({ tone: 'danger', icon: '🛑', text: `${p.name} agotado`, nav: 'inventario' })
  for (const i of t.lowInventory) alerts.push({ tone: 'amber', icon: '📉', text: `Inventario bajo: ${i.name} (${i.stock} ${i.unit})`, nav: 'inventario' })
  for (const o of t.atrasados) alerts.push({ tone: 'amber', icon: '⏰', text: `Pedido #${o.folio} atrasado`, nav: 'pedidos' })
  if (!t.cajaOpen) alerts.push({ tone: 'danger', icon: '💵', text: 'Caja sin abrir', nav: 'caja' })
  if (t.cajaDiff) alerts.push({ tone: 'amber', icon: '⚖️', text: `Caja con diferencia de ${fmtMoney(t.cajaDiff.difference)}`, nav: 'jornadas' })
  const porCobrarList = state.orders.filter((o) => o.status === 'porcobrar')
  for (const o of porCobrarList) alerts.push({ tone: 'blue', icon: '🧾', text: `Pedido #${o.folio} esperando pago`, nav: 'pedidos' })
  const hasSalesToday = t.salesToday > 0

  const quick = [
    { label: 'Nuevo pedido', icon: PlusCircle, nav: 'pos', cls: 'bg-brand hover:bg-brand-dark text-white' },
    { label: 'Mesas', icon: UtensilsCrossed, nav: 'mesas', cls: 'bg-night hover:bg-night-light text-white' },
    { label: 'Cocina', icon: ChefHat, nav: 'cocina', cls: 'bg-gold hover:opacity-90 text-white' },
    { label: 'Caja', icon: Banknote, nav: 'caja', cls: 'bg-info hover:bg-info-dark text-white' },
    { label: 'Pedidos', icon: Receipt, nav: 'pedidos', cls: 'bg-brand hover:bg-brand-dark text-white' },
  ]

  return (
    <div className="space-y-5">
      {/* Resumen superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="Ventas hoy" value={fmtMoney(t.salesToday)} sub="Ventas cobradas hoy" tone="brand" onClick={() => onNav('reportes')} />
        <StatCard icon={Receipt} label="Pedidos" value={fmtNum(t.ordersToday)} sub={`${fmtNum(t.unitsSold)} productos vendidos`} tone="blue" onClick={() => onNav('pedidos')} />
        <StatCard icon={ShoppingCart} label="Ticket promedio" value={fmtMoney(t.avgTicket)} sub="Por pedido de hoy" tone="gold" onClick={() => onNav('reportes')} />
        <StatCard icon={Package} label="Productos vendidos" value={fmtNum(t.unitsSold)} sub={`${state.products.length} en catálogo`} tone="purple" onClick={() => onNav('productos')} />
      </div>

      {/* Estado operativo */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-brand" />
          <h3 className="font-bold text-night">Estado operativo</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Pedidos nuevos', value: t.countNuevo, nav: 'pedidos', tone: 'blue' },
            { label: 'En preparación', value: t.countPreparando, nav: 'cocina', tone: 'amber' },
            { label: 'Listos', value: t.countListo, nav: 'cocina', tone: 'brand' },
            { label: 'Por cobrar', value: t.countPorCobrar, nav: 'pedidos', tone: 'gold' },
            { label: 'Domicilios', value: t.countDomicilios, nav: 'domicilios', tone: 'purple' },
            { label: 'Mesas ocupadas', value: `${t.mesasOcupadas}/${t.mesasTotal}`, nav: 'mesas', tone: 'night' },
          ].map((c) => (
            <button key={c.label} onClick={() => onNav(c.nav)}
              className="bg-page rounded-xl p-3 text-left hover:shadow-md transition hover:bg-line/60">
              <div className={`text-2xl font-extrabold font-mono ${c.tone === 'blue' ? 'text-info-dark' : c.tone === 'amber' ? 'text-gold' : c.tone === 'brand' ? 'text-brand-dark' : c.tone === 'gold' ? 'text-gold' : c.tone === 'purple' ? 'text-brand' : 'text-night'}`}>{c.value}</div>
              <div className="text-[11px] text-muted font-medium mt-0.5">{c.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="p-4 border-l-4 border-l-gold">
          <div className="flex items-center gap-2 text-gold font-semibold mb-2">
            <Bell size={18} /> Alertas ({alerts.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.slice(0, 8).map((a, i) => (
              <button key={i} onClick={() => onNav(a.nav)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${a.tone === 'danger' ? 'bg-danger-soft text-danger hover:bg-danger hover:text-white' : a.tone === 'blue' ? 'bg-info-soft text-info-dark hover:bg-info hover:text-white' : 'bg-gold-soft text-gold-dark hover:bg-gold hover:text-white'}`}>
                {a.icon} {a.text}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Ventas por hora */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-night">Ventas por hora (hoy)</h3>
          <Badge tone="brand">Hoy</Badge>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={44} tickFormatter={(v) => '$' + fmtNum(v)} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="value" name="Ventas" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Más vendidos */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-night">Más vendidos hoy</h3>
            <button onClick={() => onNav('reportes')} className="text-xs font-semibold text-brand flex items-center gap-0.5 hover:underline">Ver reportes <ArrowRight size={12} /></button>
          </div>
          {top.length > 0 ? (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-7 h-7 grid place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold-soft text-gold' : i === 1 ? 'bg-line text-muted' : i === 2 ? 'bg-warning-soft text-warning-dark' : 'bg-page text-muted'}`}>{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-night truncate">{p.name}</span>
                      <span className="text-muted font-mono">{fmtNum(p.qty)} ud</span>
                    </div>
                    <div className="h-2 bg-line rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(6, (p.qty / top[0].qty) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-brand">{fmtMoney(p.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🍗" title="Sin ventas hoy" message="Cuando registres pedidos aparecerá aquí el ranking." />
          )}
        </Card>

        {/* Caja del día */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-night">Caja</h3>
            <Badge tone={t.cajaOpen ? 'success' : 'danger'}>{t.cajaOpen ? 'Abierta' : 'Cerrada'}</Badge>
          </div>
          {session ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Efectivo', v: cajaSummary(session).cashSales, c: 'text-brand-dark' },
                  { label: 'Tarjeta', v: cajaSummary(session).cardSales, c: 'text-info-dark' },
                  { label: 'Transferencia', v: cajaSummary(session).transferSales, c: 'text-brand' },
                ].map((x) => (
                  <div key={x.label} className="bg-page rounded-xl p-2">
                    <div className="text-[10px] text-muted uppercase">{x.label}</div>
                    <div className={`font-mono font-bold text-sm ${x.c}`}>{fmtMoney(x.v)}</div>
                  </div>
                ))}
              </div>
              <Button variant="dark" className="w-full" onClick={() => onNav('caja')}>Ir a caja</Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-sm text-muted mb-3">La caja está cerrada. Ábrela para registrar el turno.</p>
              <Button onClick={() => onNav('caja')}><Wallet size={16} className="mr-1" /> Abrir caja</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-gold" />
          <h3 className="font-bold text-night">Acciones rápidas</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {quick.map((q) => {
            const Icon = q.icon
            return (
              <button key={q.label} onClick={() => onNav(q.nav)}
                className={`py-3 rounded-2xl font-bold text-sm flex flex-col items-center gap-1.5 transition shadow-sm ${q.cls}`}>
                <Icon size={22} /> {q.label}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
