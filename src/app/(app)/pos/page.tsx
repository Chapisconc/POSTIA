import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listProducts } from '@/lib/products/products'
import {
  getOrderTypes,
  getPaymentMethods,
  getOrgSettings,
} from '@/lib/config/service'
import type { ProductsClient } from '@/lib/products/products'
import type { ConfigClient } from '@/lib/config/service'
import { PosClient } from './pos-client'

export default async function PosPage() {
  const client = await createClient()

  const user = await getCurrentUser()

  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  const [products, orderTypes, paymentMethods, settings] = await Promise.all([
    listProducts(client as unknown as ProductsClient, orgId),
    getOrderTypes(orgId, client as unknown as ConfigClient),
    getPaymentMethods(orgId, client as unknown as ConfigClient),
    getOrgSettings(orgId, client as unknown as ConfigClient),
  ])

  return (
    <PosClient
      products={products}
      orderTypes={orderTypes}
      paymentMethods={paymentMethods}
      settings={settings}
    />
  )
}
