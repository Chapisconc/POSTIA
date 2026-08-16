import React, { useMemo, useState } from 'react'
import { Search, RefreshCw, FileText, Eye } from 'lucide-react'
import { fmtMoney, fmtDateTime } from '../../lib/format'
import { toastErr } from '../../lib/notify'
import { Card, Button, Badge, Input } from '../ui'
import { ORDER_STATUS_LABEL, SERVICE_LABEL } from '../../lib/storage'
import OrderDetailModal from './OrderDetailModal'

const PAGE_SIZE = 25

const STATUS_TONE = {
  nuevo: 'blue',
  preparando: 'amber',
  listo: 'brand',
  porcobrar: 'gold',
  finalizado: 'success',
  cancelado: 'danger',
}

const SERVICE_TONE = {
  mostrador: 'brand',
  mesa: 'night',
  domicilio: 'purple',
  menudigital: 'blue',
}

export default function HistorialPedidos({ state, refresh }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [origin, setOrigin] = useState('todos')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)

  const openDetail = (o) => {
    if (!o) return
    setDetailOrder(o)
  }

  const orders = useMemo(() => {
    try {
      const src = state?.orders || []
      const from = fromDate ? new Date(fromDate) : null
      const to = toDate ? new Date(toDate + 'T23:59:59') : null

      return (src || []).filter((o) => {
        const d = new Date(o.createdAt)
        if (from && d < from) return false
        if (to && d > to) return false
        if (origin === 'pdv_web') return o.serviceType === 'mostrador' || o.serviceType === 'menudigital'
        if (origin === 'aplicaciones') return o.serviceType === 'domicilio' || o.serviceType === 'mesa'
        return true
      })
        .filter((o) => {
          if (!q.trim()) return true
          const s = q.toLowerCase()
          return String(o.folio).includes(s) || (o.client?.name || '').toLowerCase().includes(s)
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } catch (err) {
      console.error('Error cargando historial:', err)
      toastErr('No se pudo cargar el historial')
      return []
    }
  }, [state, fromDate, toDate, origin, q])

  const total = useMemo(() => orders.reduce((s, o) => s + (Number(o.total) || 0), 0), [orders])

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = orders.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const startIdx = orders.length === 0 ? 0 : safePage * pageSize + 1
  const endIdx = Math.min(orders.length, safePage * pageSize + pageSize)

  const doRefresh = async () => {
    setLoading(true)
    try {
      await refresh()
    } catch (e) {
      console.error(e)
      toastErr('No se pudo actualizar el historial')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="!py-1.5 !text-xs" />
          <span className="text-xs text-muted">a</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="!py-1.5 !text-xs" />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-page p-1">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pdv_web', label: 'PDV / WEB' },
            { id: 'aplicaciones', label: 'Aplicaciones' },
          ].map((opt) => {
            const active = origin === opt.id
            return (
              <button key={opt.id} onClick={() => setOrigin(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${active ? 'bg-brand text-white' : 'text-muted hover:text-night hover:bg-line'}`}>
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3 py-1.5 text-xs text-muted">
            <Eye size={14} />
            <span>Pedidos: {orders.length}</span>
            <span className="text-muted/40">|</span>
            <span>Total: {fmtMoney(total)}</span>
          </div>
          <Button onClick={doRefresh} disabled={loading} className="!py-1.5 !px-3 !text-xs">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="success" onClick={() => {
            const csv = ['Folio,Fecha,Cliente,Servicio,Estado,Total']
            orders.forEach(o => {
              csv.push(`${o.folio},${fmtDateTime(o.createdAt)},${o.client?.name || ''},${o.serviceType || ''},${o.status},${o.total || 0}`)
            })
            const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = 'historial-pedidos.csv'; a.click()
            URL.revokeObjectURL(url)
          }} className="!py-1.5 !px-3 !text-xs">
            <FileText size={14} className="mr-1" />
            Reporte
          </Button>
          <div className="relative">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="!pl-8 !py-1.5 !text-xs w-48" />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                <th className="px-4 py-2.5 font-semibold min-w-[220px]">ESTADO</th>
                <th className="px-4 py-2.5 font-semibold min-w-[80px]">ORIGEN</th>
                <th className="px-4 py-2.5 font-semibold min-w-[160px]">FECHA</th>
                <th className="px-4 py-2.5 font-semibold min-w-[160px]">CLIENTE</th>
                <th className="px-4 py-2.5 font-semibold min-w-[120px]">ESTADO DE PAGO</th>
                <th className="px-4 py-2.5 font-semibold text-right min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => {
                const statusTone = STATUS_TONE[o.status] || 'brand'
                const typeTone = SERVICE_TONE[o.serviceType] || 'brand'
                const dateLabel = o.paidAt || o.closedAt || o.createdAt
                const canViewDetail = o.status === 'finalizado' || o.status === 'cancelado'
                return (
                  <tr key={o.id} className={`border-b border-line last:border-0 transition-colors ${canViewDetail ? 'hover:bg-page cursor-pointer' : 'cursor-default'}`} onClick={() => canViewDetail && openDetail(o)}>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-mono font-extrabold text-night">#{o.folio}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge tone={typeTone}>{SERVICE_LABEL[o.serviceType] || o.serviceType}</Badge>
                        <Badge tone={statusTone}>{ORDER_STATUS_LABEL[o.status] || o.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge tone="brand">POS</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <div className="text-xs text-muted">{fmtDateTime(dateLabel)}</div>
                    </td>
                    <td className="px-4 py-3 align-middle max-w-0 overflow-hidden">
                      <div className="font-semibold text-night truncate">{o.client?.name || 'Sin cliente'}</div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {o.paid ? (
                        <div>
                          <Badge tone="success">Pagado</Badge>
                          {o.payment && <div className="text-[11px] text-muted mt-1">{o.payment} · {fmtMoney(o.paymentInfo?.charge || o.total)}</div>}
                        </div>
                      ) : (
                        <Badge tone="amber">No pagado</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="font-mono font-bold text-night tabular-nums">{fmtMoney(o.total)}</div>
                    </td>
                  </tr>
                )
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-muted text-xs">Sin pedidos en este rango</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-line">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Elementos por página:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="rounded-lg border border-line bg-page text-night px-2 py-1 text-xs">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="text-xs text-muted">
            {orders.length === 0 ? '0-0 de 0' : `${startIdx}-${endIdx} de ${orders.length}`}
          </div>

          <div className="flex items-center gap-1">
            <button disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="touch-target inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line bg-page text-muted hover:text-night hover:border-line disabled:opacity-40 transition">
              &lt;
            </button>
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="touch-target inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line bg-page text-muted hover:text-night hover:border-line disabled:opacity-40 transition">
              &gt;
            </button>
          </div>
        </div>
      </Card>

      <OrderDetailModal order={detailOrder} open={!!detailOrder} onClose={() => setDetailOrder(null)} />
    </div>
  )
}
