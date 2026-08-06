import { describe, expect, it } from 'vitest'
import { handleConfigRequest } from './config-handler'
import { MODULES } from '@/lib/config/catalog'
import type { ConfigClient } from '@/lib/config/service'

function okClient(): ConfigClient {
  return {
    from: (name: string) => {
      if (name === 'org_modules') {
        return {
          select: () => ({
            eq: () => ({ data: [{ module_key: 'pos' }, { module_key: 'caja' }], error: null }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => ({ data: { settings: {} }, error: null }),
          }),
        }),
      }
    },
  } as unknown as ConfigClient
}

function errClient(): ConfigClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ data: null, error: new Error('db down') }),
      }),
    }),
  } as unknown as ConfigClient
}

describe('handler de configuración (API)', () => {
  it('devuelve 200 con la configuración de la organización', async () => {
    const res = await handleConfigRequest('org-1', okClient())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.orgId).toBe('org-1')
    expect(body.activeModules.map((m: { key: string }) => m.key)).toEqual(['pos', 'caja'])
  })

  it('devuelve 200 con todos los módulos cuando la org no tiene configuración', async () => {
    const client = {
      from: (name: string) => {
        if (name === 'org_modules') {
          return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        }
      },
    } as unknown as ConfigClient

    const res = await handleConfigRequest('org-1', client)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.activeModules).toHaveLength(MODULES.length)
  })

  it('devuelve 400 cuando falta el orgId', async () => {
    const res = await handleConfigRequest('', okClient())
    expect(res.status).toBe(400)
  })

  it('devuelve 500 cuando la BD falla', async () => {
    const res = await handleConfigRequest('org-1', errClient())
    expect(res.status).toBe(500)
  })
})
