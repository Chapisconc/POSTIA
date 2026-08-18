'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Order } from '@/lib/orders/orders'
import type { OrderStatus } from '@/lib/config/service'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

interface KitchenViewProps {
  orders: Order[]
  statuses: OrderStatus[]
}

export function KitchenView({ orders, statuses }: KitchenViewProps) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusById = new Map(statuses.map((s) => [s.id, s]))

  const nextStatus = (order: Order): OrderStatus | null => {
    const currentIndex = statuses.findIndex((s) => s.id === order.status_id)
    if (currentIndex === -1) return null
    return statuses[currentIndex + 1] ?? null
  }

  const advance = async (order: Order) => {
    const next = nextStatus(order)
    if (!next) return
    setUpdatingId(order.id)
    setError(null)
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: next.id }),
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
      <h1 className="mb-6 text-3xl font-bold">Cocina</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-slate-400">No hay pedidos pendientes en cocina.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const status = statusById.get(order.status_id ?? -1)
            const next = nextStatus(order)
            return (
              <li
                key={order.id}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-lg text-slate-400">#{order.id}</span>
                  <span className="text-sm text-slate-500">{formatTime(order.created_at)}</span>
                </div>

                <span
                  className="mb-4 w-fit rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: status?.color ?? '#334155', color: '#0f172a' }}
                >
                  {status?.label ?? '—'}
                </span>

                <ul className="mb-4 flex-1 space-y-2">
                  {(order.items as Order['items']).map((item) => (
                    <li key={item.product_id} className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-emerald-400">{item.qty}×</span>
                      <span className="text-lg font-semibold">{item.name}</span>
                    </li>
                  ))}
                </ul>

                {next ? (
                  <button
                    type="button"
                    disabled={updatingId === order.id}
                    onClick={() => advance(order)}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {updatingId === order.id ? 'Actualizando…' : `Avanzar a ${next.label}`}
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">Sin estados siguientes</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
