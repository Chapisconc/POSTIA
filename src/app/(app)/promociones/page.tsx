import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listPromotions } from '@/lib/promotions/promotions'
import type { PromotionsClient } from '@/lib/promotions/promotions'
import type { ConfigClient } from '@/lib/config/service'
import { PromotionForm, PromotionList } from './promotion-form'

export default async function PromocionesPage() {
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

  const promotions = await listPromotions(client as unknown as PromotionsClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Promociones</h1>

      <PromotionForm />

      <PromotionList promotions={promotions} />
    </div>
  )
}
