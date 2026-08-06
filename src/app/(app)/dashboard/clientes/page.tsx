import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listCustomers } from '@/lib/customers/customers'
import type { CustomersClient } from '@/lib/customers/customers'
import type { ConfigClient } from '@/lib/config/service'
import { CustomerForm } from './customer-form'

export default async function CustomersPage() {
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

  const customers = await listCustomers(client as unknown as CustomersClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Clientes</h1>

      <CustomerForm />

      {customers.length === 0 ? (
        <p className="text-slate-400">Aún no tienes clientes registrados.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
          {customers.map((customer) => (
            <li key={customer.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-slate-400">
                  {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
