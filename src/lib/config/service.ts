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

export type QueryResult = { data: unknown; error: unknown }

export type SelectChain = QueryResult & {
  single: () => Promise<QueryResult>
}

export type QueryBuilder = {
  select: (fields: string) => {
    eq: (column: string, value: string) => SelectChain
  }
}

export type ConfigClient = {
  from: (table: string) => QueryBuilder
}

export async function getOrgModules(orgId: string, client: ConfigClient): Promise<Module[]> {
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

export async function getOrgSettings(orgId: string, client: ConfigClient): Promise<OrgSettings> {
  const { data, error } = await client
    .from('org_settings')
    .select('settings')
    .eq('organization_id', orgId)
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') return DEFAULT_SETTINGS
    throw error
  }

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

export interface OrderStatus {
  id: number
  key: string
  label: string
  color: string
  position: number
  notify_kitchen: boolean
  permite_cobro: boolean
}

export interface OrderType {
  id: number
  key: string
  label: string
  position: number
  requires_address: boolean
  requires_phone: boolean
}

export interface PaymentMethod {
  id: number
  key: string
  label: string
  position: number
}

type CatalogClient = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string) => Promise<QueryResult>
      }
    }
  }
}

async function listCatalog(
  client: ConfigClient,
  table: string,
  orgId: string,
): Promise<Record<string, unknown>[]> {
  const result = await (client as unknown as CatalogClient)
    .from(table)
    .select('*')
    .eq('organization_id', orgId)
    .order('position')

  if (result.error) throw result.error
  return (result.data ?? []) as Record<string, unknown>[]
}

function mapStatus(row: Record<string, unknown>): OrderStatus {
  return {
    id: row.id as number,
    key: row.key as string,
    label: row.label as string,
    color: row.color as string,
    position: row.position as number,
    notify_kitchen: Boolean(row.notify_kitchen),
    permite_cobro: Boolean(row.permite_cobro),
  }
}

export async function getOrderStatuses(
  orgId: string,
  client: ConfigClient,
): Promise<OrderStatus[]> {
  const rows = await listCatalog(client, 'order_statuses', orgId)
  return rows.map(mapStatus)
}

export async function getOrderTypes(orgId: string, client: ConfigClient): Promise<OrderType[]> {
  const rows = await listCatalog(client, 'order_types', orgId)
  return rows.map((row) => ({
    id: row.id as number,
    key: row.key as string,
    label: row.label as string,
    position: row.position as number,
    requires_address: Boolean(row.requires_address),
    requires_phone: Boolean(row.requires_phone),
  }))
}

export async function getPaymentMethods(
  orgId: string,
  client: ConfigClient,
): Promise<PaymentMethod[]> {
  const rows = await listCatalog(client, 'payment_methods', orgId)
  return rows.map((row) => ({
    id: row.id as number,
    key: row.key as string,
    label: row.label as string,
    position: row.position as number,
  }))
}

export async function getInitialStatusId(
  orgId: string,
  client: ConfigClient,
): Promise<number | null> {
  const statuses = await getOrderStatuses(orgId, client)
  const initial = statuses.find((s) => s.position === 0) ?? statuses[0]
  return initial?.id ?? null
}

export async function buildOrgConfig(orgId: string, client: ConfigClient): Promise<OrgConfig> {
  const [activeModules, settings] = await Promise.all([
    getOrgModules(orgId, client),
    getOrgSettings(orgId, client),
  ])

  return { orgId, activeModules, settings }
}

export async function resolveConfig(orgId: string, client: ConfigClient): Promise<OrgConfig> {
  return buildOrgConfig(orgId, client)
}
