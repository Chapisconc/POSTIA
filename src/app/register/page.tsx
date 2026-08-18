'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/app/auth-shell'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Comienza a operar tu restaurante">
      <form onSubmit={handleSubmit}>
        <label className="mb-1 block text-sm text-slate-300" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none transition focus:border-emerald-500"
        />

        <label className="mb-1 block text-sm text-slate-300" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none transition focus:border-emerald-500"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white transition hover:bg-emerald-500"
        >
          Registrarse
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-emerald-400 hover:underline">
            Inicia sesión
          </a>
        </p>
      </form>
    </AuthShell>
  )
}
