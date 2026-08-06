'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onNombreChange(value: string) {
    setNombre(value)
    if (!slug) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu sesión expiró. Inicia sesión de nuevo.')
      setLoading(false)
      router.push('/login')
      return
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        slug,
        ownerName: user.email?.split('@')[0] ?? null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear el negocio')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-white">Crea tu negocio</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Cuéntanos el nombre de tu restaurante para comenzar.
        </p>

        <label className="mb-1 block text-sm text-slate-300" htmlFor="nombre">
          Nombre del negocio
        </label>
        <input
          id="nombre"
          required
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />

        <label className="mb-1 block text-sm text-slate-300" htmlFor="slug">
          Slug
        </label>
        <input
          id="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear negocio'}
        </button>
      </form>
    </main>
  )
}
