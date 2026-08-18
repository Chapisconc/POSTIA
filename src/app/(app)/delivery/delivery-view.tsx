'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Delivery, DeliveryStatus } from '@/lib/delivery/delivery'
import type { Order } from '@/lib/orders/orders'

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  asignado: 'Asignado',
  en_camino: 'En camino',
  entregado: 'Entregado',
}

const STATUS_BADGE: Record<DeliveryStatus, string> = {
  asignado: 'bg-slate-700 text-slate-100',
  en_camino: 'bg-amber-500/20 text-amber-400',
  entregado: 'bg-emerald-500/20 text-emerald-400',
}

function nextStatus(status: DeliveryStatus): DeliveryStatus | null {
  if (status === 'asignado') return 'en_camino'
  if (status === 'en_camino') return 'entregado'
  return null
}

interface DeliveryViewProps {
  deliveries: Delivery[]
  availableOrders: Order[]
}

export function DeliveryView({ deliveries, availableOrders }: DeliveryViewProps) {
  const router = useRouter()
  const [orderId, setOrderId] = useState('')
  const [courier, setCourier] = useState('')
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: Number(orderId), courier }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear la entrega')
      setLoading(false)
      return
    }

    setOrderId('')
    setCourier('')
    router.refresh()
  }

  const advance = async (delivery: Delivery) => {
    const next = nextStatus(delivery.status)
    if (!next) return
    setUpdatingId(delivery.id)
    setError(null)
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'No se pudo actualizar el estado')
        return
      }
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Delivery</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <form
        onSubmit={handleAssign}
        className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="delivery-order">
            Pedido
          </label>
          <select
            id="delivery-order"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          >
            <option value="">Selecciona un pedido</option>
            {availableOrders.map((order) => (
              <option key={order.id} value={order.id}>
                #{order.id} · {order.items.length} productos · ${order.total.toLocaleString('es-MX')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-56">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="delivery-courier">
            Repartidor
          </label>
          <input
            id="delivery-courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || availableOrders.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          Asignar entrega
        </button>
      </form>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Entregas
      </h2>

      {deliveries.length === 0 ? (
        <p className="text-slate-400">Aún no hay entregas asignadas.</p>
      ) : (
        <ul className="space-y-3">
          {deliveries.map((delivery) => {
            const next = nextStatus(delivery.status)
            return (
              <li
                key={delivery.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-slate-400">
                      Pedido #{delivery.order_id}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[delivery.status]}`}
                    >
                      {STATUS_LABELS[delivery.status]}
                    </span>
                  </div>
                  {next ? (
                    <button
                      type="button"
                      disabled={updatingId === delivery.id}
                      onClick={() => advance(delivery)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                    >
                      {updatingId === delivery.id
                        ? 'Actualizando…'
                        : `Marcar como ${STATUS_LABELS[next]}`}
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Repartidor: {delivery.courier || '—'}
                  {delivery.note ? ` · Nota: ${delivery.note}` : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
