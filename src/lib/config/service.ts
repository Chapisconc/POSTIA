import { MODULES } from './catalog'
import type { Module } from './catalog'

export interface OrgSettings {
  moneda: string
  impuestos: {
    activo: boolean
    porcentaje: number
  }
}

export interface OrgConfig {
  orgId: string
  activeModules: Module[]
  settings: OrgSettings
}

export const DEFAULT_SETTINGS: OrgSettings = {
  moneda: 'MXN',
  impuestos: { activo: true, porcentaje: 16 },
}

type QueryResult = { data: unknown; error: unknown }

type SelectChain = QueryResult & {
  single: () => Promise<QueryResult>
}

type QueryBuilder = {
  select: (fields: string) => {
    eq: (column: string, value: string) => SelectChain
  }
}

type SupabaseClient = {
  from: (table: string) => QueryBuilder
}

export async function getOrgModules(orgId: string, client: SupabaseClient): Promise<Module[]> {
  const { data, error } = await client
    .from('org_modules')
    .select('module_key')
    .eq('organization_id', orgId)

  if (error) throw error

  const rows = (data ?? []) as { module_key: string }[]
  if (rows.length === 0) return MODULES

  const keys = rows.map((row) => row.module_key)
  return MODULES.filter((m) => keys.includes(m.key))
}

export async function getOrgSettings(orgId: string, client: SupabaseClient): Promise<OrgSettings> {
  const { data, error } = await client
    .from('org_settings')
    .select('settings')
    .eq('organization_id', orgId)
    .single()

  if (error) throw error

  const stored = (data as { settings?: Partial<OrgSettings> } | null)?.settings
  if (!stored) return DEFAULT_SETTINGS

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    impuestos: {
      ...DEFAULT_SETTINGS.impuestos,
      ...(stored.impuestos ?? {}),
    },
  }
}

export async function buildOrgConfig(orgId: string, client: SupabaseClient): Promise<OrgConfig> {
  const [activeModules, settings] = await Promise.all([
    getOrgModules(orgId, client),
    getOrgSettings(orgId, client),
  ])

  return { orgId, activeModules, settings }
}

export async function resolveConfig(orgId: string, client: SupabaseClient): Promise<OrgConfig> {
  return buildOrgConfig(orgId, client)
}
