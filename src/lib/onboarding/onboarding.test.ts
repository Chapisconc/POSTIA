import { describe, expect, it, vi } from 'vitest'
import { createOrganization } from './onboarding'

type RpcMock = ReturnType<typeof vi.fn>

function clientWithRpc(rpc: RpcMock) {
  return { rpc } as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  }
}

describe('servicio de onboarding', () => {
  it('llama al RPC create_organization con nombre, slug y display name', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: 'org-123',
      error: null,
    })

    const orgId = await createOrganization(
      clientWithRpc(rpc),
      'Taquería Don José',
      'taqueria-don-jose',
      'José',
    )

    expect(orgId).toBe('org-123')
    expect(rpc).toHaveBeenCalledWith('create_organization', {
      org_name: 'Taquería Don José',
      org_slug: 'taqueria-don-jose',
      owner_display_name: 'José',
    })
  })

  it('usa el nombre como display name cuando no se pasa uno', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'org-123', error: null })

    await createOrganization(clientWithRpc(rpc), 'Pizzería Central', 'pizzeria-central')

    expect(rpc).toHaveBeenCalledWith('create_organization', {
      org_name: 'Pizzería Central',
      org_slug: 'pizzeria-central',
      owner_display_name: null,
    })
  })

  it('lanza error si falta el nombre del negocio', async () => {
    const rpc = vi.fn()

    await expect(
      createOrganization(clientWithRpc(rpc), '', 'taqueria'),
    ).rejects.toThrow('El nombre del negocio es obligatorio')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lanza error si falta el slug', async () => {
    const rpc = vi.fn()

    await expect(
      createOrganization(clientWithRpc(rpc), 'Taquería', ''),
    ).rejects.toThrow('El slug es obligatorio')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lanza el error de la BD si el RPC falla', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('slug duplicado'),
    })

    await expect(
      createOrganization(clientWithRpc(rpc), 'Taquería', 'taqueria'),
    ).rejects.toThrow('slug duplicado')
  })
})
