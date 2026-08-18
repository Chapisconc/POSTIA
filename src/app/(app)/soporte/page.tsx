import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import type { ConfigClient } from '@/lib/config/service'

export default async function SoportePage() {
  const client = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let orgId: string
  try {
    orgId = await requireOrgId(user.id, client as unknown as ConfigClient)
  } catch {
    redirect('/onboarding')
    return null
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Soporte</h1>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">Centro de ayuda</h2>
          <p className="text-slate-400">
            Consulta tutoriales y guías para usar POSTIA. Disponible 24/7.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">Chat en línea</h2>
          <p className="text-slate-400">
            Escríbenos por WhatsApp para soporte en español con personas reales.
          </p>
          <a
            href="https://wa.me/5210000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            Abrir chat de WhatsApp
          </a>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">Comparativa POS</h2>
          <p className="text-slate-400">
            POSTIA incluye POS en sala/mostrador, delivery, KDS, inventario,
            reportes en tiempo real, facturación y soporte en español.
          </p>
        </div>
      </div>
    </div>
  )
}
