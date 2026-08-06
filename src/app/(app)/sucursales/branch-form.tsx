'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BranchForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear la sucursal')
      setLoading(false)
      return
    }

    setName('')
    setAddress('')
    setPhone('')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="flex-1">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="branch-name">
          Nombre
        </label>
        <input
          id="branch-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-64">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="branch-address">
          Dirección
        </label>
        <input
          id="branch-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-44">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="branch-phone">
          Teléfono
        </label>
        <input
          id="branch-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="w-full text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        Agregar sucursal
      </button>
    </form>
  )
}
