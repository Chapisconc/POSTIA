import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listInventory, listMovements } from '@/lib/inventory/inventory'
import type { InventoryClient } from '@/lib/inventory/inventory'
import type { ConfigClient } from '@/lib/config/service'
import { InventoryView } from './inventory-view'

export default async function InventoryPage() {
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

  const [products, movements] = await Promise.all([
    listInventory(client as unknown as InventoryClient, orgId),
    listMovements(client as unknown as InventoryClient, orgId),
  ])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Inventario</h1>

      <InventoryView products={products} movements={movements} />
    </div>
  )
}
