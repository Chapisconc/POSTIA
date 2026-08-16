import React, { useMemo, useState } from 'react'
import { ScrollText, Calendar, Users, Trash2, ArrowRight } from 'lucide-react'
import {
  Card, Button, Badge, ConfirmDialog, PageHeader, StatCard,
  SearchInput, EmptyState, Select,
} from '../ui'
import { fmtMoney, fmtDateTime, todayKey } from '../../lib/format'
import { toastOk } from '../../lib/notify'
import { getAudit, clearAudit, getCurrentUser, logAudit } from '../../lib/storage'

const ACTION_TONE = {
  'order.paid': 'success',
  'order.cancel': 'danger',
  'user.create': 'blue',
  'user.update': 'blue',
  'user.delete': 'danger',
  'role.update': 'purple',
  'caja.open': 'gold',
  'caja.close': 'gold',
  'settings': 'muted',
}

function toneFor(action) {
  if (!action) return 'muted'
  if (ACTION_TONE[action]) return ACTION_TONE[action]
  if (action.includes('delete') || action.includes('cancel')) return 'danger'
  if (action.includes('create') || action.includes('add')) return 'brand'
  if (action.includes('pay') || action.includes('paid')) return 'success'
  if (action.includes('update') || action.includes('edit')) return 'blue'
  return 'muted'
}

export default function Auditoria({ state, refresh, onNav }) {
  const entries = useMemo(() => {
    const list = getAudit() || state.audit || []
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [state.audit])

  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const today = todayKey()
  const todayCount = entries.filter((e) => (e.date || '').slice(0, 10) === today).length
  const byUser = useMemo(() => {
    const m = {}
    for (const e of entries) {
      const u = e.user || 'Sistema'
      m[u] = (m[u] || 0) + 1
    }
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]
    return top ? `${top[0]} (${top[1]})` : '—'
  }, [entries])

  const actions = useMemo(() => {
    const set = new Set(entries.map((e) => e.action).filter(Boolean))
    return [...set].sort()
  }, [entries])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return entries.filter((e) => {
      if (actionFilter && e.action !== actionFilter) return false
      if (!qq) return true
      const hay = [e.user, e.action, e.detail, e.orderId, String(e.amount ?? '')].join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [entries, q, actionFilter])

  const doClear = () => {
    const u = getCurrentUser()
    clearAudit(u)
    logAudit({ user: u, action: 'audit.clear', detail: 'Historial de auditoría limpiado' })
    toastOk('Auditoría limpiada')
    setConfirmClear(false)
    refresh()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Auditoría"
        subtitle="Registro de acciones del sistema"
        actions={
          <Button variant="danger" disabled={entries.length === 0} onClick={() => setConfirmClear(true)}>
            <span className="inline-flex items-center gap-1.5"><Trash2 size={16} /> Limpiar</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={ScrollText} label="Eventos" value={entries.length} sub="Totales" tone="brand" />
        <StatCard icon={Calendar} label="Hoy" value={todayCount} sub={today} tone="gold" />
        <StatCard icon={Users} label="Top usuario" value={byUser} tone="blue" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar usuario, acción, detalle…" className="flex-1 min-w-[200px]" />
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-full sm:w-56">
            <option value="">Todas las acciones</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="Sin eventos" message={entries.length ? 'Ningún registro coincide con el filtro.' : 'Aún no hay actividad registrada.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                  <th className="px-4 py-3 font-semibold">Detalle</th>
                  <th className="px-4 py-3 font-semibold">Pedido</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-line/70 hover:bg-page/60 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted font-mono text-xs">{fmtDateTime(e.date)}</td>
                    <td className="px-4 py-3 font-semibold text-night">{e.user || 'Sistema'}</td>
                    <td className="px-4 py-3"><Badge tone={toneFor(e.action)}>{e.action || '—'}</Badge></td>
                    <td className="px-4 py-3 text-night max-w-xs"><div className="truncate" title={e.detail}>{e.detail || '—'}</div></td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {e.orderId ? (
                        <button type="button" className="text-brand font-semibold hover:underline" onClick={() => onNav?.('pedidos')}>
                          {String(e.orderId).slice(0, 10)}
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono">{e.amount != null ? fmtMoney(e.amount) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[180px]">
                      {(e.before != null || e.after != null) ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="truncate max-w-[70px]" title={typeof e.before === 'object' ? JSON.stringify(e.before) : String(e.before ?? '')}>
                            {e.before == null ? '∅' : typeof e.before === 'object' ? '…' : String(e.before)}
                          </span>
                          <ArrowRight size={12} />
                          <span className="truncate max-w-[70px]" title={typeof e.after === 'object' ? JSON.stringify(e.after) : String(e.after ?? '')}>
                            {e.after == null ? '∅' : typeof e.after === 'object' ? '…' : String(e.after)}
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Limpiar auditoría"
        message="Se borrará todo el historial de eventos. Esta acción no se puede deshacer."
        confirmLabel="Limpiar todo"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={doClear}
      />
    </div>
  )
}
