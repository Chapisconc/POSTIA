import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/api/require-org'
import { getSalesReport } from '@/lib/reports/reports'
import type { OrdersClient } from '@/lib/orders/orders'
import type { ConfigClient } from '@/lib/config/service'

function formatPrice(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default async function ReportsPage() {
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

  const report = await getSalesReport(client as unknown as OrdersClient, orgId)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Reporte de ventas</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pedidos pagados</p>
          <p className="mt-1 text-2xl font-bold" data-testid="report-count">
            {report.count}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Subtotal</p>
          <p className="mt-1 text-2xl font-bold" data-testid="report-subtotal">
            {formatPrice(report.subtotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Impuesto</p>
          <p className="mt-1 text-2xl font-bold" data-testid="report-tax">
            {formatPrice(report.tax)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-700 bg-slate-900 p-5">
          <p className="text-sm text-emerald-400">Total de ventas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400" data-testid="report-total">
            {formatPrice(report.total)}
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Por método de pago
      </h2>
      {report.byPaymentMethod.length === 0 ? (
        <p className="text-slate-400">Aún no hay ventas registradas.</p>
      ) : (
        <ul className="space-y-3">
          {report.byPaymentMethod.map((method) => (
            <li
              key={method.payment_method_id}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <div>
                <p className="font-semibold">{method.label}</p>
                <p className="text-sm text-slate-400">{method.count} pedidos</p>
              </div>
              <span className="font-mono text-lg text-emerald-400">
                {formatPrice(method.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
