'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PendingOrderRow {
  id: number
  total: number
}

export interface InvoiceRow {
  id: number
  order_id: number
  rfc: string
  customer_name: string | null
  cfdi_status: 'pendiente' | 'emitida'
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function PendingInvoiceForm({ order }: { order: PendingOrderRow }) {
  const router = useRouter()
  const [rfc, setRfc] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, rfc, customer_name: customerName }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear la factura')
      setLoading(false)
      return
    }

    setRfc('')
    setCustomerName('')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="w-40">
        <p className="text-sm text-slate-400">Pedido #{order.id}</p>
        <p className="font-mono text-emerald-400">{formatPrice(order.total)}</p>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-sm text-slate-300" htmlFor={`invoice-rfc-${order.id}`}>
          RFC
        </label>
        <input
          id={`invoice-rfc-${order.id}`}
          required
          value={rfc}
          onChange={(e) => setRfc(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          placeholder="XAXX010101000"
        />
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-sm text-slate-300" htmlFor={`invoice-name-${order.id}`}>
          Nombre
        </label>
        <input
          id={`invoice-name-${order.id}`}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="w-full text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        Facturar
      </button>
    </form>
  )
}

function InvoiceRowItem({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleIssue() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/invoices/${invoice.id}/issued`, { method: 'PATCH' })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo emitir la factura')
      setLoading(false)
      return
    }

    router.refresh()
  }

  const pending = invoice.cfdi_status === 'pendiente'

  return (
    <li className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Pedido #{invoice.order_id}</p>
          <p className="text-sm text-slate-400">
            {invoice.rfc}
            {invoice.customer_name ? ` · ${invoice.customer_name}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              pending
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {pending ? 'Pendiente' : 'Emitida'}
          </span>

          {pending && (
            <button
              onClick={handleIssue}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Emitiendo…' : 'Emitir'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </li>
  )
}

export function InvoiceView({
  orders,
  invoices,
}: {
  orders: PendingOrderRow[]
  invoices: InvoiceRow[]
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Pedidos cobrados sin facturar</h2>
        {orders.length === 0 ? (
          <p className="text-slate-400">No hay pedidos cobrados pendientes de facturar.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <PendingInvoiceForm key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Facturas</h2>
        {invoices.length === 0 ? (
          <p className="text-slate-400">Aún no tienes facturas.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {invoices.map((invoice) => (
              <InvoiceRowItem key={invoice.id} invoice={invoice} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
