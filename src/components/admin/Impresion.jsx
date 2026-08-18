import React, { useState } from 'react'
import { Printer, ChefHat, FileText } from 'lucide-react'
import {
  Card, Button, Field, Select, Toggle, PageHeader, StatCard,
} from '../ui'
import { fmtMoney } from '../../lib/format'
import { toastOk } from '../../lib/notify'
import { updateSettings, getSettings, nowISO } from '../../lib/storage'
import { printTicket } from '../../lib/ticket'

export default function Impresion({ state, refresh }) {
  const settings = state.settings || getSettings()
  const printer = settings.printer || {}
  const [local, setLocal] = useState({
    ticketEnabled: printer.ticketEnabled !== false,
    width: printer.width === '80mm' ? '80mm' : '58mm',
    ticketCopies: Math.min(3, Math.max(1, Number(printer.ticketCopies) || 1)),
    kitchenEnabled: printer.kitchenEnabled !== false,
    kitchenPrinter: printer.kitchenPrinter || 'Principal',
    autoKitchen: !!printer.autoKitchen,
  })

  const patch = (partial) => {
    const next = { ...local, ...partial }
    setLocal(next)
    updateSettings({ printer: next })
    refresh()
  }

  const testTicket = () => {
    const order = {
      folio: 9999,
      serviceType: 'mostrador',
      createdAt: nowISO(),
      items: [
        { qty: 1, name: 'Alitas 10', lineTotal: 180, modifiers: [{ name: 'BBQ', price: 0 }], note: '' },
        { qty: 2, name: 'Refresco', lineTotal: 70, modifiers: [], note: '' },
      ],
      subtotal: 250,
      discount: 0,
      deliveryCost: 0,
      tip: 0,
      total: 250,
      payment: 'efectivo',
      paid: true,
      cashReceived: 300,
      cashChange: 50,
      client: { name: 'Cliente prueba' },
    }
    const s = { ...getSettings(), printer: { ...getSettings().printer, ...local } }
    const ok = printTicket(order, s, 'ticket')
    if (ok) toastOk('Ticket de prueba enviado')
    else toastOk('Enviado')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Impresión"
        subtitle="Tickets de caja y comandas de cocina"
        actions={<Button variant="outline" onClick={testTicket}><span className="inline-flex items-center gap-1.5"><Printer size={16} /> Ticket de prueba</span></Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={FileText} label="Ticket" value={local.ticketEnabled ? 'ON' : 'OFF'} sub={local.width} tone="brand" />
        <StatCard icon={ChefHat} label="Cocina" value={local.kitchenEnabled ? 'ON' : 'OFF'} sub={local.kitchenPrinter} tone="gold" />
        <StatCard icon={Printer} label="Copias" value={String(local.ticketCopies)} sub="por ticket" tone="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-night flex items-center gap-2"><FileText size={18} className="text-brand" /> Ticket de venta</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-night">Imprimir ticket al cobrar</span>
            <Toggle checked={local.ticketEnabled} onChange={(v) => patch({ ticketEnabled: v })} />
          </div>
          <Field label="Ancho de papel">
            <Select value={local.width} onChange={(e) => patch({ width: e.target.value })} disabled={!local.ticketEnabled}>
              <option value="58mm">58 mm</option>
              <option value="80mm">80 mm</option>
            </Select>
          </Field>
          <Field label="Copias" hint="Entre 1 y 3">
            <Select value={String(local.ticketCopies)} onChange={(e) => patch({ ticketCopies: Number(e.target.value) })} disabled={!local.ticketEnabled}>
              <option value="1">1 copia</option>
              <option value="2">2 copias</option>
              <option value="3">3 copias</option>
            </Select>
          </Field>
          <div className="rounded-xl border border-line bg-page p-3 text-xs text-muted font-mono">
            <div className="text-center font-bold text-night text-sm mb-1">POSTIA</div>
            <div className="text-center">Pedido #9999</div>
            <div className="flex justify-between mt-2"><span>1× Alitas 10</span><span>{fmtMoney(180)}</span></div>
            <div className="flex justify-between"><span>2× Refresco</span><span>{fmtMoney(70)}</span></div>
            <div className="flex justify-between font-bold text-night mt-2 border-t border-line pt-1"><span>TOTAL</span><span>{fmtMoney(250)}</span></div>
            <div className="text-center mt-2">Ancho: {local.width}</div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-night flex items-center gap-2"><ChefHat size={18} className="text-gold" /> Comanda de cocina</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-night">Imprimir comanda</span>
            <Toggle checked={local.kitchenEnabled} onChange={(v) => patch({ kitchenEnabled: v })} />
          </div>
          <Field label="Impresora de cocina">
            <Select value={local.kitchenPrinter} onChange={(e) => patch({ kitchenPrinter: e.target.value })} disabled={!local.kitchenEnabled}>
              <option value="Principal">Principal</option>
              <option value="Cocina">Cocina</option>
              <option value="Inalámbrica">Inalámbrica</option>
            </Select>
          </Field>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-night">Auto comanda</div>
              <div className="text-xs text-muted">Imprimir al enviar a cocina</div>
            </div>
            <Toggle checked={local.autoKitchen} onChange={(v) => patch({ autoKitchen: v })} />
          </div>
          <Button className="w-full" variant="outline" onClick={testTicket}>
            <span className="inline-flex items-center gap-1.5"><Printer size={16} /> Enviar ticket de prueba</span>
          </Button>
        </Card>
      </div>
    </div>
  )
}
