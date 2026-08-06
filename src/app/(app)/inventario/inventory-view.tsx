'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InventoryMovement, ProductStock } from '@/lib/inventory/inventory'

const TYPE_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
}

export function InventoryView({
  products,
  movements,
}: {
  products: ProductStock[]
  movements: InventoryMovement[]
}) {
  const router = useRouter()
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<'entrada' | 'salida'>('entrada')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productNames = Object.fromEntries(products.map((p) => [p.id, p.name]))
  const lastMovements = [...movements].reverse().slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: Number(productId), type, qty: Number(qty), note }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo registrar el movimiento')
      setLoading(false)
      return
    }

    setQty('')
    setNote('')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="w-64">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="movement-product">
            Producto
          </label>
          <select
            id="movement-product"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          >
            <option value="" disabled>
              Selecciona un producto
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="movement-type">
            Tipo
          </label>
          <select
            id="movement-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'entrada' | 'salida')}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>

        <div className="w-36">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="movement-qty">
            Cantidad
          </label>
          <input
            id="movement-qty"
            type="number"
            min="1"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="movement-note">
            Nota
          </label>
          <input
            id="movement-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="w-full text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          Registrar movimiento
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Stock actual</h2>
        {products.length === 0 ? (
          <p className="text-slate-400">Aún no tienes productos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-semibold">{product.name}</td>
                    <td className="px-4 py-3 font-mono">
                      {product.price.toLocaleString('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        data-testid={`stock-${product.id}`}
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          product.stock > 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Últimos movimientos</h2>
        {lastMovements.length === 0 ? (
          <p className="text-slate-400">Aún no hay movimientos registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {lastMovements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">
                    {productNames[movement.product_id] ?? `Producto #${movement.product_id}`}
                  </p>
                  <p className="text-sm text-slate-400">{movement.note || 'Sin nota'}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono text-sm font-bold ${
                      movement.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {movement.type === 'entrada' ? '+' : '−'}
                    {movement.qty}
                  </span>
                  <p className="text-xs text-slate-500">{TYPE_LABELS[movement.type]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
