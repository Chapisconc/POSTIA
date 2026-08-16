import React, { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fmtMoney } from '../../lib/format'

const CARD_STYLES = {
  libre: 'bg-card border-line border-dashed text-muted hover:border-brand hover:text-brand',
  ocupada: 'bg-brand-soft border-brand/20 text-night shadow-sm',
  cuenta: 'bg-gold-soft border-gold/30 text-night',
  pagada: 'bg-success-soft border-success/30 text-success-dark',
}

export const TableCard = React.memo(function TableCard({ mesa, activeOrder, onClick }) {
  const estado = mesa.status
  const numero = String(mesa.name || '').replace(/\D/g, '') || mesa.name
  const isOcupada = estado !== 'libre'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-xl p-3 transition min-h-[120px] w-full',
        CARD_STYLES[estado] || CARD_STYLES.libre
      )}
    >
      <span className="text-2xl font-bold leading-none">{numero}</span>
      {estado === 'libre' && <span className="text-[10px] font-black tracking-widest">LIBRE</span>}
      {isOcupada && activeOrder && (
        <>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-page/80 text-night">
            {estado === 'cuenta' ? 'Cuenta' : 'Ocupada'}
          </span>
          {activeOrder.client?.name && (
            <span className="text-[10px] text-muted truncate max-w-full px-1">{activeOrder.client.name}</span>
          )}
          <span className="text-xs font-semibold mt-auto">{fmtMoney(activeOrder.total || 0)}</span>
        </>
      )}
      {isOcupada && !activeOrder && (
        <span className="text-[10px] font-semibold opacity-80">Sin pedido</span>
      )}
    </button>
  )
})

export default function TableMap({ salons, tables, orders, onSelectTable, onCreateTable }) {
  const [activeSalonId, setActiveSalonId] = React.useState(() => salons[0]?.id || null)

  const salonStats = useMemo(() => {
    const map = new Map()
    salons.forEach((s) => {
      const total = tables.filter((t) => t.salonId === s.id).length
      const ocupadas = tables.filter((t) => t.salonId === s.id && t.status !== 'libre').length
      map.set(s.id, { total, ocupadas })
    })
    return map
  }, [salons, tables])

  const tablesBySalon = useMemo(() => {
    if (!activeSalonId) return []
    return tables.filter((t) => t.salonId === activeSalonId)
  }, [tables, activeSalonId])

  const activeSalon = salons.find((s) => s.id === activeSalonId) || null

  if (salons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="text-4xl">🏠</span>
        <p className="text-sm text-muted font-medium">No hay salones creados.</p>
        <button type="button" onClick={onCreateTable} className="btn-primary">Crear salón</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {salons.map((s) => {
          const stats = salonStats.get(s.id) || { total: 0, ocupadas: 0 }
          const active = s.id === activeSalonId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSalonId(s.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap shrink-0',
                active ? 'bg-brand text-white shadow-sm' : 'bg-card text-night border border-line hover:border-brand/50'
              )}
            >
              <span className="truncate">{s.name}</span>
              <span
                className={cn(
                  'text-[11px] px-1.5 py-0.5 rounded-md font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-page text-muted'
                )}
              >
                {stats.ocupadas}/{stats.total}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onCreateTable}
          className="shrink-0 px-3 py-2 rounded-xl text-sm text-muted border border-dashed border-line hover:border-brand hover:text-brand transition"
        >
          + Nueva sala
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto p-1">
        {tablesBySalon.map((t) => {
          const activeOrder = t.orderId ? orders.find((o) => o.id === t.orderId && o.status !== 'finalizado' && o.status !== 'cancelado') : null
          return (
            <TableCard
              key={t.id}
              mesa={t}
              activeOrder={activeOrder}
              onClick={() => onSelectTable(t)}
            />
          )
        })}
        <button
          type="button"
          onClick={() => onCreateTable()}
          className="flex flex-col items-center justify-center gap-2 min-h-[120px] rounded-xl border-2 border-dashed border-line bg-card text-muted hover:border-brand hover:text-brand transition"
        >
          <Plus size={24} />
          <span className="text-xs font-medium">Nueva mesa</span>
        </button>
      </div>
    </div>
  )
}
