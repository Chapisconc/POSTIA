import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { listBranches } from '@/lib/branches/branches'
import type { BranchesClient } from '@/lib/branches/branches'
import type { ConfigClient } from '@/lib/config/service'
import { BranchForm } from './branch-form'

export default async function BranchesPage() {
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

  const branches = await listBranches(client as unknown as BranchesClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Sucursales</h1>

      <BranchForm />

      {branches.length === 0 ? (
        <p className="text-slate-400">Aún no tienes sucursales registradas.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
          {branches.map((branch) => (
            <li key={branch.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{branch.name}</p>
                <p className="text-sm text-slate-400">
                  {[branch.address, branch.phone].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  branch.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {branch.active ? 'Activa' : 'Inactiva'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
