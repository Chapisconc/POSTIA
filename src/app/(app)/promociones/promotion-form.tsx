'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PromotionRow {
  id: number
  name: string
  discount_type: 'porcentaje' | 'fijo'
  value: number
  active: boolean
  starts_at: string | null
  ends_at: string | null
}

export function PromotionForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState<'porcentaje' | 'fijo'>('porcentaje')
  const [value, setValue] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        discount_type: discountType,
        value: Number(value),
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear la promoción')
      setLoading(false)
      return
    }

    setName('')
    setValue('')
    setStartsAt('')
    setEndsAt('')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="flex-1">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="promotion-name">
          Nombre
        </label>
        <input
          id="promotion-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-44">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="promotion-type">
          Tipo
        </label>
        <select
          id="promotion-type"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as 'porcentaje' | 'fijo')}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        >
          <option value="porcentaje">Porcentaje</option>
          <option value="fijo">Fijo</option>
        </select>
      </div>

      <div className="w-32">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="promotion-value">
          Valor
        </label>
        <input
          id="promotion-value"
          type="number"
          step="0.01"
          min="0"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-40">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="promotion-starts">
          Inicio
        </label>
        <input
          id="promotion-starts"
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-40">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="promotion-ends">
          Fin
        </label>
        <input
          id="promotion-ends"
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="w-full text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        Agregar promoción
      </button>
    </form>
  )
}

export function PromotionList({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(id: number) {
    setBusyId(id)
    setError(null)

    const res = await fetch(`/api/promotions/${id}/toggle`, { method: 'PATCH' })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo actualizar la promoción')
      setBusyId(null)
      return
    }

    router.refresh()
  }

  return (
    <div>
      {promotions.length === 0 ? (
        <p className="text-slate-400">Aún no tienes promociones. Agrega la primera.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
          {promotions.map((promotion) => (
            <li key={promotion.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{promotion.name}</p>
                <p className="text-sm text-slate-400">
                  {promotion.discount_type === 'porcentaje'
                    ? `${promotion.value}%`
                    : promotion.value.toLocaleString('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      })}
                  {promotion.starts_at || promotion.ends_at
                    ? ` · ${promotion.starts_at ?? '…'} → ${promotion.ends_at ?? '…'}`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    promotion.active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {promotion.active ? 'Activo' : 'Inactivo'}
                </span>

                <button
                  onClick={() => handleToggle(promotion.id)}
                  disabled={busyId === promotion.id}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  {promotion.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}
