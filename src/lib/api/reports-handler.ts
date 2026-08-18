import { getSalesReport } from '@/lib/reports/reports'
import type { ConfigClient } from '@/lib/config/service'

export async function handleSalesReportRequest(orgId: string, client: ConfigClient) {
  try {
    const report = await getSalesReport(client as never, orgId)
    return Response.json(report, { status: 200 })
  } catch (error) {
    console.error('reports-handler:', error)
    return Response.json({ error: 'No se pudo generar el reporte' }, { status: 500 })
  }
}
