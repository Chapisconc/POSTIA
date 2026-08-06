import { describe, expect, it, vi } from 'vitest'
import { buildOrgConfig, getOrgModules, getOrgSettings, resolveConfig } from './service'
import { MODULES } from './catalog'
import type { OrgConfig, OrgSettings } from './service'

type QueryResult = { data: unknown; error: unknown }

type ChainResult = QueryResult & { single?: () => Promise<QueryResult> }

type Handler = () => {
  select: () => {
    eq: () => ChainResult
  }
}

function mockClient(handlers?: Record<string, Handler>) {
  const from = vi.fn()
  const client = { from } as {
    from: (table: string) => {
      select: () => {
        eq: () => ChainResult
      }
    }
  }

  from.mockImplementation((name: string) => {
    if (handlers?.[name]) return handlers[name]()
    return {
      select: () => ({ data: [], error: null }),
    }
  })
  return { client, from }
}

function chainEq(result: ChainResult) {
  return {
    select: () => ({
      eq: () => result,
    }),
  }
}

describe('servicio de configuración por organización', () => {
  it('getOrgModules devuelve solo los módulos activos del catálogo', async () => {
    const { client } = mockClient({
      org_modules: () =>
        chainEq({ data: [{ module_key: 'pos' }, { module_key: 'cocina' }], error: null }),
    })

    const modules = await getOrgModules('org-1', client)
    expect(modules.map((m) => m.key)).toEqual(['pos', 'cocina'])
  })

  it('getOrgModules devuelve todos los módulos si no hay configuración', async () => {
    const { client } = mockClient({
      org_modules: () => chainEq({ data: [], error: null }),
    })

    const modules = await getOrgModules('org-1', client)
    expect(modules).toHaveLength(MODULES.length)
  })

  it('getOrgSettings devuelve defaults cuando no hay settings', async () => {
    const { client } = mockClient({
      org_settings: () =>
        chainEq({
          single: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
    })

    const settings = await getOrgSettings('org-1', client)
    expect(settings).toHaveProperty('moneda', 'MXN')
  })

  it('getOrgSettings sobreescribe los defaults con los del negocio', async () => {
    const { client } = mockClient({
      org_settings: () =>
        chainEq({
          single: vi.fn().mockReturnValue({
            data: { settings: { moneda: 'USD', impuestos: { activo: false } } },
            error: null,
          }),
        }),
    })

    const settings = await getOrgSettings('org-1', client)
    expect(settings.moneda).toBe('USD')
    expect(settings.impuestos).toEqual({ activo: false, porcentaje: 16 })
  })

  it('buildOrgConfig combina módulos y settings en una configuración completa', async () => {
    const { client } = mockClient({
      org_modules: () =>
        chainEq({
          data: [{ module_key: 'pos' }, { module_key: 'productos' }, { module_key: 'caja' }],
          error: null,
        }),
      org_settings: () =>
        chainEq({
          single: vi.fn().mockReturnValue({
            data: { settings: { moneda: 'USD' } },
            error: null,
          }),
        }),
    })

    const config = await buildOrgConfig('org-1', client)
    expect(config.orgId).toBe('org-1')
    expect(config.activeModules.map((m) => m.key)).toEqual(['pos', 'productos', 'caja'])
    expect(config.settings.moneda).toBe('USD')
    expect(config.settings.impuestos).toEqual({ activo: true, porcentaje: 16 })
  })

  it('resolveConfig lanza error si la BD devuelve error', async () => {
    const { client } = mockClient({
      org_modules: () => chainEq({ data: null, error: new Error('db down') }),
      org_settings: () =>
        chainEq({
          single: vi.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        }),
    })

    await expect(resolveConfig('org-1', client)).rejects.toThrow('db down')
  })
})

describe('tipos de configuración', () => {
  it('OrgConfig tiene la estructura esperada', () => {
    const config: OrgConfig = {
      orgId: 'org-1',
      activeModules: MODULES,
      settings: { moneda: 'MXN', impuestos: { activo: true, porcentaje: 16 } },
    }
    expect(config.activeModules.length).toBeGreaterThan(0)
  })

  it('OrgSettings define defaults de moneda e impuestos', () => {
    const s: OrgSettings = { moneda: 'MXN', impuestos: { activo: true, porcentaje: 16 } }
    expect(s.moneda).toBe('MXN')
    expect(s.impuestos.porcentaje).toBe(16)
  })
})
