'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CashRegister } from '@/lib/caja/caja'

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface CajaViewProps {
  active: CashRegister | null
  registers: CashRegister[]
}

export function CajaView({ active, registers }: CajaViewProps) {
  const router = useRouter()
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_amount: Number(openingAmount) || 0 }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo abrir la caja')
      setLoading(false)
      return
    }

    setOpeningAmount('')
    router.refresh()
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!active) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/caja/${active.id}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closing_amount: Number(closingAmount) || 0 }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo cerrar la caja')
      setLoading(false)
      return
    }

    setClosingAmount('')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Caja</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {active ? (
        <div className="mb-8 rounded-2xl border border-emerald-800 bg-slate-900 p-4">
          <p className="mb-1 text-sm text-slate-400">Caja abierta</p>
          <p className="mb-4 text-3xl font-bold text-emerald-400">
            {formatPrice(active.opening_amount)}
          </p>
          <form onSubmit={handleClose} className="flex flex-wrap items-end gap-4">
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="closing-amount"
              >
                Monto de cierre
              </label>
              <input
                id="closing-amount"
                type="number"
                min="0"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          </form>
        </div>
      ) : (
        <form
          onSubmit={handleOpen}
          className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
        >
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="opening-amount">
              Monto inicial
            </label>
            <input
              id="opening-amount"
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </form>
      )}

      <h2 className="mb-3 text-xl font-semibold">Historial de cierres</h2>

      {registers.length === 0 ? (
        <p className="text-slate-400">Aún no hay registros de caja.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
          {registers.map((register) => (
            <li key={register.id} className="flex items-center justify-between p-4">
              <div>
                <span
                  className={`mr-3 rounded-full px-3 py-1 text-xs font-semibold ${
                    register.status === 'abierta'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {register.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                </span>
                <span className="text-xs text-slate-500">{formatDate(register.opened_at)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  Inicio: {formatPrice(register.opening_amount)}
                </p>
                <p className="font-semibold text-emerald-400">
                  {register.status === 'cerrada' && register.closing_amount !== null
                    ? `Cierre: ${formatPrice(register.closing_amount)}`
                    : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
