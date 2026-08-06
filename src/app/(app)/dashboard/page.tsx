import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { getProfile, getOrganization } from '@/lib/org/org'
import { resolveConfig } from '@/lib/config/service'
import { getSalesReport } from '@/lib/reports/reports'
import { listOrders } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'
import type { OrdersClient } from '@/lib/orders/orders'

const MODULE_ROUTES: Record<string, string> = {
  pos: '/pos',
  productos: '/dashboard/productos',
  caja: '/caja',
  reportes: '/reportes',
  inventario: '/inventario',
  cocina: '/cocina',
  delivery: '/delivery',
  reservaciones: '/reservaciones',
  facturacion: '/facturacion',
  clientes: '/dashboard/clientes',
  promociones: '/promociones',
  puntos: '/puntos',
  sucursales: '/sucursales',
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default async function DashboardPage() {
  const client = await createClient()

  const user = await getCurrentUser()

  if (!user) redirect('/login')

  const configClient = client as unknown as ConfigClient

  const profile = await getProfile(configClient, user.id)

  if (!profile?.organization_id) redirect('/onboarding')

  const [org, config, report, orders] = await Promise.all([
    getOrganization(configClient, profile.organization_id),
    resolveConfig(profile.organization_id, configClient),
    getSalesReport(client as unknown as OrdersClient, profile.organization_id),
    listOrders(client as unknown as OrdersClient, profile.organization_id),
  ])

  const pendingOrders = orders.filter((order) => order.status_id && order.status_id !== null).length

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{org?.name ?? 'Mi negocio'}</h1>
        <p className="text-slate-400">
          Bienvenido{profile.display_name ? `, ${profile.display_name}` : ''}. Resumen de tu negocio.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-700/60 bg-gradient-to-br from-slate-900 to-slate-900 p-5">
          <p className="text-sm text-slate-400">Ventas totales</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400" data-testid="dashboard-total">
            {formatPrice(report.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pedidos pagados</p>
          <p className="mt-1 text-2xl font-bold">{report.count}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pedidos registrados</p>
          <p className="mt-1 text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pedidos en curso</p>
          <p className="mt-1 text-2xl font-bold">{pendingOrders}</p>
        </div>
      </section>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Módulos activos
        </h2>
        <Link href="/pos" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
          Nuevo pedido
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {config.activeModules.map((mod) => {
          const href = MODULE_ROUTES[mod.key]
          const card = (
            <>
              <h3 className="mb-1 font-semibold">{mod.label}</h3>
              <p className="text-sm text-slate-400">{mod.description}</p>
            </>
          )
          return href ? (
            <Link
              key={mod.key}
              href={href}
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {card}
              <span className="mt-3 block text-sm font-medium text-emerald-400 opacity-0 transition group-hover:opacity-100">
                Abrir →
              </span>
            </Link>
          ) : (
            <div key={mod.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
