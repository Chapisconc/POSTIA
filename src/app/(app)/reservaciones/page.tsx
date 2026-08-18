import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listReservations } from '@/lib/reservations/reservations'
import type { ReservationsClient } from '@/lib/reservations/reservations'
import type { ConfigClient } from '@/lib/config/service'
import { ReservationView } from './reservation-view'

export default async function ReservationsPage() {
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

  const reservations = await listReservations(client as unknown as ReservationsClient, orgId)

  return <ReservationView reservations={reservations} />
}
