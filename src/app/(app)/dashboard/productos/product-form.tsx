'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProductForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price: Number(price) }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear el producto')
      setLoading(false)
      return
    }

    setName('')
    setPrice('')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="flex-1">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="product-name">
          Nombre
        </label>
        <input
          id="product-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="w-32">
        <label className="mb-1 block text-sm text-slate-300" htmlFor="product-price">
          Precio
        </label>
        <input
          id="product-price"
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="w-full text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        Agregar producto
      </button>
    </form>
  )
}
