import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getProfile, getOrganization } from '@/lib/org/org'
import { resolveConfig } from '@/lib/config/service'
import type { ConfigClient } from '@/lib/config/service'
import { AppShell, type ShellModule } from './app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const client = await createClient()

  const user = await getCurrentUser()

  if (!user) redirect('/login')

  const configClient = client as unknown as ConfigClient
  const profile = await getProfile(configClient, user.id)

  if (!profile?.organization_id) redirect('/onboarding')

  const org = await getOrganization(configClient, profile.organization_id)

  const config = await resolveConfig(profile.organization_id, configClient)

  const modules: ShellModule[] = config.activeModules.map((mod) => ({
    key: mod.key,
    label: mod.label,
  }))

  return (
    <AppShell modules={modules} orgName={org?.name ?? 'Mi negocio'}>
      {children}
    </AppShell>
  )
}
