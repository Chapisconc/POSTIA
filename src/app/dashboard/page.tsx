import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getOrganization } from '@/lib/org/org'
import { resolveConfig } from '@/lib/config/service'
import type { ConfigClient } from '@/lib/config/service'

export default async function DashboardPage() {
  const client = await createClient()

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) redirect('/login')

  const configClient = client as unknown as ConfigClient

  const profile = await getProfile(configClient, user.id)

  if (!profile?.organization_id) redirect('/onboarding')

  const [org, config] = await Promise.all([
    getOrganization(configClient, profile.organization_id),
    resolveConfig(profile.organization_id, configClient),
  ])

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{org?.name ?? 'Mi negocio'}</h1>
            <p className="text-slate-400">
              Bienvenido{profile.display_name ? `, ${profile.display_name}` : ''}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Cerrar sesión
            </button>
          </form>
        </header>

        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Módulos activos
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {config.activeModules.map((module) => (
            <div
              key={module.key}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <h3 className="mb-1 font-semibold">{module.label}</h3>
              <p className="text-sm text-slate-400">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
