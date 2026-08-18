import { describe, expect, it, vi } from 'vitest'
import { handleOnboardingRequest } from './onboarding-handler'
import type { RpcClient } from '@/lib/onboarding/onboarding'

function rpcClient(result: { data?: unknown; error?: unknown }) {
  const client = { rpc: vi.fn().mockResolvedValue(result) } as unknown as RpcClient & {
    rpc: ReturnType<typeof vi.fn>
  }
  return client
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('handler de onboarding (API)', () => {
  it('devuelve 201 con el orgId al crear el negocio', async () => {
    const client = rpcClient({ data: 'org-123' })
    const res = await handleOnboardingRequest(
      makeRequest({ nombre: 'Taquería Don José', slug: 'taqueria-don-jose', ownerName: 'José' }),
      client,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ orgId: 'org-123' })
    expect(client.rpc).toHaveBeenCalledWith('create_organization', {
      org_name: 'Taquería Don José',
      org_slug: 'taqueria-don-jose',
      owner_display_name: 'José',
    })
  })

  it('devuelve 400 si falta el nombre', async () => {
    const client = rpcClient({ data: 'org-123' })
    const res = await handleOnboardingRequest(makeRequest({ slug: 'taqueria' }), client)

    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta el slug', async () => {
    const client = rpcClient({ data: 'org-123' })
    const res = await handleOnboardingRequest(makeRequest({ nombre: 'Taquería' }), client)

    expect(res.status).toBe(400)
  })

  it('devuelve 400 si el body no es JSON válido', async () => {
    const client = rpcClient({ data: 'org-123' })
    const res = await handleOnboardingRequest(new Request('http://localhost/api/onboarding'), client)

    expect(res.status).toBe(400)
  })

  it('devuelve 500 si la BD falla', async () => {
    const client = rpcClient({ error: new Error('slug duplicado') })
    const res = await handleOnboardingRequest(
      makeRequest({ nombre: 'Taquería', slug: 'taqueria' }),
      client,
    )

    expect(res.status).toBe(500)
  })
})
