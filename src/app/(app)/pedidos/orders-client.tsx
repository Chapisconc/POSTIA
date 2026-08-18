'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Order } from '@/lib/orders/orders'
import type { OrderStatus } from '@/lib/config/service'

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

interface OrdersClientViewProps {
  orders: Order[]
  statuses: OrderStatus[]
}

export function OrdersClientView({ orders, statuses }: OrdersClientViewProps) {
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
      <h1 className="mb-6 text-3xl font-bold">Pedidos</h1>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {orders.length === 0 ? (
          <p className="text-slate-400">Aún no hay pedidos registrados.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const status = statusById.get(order.status_id ?? -1)
              const next = nextStatus(order)
              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-slate-400">#{order.id}</span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: status?.color ?? '#334155',
                          color: '#0f172a',
                        }}
                      >
                        {status?.label ?? '—'}
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(order.created_at)}</span>
                    </div>
                    <span className="font-mono text-lg text-emerald-400">
                      {formatPrice(order.total)}
                    </span>
                  </div>

                  <ul className="mb-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    {(order.items as Order['items']).map((item) => (
                      <li key={item.product_id} className="rounded bg-slate-800 px-2 py-1">
                        {item.qty} × {item.name}
                      </li>
                    ))}
                  </ul>

                  {next ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => advance(order)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
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
