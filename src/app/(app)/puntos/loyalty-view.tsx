'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface CustomerOption {
  id: number
  name: string
}

export interface LoyaltySummaryRow {
  customer_id: number
  customer_name: string
  points: number
}

export function LoyaltyView({
  customers,
  summaries,
}: {
  customers: CustomerOption[]
  summaries: LoyaltySummaryRow[]
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: Number(customerId),
        points: Number(points),
        reason: reason || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudieron agregar los puntos')
      setLoading(false)
      return
    }

    setPoints('')
    setReason('')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="w-64">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="loyalty-customer">
            Cliente
          </label>
          <select
            id="loyalty-customer"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          >
            <option value="">Selecciona un cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="loyalty-points">
            Puntos
          </label>
          <input
            id="loyalty-points"
            type="number"
            step="1"
            required
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="loyalty-reason">
            Razón
          </label>
          <input
            id="loyalty-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="w-full text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || customers.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          Agregar puntos
        </button>
      </form>

      <div>
        {customers.length === 0 ? (
          <p className="text-slate-400">Aún no tienes clientes registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {summaries.map((summary) => (
              <li key={summary.customer_id} className="flex items-center justify-between p-4">
                <span className="font-semibold">{summary.customer_name}</span>
                <span className="font-mono text-emerald-400">{summary.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
