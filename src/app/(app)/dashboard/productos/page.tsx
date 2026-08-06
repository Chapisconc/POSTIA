import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listProducts } from '@/lib/products/products'
import type { ProductsClient } from '@/lib/products/products'
import type { ConfigClient } from '@/lib/config/service'
import { ProductForm } from './product-form'

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default async function ProductsPage() {
  const client = await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  const products = await listProducts(client as unknown as ProductsClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Productos</h1>

      <ProductForm />

      {products.length === 0 ? (
        <p className="text-slate-400">Aún no tienes productos. Agrega el primero.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between p-4">
              <span>{product.name}</span>
              <span className="font-mono text-emerald-400">
                {formatPrice(product.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
