import { describe, expect, it } from 'vitest'
import { getProfile, getOrganization } from './org'
import type { ConfigClient } from '@/lib/config/service'

function clientWith(handler: (table: string) => unknown) {
  return { from: (table: string) => handler(table) } as unknown as ConfigClient
}

describe('helpers de organización', () => {
  it('getProfile devuelve el perfil del usuario', async () => {
    const client = clientWith((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'u1', organization_id: 'org-1', role: 'owner', display_name: 'José' },
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    })

    const profile = await getProfile(client, 'u1')
    expect(profile?.organization_id).toBe('org-1')
    expect(profile?.role).toBe('owner')
  })

  it('getProfile devuelve null si el usuario no tiene perfil (PGRST116)', async () => {
    const client = clientWith((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    })

    expect(await getProfile(client, 'u1')).toBeNull()
  })

  it('getOrganization devuelve el nombre de la organización', async () => {
    const client = clientWith((table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'org-1', name: 'Taquería Don José' }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    })

    const org = await getOrganization(client, 'org-1')
    expect(org?.name).toBe('Taquería Don José')
  })

  it('getOrganization devuelve null si la org no existe (PGRST116)', async () => {
    const client = clientWith((table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    })

    expect(await getOrganization(client, 'org-x')).toBeNull()
  })
})
