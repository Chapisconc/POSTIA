import React, { useMemo, useState } from 'react'
import { Gift, Star, Users, Coins, Cake, Trophy } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Modal, EmptyState, PageHeader, StatCard, SearchInput,
} from '../ui'
import { readState, writeState, uid, nowISO } from '../../lib/storage'
import { fmtMoney, fmtDate, fmtAgo } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import { clientStatsAll } from '../../lib/stats'

const POINTS_PER = 10
const ptsFromSpent = (spent) => Math.floor((Number(spent) || 0) / POINTS_PER)

const levelOf = (pts) => {
  if (pts >= 3000) return { id: 'oro', label: 'Oro', tone: 'gold' }
  if (pts >= 1000) return { id: 'plata', label: 'Plata', tone: 'muted' }
  return { id: 'bronce', label: 'Bronce', tone: 'amber' }
}

function getRedemptions(state) {
  return state.fidelity?.redemptions || []
}

function redeemedPts(redemptions, clientId) {
  return redemptions
    .filter((r) => r.clientId === clientId)
    .reduce((a, r) => a + (Number(r.points) || 0), 0)
}

export default function Fidelidad({ state, refresh }) {
  const [query, setQuery] = useState('')
  const [redeem, setRedeem] = useState(null)
  const [points, setPoints] = useState('')

  const redemptions = useMemo(() => getRedemptions(state), [state])
  const stats = useMemo(() => clientStatsAll(state), [state])

  const rows = useMemo(() => {
    return stats.map((c) => {
      const earned = ptsFromSpent(c.totalSpent)
      const used = redeemedPts(redemptions, c.id)
      const balance = Math.max(0, earned - used)
      return { ...c, earned, used, balance, level: levelOf(earned) }
    })
  }, [stats, redemptions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((c) => `${c.name} ${c.phone || ''}`.toLowerCase().includes(q))
  }, [rows, query])

  const totalIssued = rows.reduce((a, c) => a + c.earned, 0)
  const totalRedeemed = redemptions.reduce((a, r) => a + (Number(r.points) || 0), 0)
  const month = new Date().getMonth()
  const birthdays = useMemo(() => {
    return (state.clients || []).filter((c) => {
      if (!c.birthday) return false
      const d = new Date(c.birthday)
      return !Number.isNaN(d.getTime()) && d.getMonth() === month
    })
  }, [state.clients, month])

  const openRedeem = (c) => {
    setRedeem(c)
    setPoints('')
  }

  const confirmRedeem = () => {
    const pts = Math.floor(Number(points) || 0)
    if (pts <= 0) { toastErr('Indica puntos a canjear'); return }
    if (pts > redeem.balance) { toastErr('No tiene suficientes puntos'); return }
    const s = readState()
    if (!s.fidelity) s.fidelity = { redemptions: [] }
    if (!Array.isArray(s.fidelity.redemptions)) s.fidelity.redemptions = []
    s.fidelity.redemptions.push({
      id: uid(),
      clientId: redeem.id,
      clientName: redeem.name,
      points: pts,
      value: pts,
      date: nowISO(),
    })
    writeState(s)
    refresh()
    toastOk(`Canjeados ${pts} pts = ${fmtMoney(pts)}`)
    setRedeem(null)
    setPoints('')
  }

  const monthName = new Date().toLocaleDateString('es-MX', { month: 'long' })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fidelidad"
        subtitle={`1 punto por cada ${fmtMoney(POINTS_PER)} gastados · canje $1 / punto`}
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente…" className="w-56" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Coins} label="Puntos emitidos" value={totalIssued} sub="Por compras pagadas" tone="gold" />
        <StatCard icon={Users} label="Clientes" value={rows.length} sub="En programa" tone="blue" />
        <StatCard icon={Gift} label="Canjes" value={redemptions.length} sub={`${totalRedeemed} pts canjeados`} tone="brand" />
        <StatCard icon={Cake} label="Cumpleaños" value={birthdays.length} sub={monthName} tone="pink" />
      </div>

      {birthdays.length > 0 && (
        <Card className="p-4 border-l-4 border-l-pink-400">
          <div className="flex items-center gap-2 font-semibold text-night mb-2">
            <Cake size={16} className="text-pink-500" /> Cumpleaños de {monthName}
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map((c) => (
              <Badge key={c.id} tone="pink">🎂 {c.name}{c.birthday ? ` · ${fmtDate(c.birthday)}` : ''}</Badge>
            ))}
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="⭐" title="Sin clientes" message="Registra clientes y cobros para acumular puntos." />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🔍" title="Sin resultados" message={`Nada coincide con «${query}».`} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold text-right">Gastado</th>
                  <th className="px-4 py-3 font-semibold text-right">Puntos</th>
                  <th className="px-4 py-3 font-semibold text-center">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Último pedido</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-line/50 last:border-0 hover:bg-page transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-brand-soft text-brand-dark grid place-items-center font-bold text-sm shrink-0">
                          {c.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-night truncate">{c.name}</div>
                          <div className="text-[11px] text-muted">{c.ordersCount} pedidos · canjeados {c.used}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-night text-right">{fmtMoney(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono font-extrabold text-brand">{c.balance}</div>
                      <div className="text-[10px] text-muted">de {c.earned}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={c.level.tone}>
                        {c.level.id === 'oro' ? '🥇' : c.level.id === 'plata' ? '🥈' : '🥉'} {c.level.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{c.lastOrder ? fmtAgo(c.lastOrder) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="gold"
                        className="!text-xs !py-1.5"
                        disabled={c.balance <= 0}
                        onClick={() => openRedeem(c)}
                      >
                        <Gift size={14} className="mr-1" /> Canjear
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {redemptions.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-night mb-3 flex items-center gap-2"><Trophy size={16} className="text-gold" /> Últimos canjes</h3>
          <div className="space-y-2 max-h-48 overflow-auto">
            {[...redemptions].reverse().slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm bg-page rounded-xl px-3 py-2">
                <div>
                  <span className="font-semibold text-night">{r.clientName}</span>
                  <span className="text-muted text-xs ml-2">{fmtDate(r.date)}</span>
                </div>
                <div className="font-mono font-bold text-brand">−{r.points} pts · {fmtMoney(r.value ?? r.points)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!redeem} onClose={() => setRedeem(null)} title="Canjear puntos">
        {redeem && (
          <div className="space-y-3">
            <div className="bg-page rounded-xl p-3 flex items-center gap-3">
              <Star size={20} className="text-gold" />
              <div>
                <div className="font-bold text-night">{redeem.name}</div>
                <div className="text-xs text-muted">Saldo: <span className="font-mono font-bold text-brand">{redeem.balance}</span> pts · {fmtMoney(redeem.balance)}</div>
              </div>
            </div>
            <Field label="Puntos a canjear" hint="$1 por punto">
              <Input
                type="number"
                min="1"
                max={redeem.balance}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder={`Máx. ${redeem.balance}`}
              />
            </Field>
            {Number(points) > 0 && (
              <div className="text-sm text-muted">
                Valor del canje: <span className="font-mono font-bold text-night">{fmtMoney(Math.floor(Number(points) || 0))}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setRedeem(null)}>Cancelar</Button>
              <Button variant="gold" className="flex-1" onClick={confirmRedeem}>Confirmar canje</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
