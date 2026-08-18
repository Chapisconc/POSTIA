import { describe, expect, it } from 'vitest'
import { requireOrgId } from './require-org'
import type { ConfigClient } from '@/lib/config/service'

function clientWithProfile(profile: unknown) {
  return {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: profile, error: null }),
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  } as unknown as ConfigClient
}

describe('requireOrgId', () => {
  it('devuelve el orgId del perfil del usuario', async () => {
    const orgId = await requireOrgId(
      'user-1',
      clientWithProfile({ id: 'user-1', organization_id: 'org-9' }),
    )
    expect(orgId).toBe('org-9')
  })

  it('lanza error si el usuario no tiene organización', async () => {
    await expect(
      requireOrgId('user-1', clientWithProfile({ id: 'user-1', organization_id: null })),
    ).rejects.toThrow('El usuario no tiene negocio')
  })

  it('lanza error si no hay perfil (PGRST116)', async () => {
    const client = {
      from: (table: string) => {
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
      },
    } as unknown as ConfigClient

    await expect(requireOrgId('user-1', client)).rejects.toThrow('El usuario no tiene negocio')
  })
})
