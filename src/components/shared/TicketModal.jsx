import React, { useState, useMemo } from 'react'
import { Button, Modal, Tabs } from '../ui'
import { ticketHTML, printTicket } from '../../lib/ticket'
import { readState } from '../../lib/storage'
import { Printer } from 'lucide-react'

// Modal de previsualización e impresión de ticket/comanda.
export default function TicketModal({ order, open, onClose }) {
  const [kind, setKind] = useState('ticket')
  if (!order) return null
  const live = useMemo(() => (readState().orders || []).find((o) => o.id === order.id) || order, [order.id])
  const html = ticketHTML(live, undefined, kind)
  return (
    <Modal open={open} onClose={onClose} title={`Imprimir #${live.folio || live.id}`} maxW="max-w-md">
      <div className="space-y-3">
        <Tabs
          items={[
            { id: 'ticket', label: 'Ticket' },
            { id: 'kitchen', label: 'Comanda' },
          ]}
          value={kind}
          onChange={setKind}
          activeClassName="bg-brand text-white font-medium rounded-lg px-4 py-2"
          inactiveClassName="bg-transparent text-muted hover:text-night px-4 py-2"
          className="inline-flex items-center gap-1 rounded-xl border border-line bg-page p-1"
        />
        <div className="bg-card border border-line rounded-xl p-8 overflow-auto max-h-[640px]">
          <iframe title="ticket" srcDoc={html} className="w-full h-[520px] border-0 bg-card" style={{ minWidth: 360 }} />
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cerrar
          </Button>
          <Button
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark shadow-sm inline-flex items-center gap-2"
            onClick={() => {
              const target = (readState().orders || []).find((o) => o.id === order.id) || order
              printTicket(target, undefined, kind)
            }}
          >
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
