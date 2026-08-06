'use client'

import { useMemo, useState } from 'react'
import type { OrderItem, Order } from '@/lib/orders/orders'
import type { Product } from '@/lib/products/products'
import type { OrderType, OrderStatus, PaymentMethod, OrgSettings } from '@/lib/config/service'

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

interface PosClientProps {
  products: Product[]
  orderTypes: OrderType[]
  orderStatuses: OrderStatus[]
  paymentMethods: PaymentMethod[]
  settings: OrgSettings
}

export function PosClient({
  products,
  orderTypes,
  orderStatuses,
  paymentMethods,
  settings,
}: PosClientProps) {
  const [cart, setCart] = useState<Map<number, { product: Product; qty: number }>>(new Map())
  const [orderTypeId, setOrderTypeId] = useState<number>(orderTypes[0]?.id ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Order | null>(null)
  const [charged, setCharged] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<number>(paymentMethods[0]?.id ?? 0)
  const [error, setError] = useState<string | null>(null)

  const items: OrderItem[] = useMemo(
    () =>
      Array.from(cart.values()).map(({ product, qty }) => ({
        product_id: product.id,
        name: product.name,
        qty,
        unit_price: product.price,
      })),
    [cart],
  )

  const totals = useMemo(() => {
    const subtotal = round2(items.reduce((sum, item) => sum + item.unit_price * item.qty, 0))
    const tax = settings.impuestos.activo
      ? round2(subtotal * (settings.impuestos.porcentaje / 100))
      : 0
    return { subtotal, tax, total: round2(subtotal + tax) }
  }, [items, settings])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const next = new Map(prev)
      const current = next.get(product.id)
      next.set(product.id, {
        product,
        qty: (current?.qty ?? 0) + 1,
      })
      return next
    })
  }

  const changeQty = (productId: number, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev)
      if (qty <= 0) {
        next.delete(productId)
      } else {
        const current = next.get(productId)
        if (current) next.set(productId, { ...current, qty })
      }
      return next
    })
  }

  const submitOrder = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type_id: orderTypeId, items }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'No se pudo registrar el pedido')
        return
      }
      setCreated(data)
      setCart(new Map())
    } catch {
      setError('Error de conexión al registrar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  const chargeOrder = async () => {
    if (!created) return
    setError(null)
    try {
      const response = await fetch(`/api/orders/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'No se pudo cobrar el pedido')
        return
      }
      setCharged(true)
    } catch {
      setError('Error de conexión al cobrar el pedido')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Punto de venta</h1>
            <span className="text-sm text-slate-400">
              {orderStatuses[0]?.label ?? 'Estado inicial'}
            </span>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-emerald-500"
              >
                <span className="block text-sm font-medium">{product.name}</span>
                <span className="block text-sm font-mono text-emerald-400">
                  {formatPrice(product.price)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <section aria-label="Ticket" className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Ticket</h2>

          <div className="mb-4">
            <label htmlFor="order-type" className="mb-1 block text-sm text-slate-400">
              Tipo de pedido
            </label>
            <select
              id="order-type"
              aria-label="Tipo de pedido"
              value={orderTypeId}
              onChange={(e) => setOrderTypeId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              {orderTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Selecciona productos del catálogo</p>
          ) : (
            <>
              <ul className="mb-4 divide-y divide-slate-800">
                {items.map((item) => (
                  <li key={item.product_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Quitar ${item.name}`}
                        onClick={() => changeQty(item.product_id, (cart.get(item.product_id)?.qty ?? 1) - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        −
                      </button>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-slate-400">× {item.qty}</span>
                    </div>
                    <span className="font-mono">{formatPrice(item.unit_price * item.qty)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1 border-t border-slate-800 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Subtotal</dt>
                  <dd className="font-mono" data-testid="subtotal">
                    {formatPrice(totals.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">
                    Impuesto {settings.impuestos.activo ? `(${settings.impuestos.porcentaje}%)` : '(0%)'}
                  </dt>
                  <dd className="font-mono" data-testid="tax">
                    {formatPrice(totals.tax)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-lg font-semibold">
                  <dt>Total</dt>
                  <dd className="font-mono" data-testid="total">
                    {formatPrice(totals.total)}
                  </dd>
                </div>
              </dl>

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

              <button
                type="button"
                disabled={submitting}
                onClick={submitOrder}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Registrando…' : 'Registrar pedido'}
              </button>
            </>
          )}
        </section>
      </div>

      {created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-700 bg-slate-900 p-6 text-center">
            <h2 className="mb-2 text-2xl font-bold">Pedido registrado</h2>
            <p className="mb-4 text-sm text-slate-400">
              Folio <span className="font-mono text-white">#{created.id}</span>
            </p>
            <dl className="mb-6 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Subtotal</dt>
                <dd className="font-mono">{formatPrice(created.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Impuesto</dt>
                <dd className="font-mono">{formatPrice(created.tax)}</dd>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <dt>Total</dt>
                <dd className="font-mono">{formatPrice(created.total)}</dd>
              </div>
            </dl>

            {charged ? (
              <p className="mb-4 text-emerald-400">Pedido pagado correctamente.</p>
            ) : (
              <>
                <div className="mb-4 text-left">
                  <label htmlFor="payment-method" className="mb-1 block text-sm text-slate-400">
                    Método de pago
                  </label>
                  <select
                    id="payment-method"
                    aria-label="Método de pago"
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
                <button
                  type="button"
                  onClick={chargeOrder}
                  className="mb-2 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500"
                >
                  Cobrar
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setCreated(null)
                setCharged(false)
                setError(null)
              }}
              className="w-full rounded-xl bg-slate-700 py-3 font-semibold hover:bg-slate-600"
            >
              Nuevo pedido
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
