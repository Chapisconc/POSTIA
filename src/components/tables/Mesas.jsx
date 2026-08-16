import React, { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, CheckCircle2, Armchair, Receipt, CreditCard,
  Move, Merge, Banknote, Printer, Eye, CirclePlus, ArrowRightLeft, QrCode,
} from 'lucide-react'
import {
  Card, StatCard, Button, Badge, Modal, ConfirmDialog, Field, Input, Select, Tabs, EmptyState,
} from '../ui'
import PaymentDialog from '../shared/PaymentDialog'
import TicketModal from '../shared/TicketModal'
import OrderDrawer from '../orders/OrderDrawer'
import QRTableModal from '../shared/QRTableModal'
import { OrderItemsList, OrderStatusBadge, ServiceBadge } from '../shared/StatusBadge'
import { fmtMoney, fmtTime, fmtAgo } from '../../lib/format'
import { toast, toastOk, toastErr, toastWarn } from '../../lib/notify'
import {
  addSalon, updateSalon, deleteSalon, addTable, updateTable, deleteTable,
  freeTable, moveTable, mergeTables, payOrder, setOrderStatus,
} from '../../lib/storage'

const CARD_STYLE = {
  libre: 'border-success bg-success-soft text-success-dark',
  ocupada: 'border-gold bg-gold text-white',
  cuenta: 'border-warning bg-warning-soft text-warning-dark',
  pagada: 'border-night bg-night text-white',
}
const ESTADO_MAP = { ocupada: 'preparando', cuenta: 'porcobrar', pagada: 'finalizado' }
const TONE_MAP = { libre: 'brand', ocupada: 'amber', cuenta: 'gold', pagada: 'night' }

function MesaCard({ table, order, onOpen, onEdit, onDelete }) {
  const st = table.status
  const num = table.name.replace(/\D/g, '') || table.name
  return (
    <div onClick={onOpen}
      className={`relative rounded-2xl border-2 text-center py-3 px-2 w-full cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg ${CARD_STYLE[st] || CARD_STYLE.libre}`}>
      <span onClick={(e) => { e.stopPropagation(); onEdit() }} title="Editar mesa"
        className="absolute top-1.5 left-1.5 grid place-items-center w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer"><Pencil size={11} /></span>
      <span onClick={(e) => { e.stopPropagation(); onDelete() }} title="Eliminar mesa"
        className="absolute top-1.5 right-1.5 grid place-items-center w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer"><Trash2 size={11} /></span>
      <div className="font-extrabold text-2xl leading-tight">{num}</div>
      {st === 'libre' && <div className="text-[10px] font-black mt-1 tracking-[0.2em]">LIBRE</div>}
      {st !== 'libre' && order && (
        <>
          <div className="font-mono text-lg font-bold leading-none mt-1">{fmtMoney(order.total)}</div>
          {order.client?.name && <div className="text-[10px] leading-tight mt-0.5 truncate">{order.client.name}</div>}
        </>
      )}
      {st !== 'libre' && !order && <div className="text-[10px] font-semibold mt-1 opacity-80">Sin pedido</div>}
    </div>
  )
}

export default function Mesas({ state, refresh, onNav, params, user }) {
  const [salonId, setSalonId] = useState(() => params?.salonId || null)
  const [selected, setSelected] = useState(null)
  const [drawerOrder, setDrawerOrder] = useState(null)
  const [payObj, setPayObj] = useState(null)
  const [ticketOrder, setTicketOrder] = useState(null)
  const [qrTable, setQrTable] = useState(null)
  const [selAction, setSelAction] = useState(null)
  const [freeConfirm, setFreeConfirm] = useState(false)
  const [form, setForm] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)

  const activeSalon = state.salons.find((s) => s.id === salonId) || state.salons[0] || null

  useEffect(() => {
    if (params?.tableId) {
      const t = state.tables.find((x) => x.id === params.tableId)
      if (t) setSelected(t)
    }
  }, [params?.tableId])

  const counts = {
    libre: state.tables.filter((t) => t.status === 'libre').length,
    ocupada: state.tables.filter((t) => t.status === 'ocupada').length,
    cuenta: state.tables.filter((t) => t.status === 'cuenta').length,
    pagada: state.tables.filter((t) => t.status === 'pagada').length,
  }

  const tables = activeSalon ? state.tables.filter((t) => t.salonId === activeSalon.id) : []
  const selectedTable = selected ? state.tables.find((t) => t.id === selected.id) : null

  // Buscar pedido vinculado: por orderId de la mesa o por tableId en orders
  const selOrder = selectedTable
    ? (selectedTable.orderId
      ? state.orders.find((o) => o.id === selectedTable.orderId)
      : state.orders.find((o) => o.tableId === selectedTable.id && !['finalizado', 'cancelado'].includes(o.status)))
    : null

  // Abrir drawer cuando hay pedido
  const openDrawer = () => {
    if (selOrder) setDrawerOrder(selOrder)
  }

  const salonOf = (id) => state.salons.find((s) => s.id === id)?.name || ''

  const openForm = (type, mode, data = {}) => setForm({ type, mode, data })

  const submitForm = () => {
    if (!form) return
    try {
      if (form.type === 'salon') {
        const name = form.data.name.trim()
        if (!name) return toastWarn('Escribe el nombre del salón')
        if (form.mode === 'add') { const s = addSalon(name); setSalonId(s.salons[s.salons.length - 1].id); toastOk('Salón creado') }
        else { updateSalon(form.data.id, { name }); toastOk('Salón actualizado') }
      } else {
        const name = form.data.name.trim()
        if (!name) return toastWarn('Escribe el nombre de la mesa')
        const payload = { name, capacity: Number(form.data.capacity) || 4, salonId: form.data.salonId }
        if (form.mode === 'add') { addTable(payload); toastOk('Mesa agregada') }
        else { updateTable(form.data.id, payload); toastOk('Mesa actualizada') }
      }
    } catch (e) { console.error('Error:', e); toastErr('Error') }
    setForm(null)
    refresh()
  }

  const doDelete = () => {
    try {
      if (delConfirm.type === 'salon') {
        deleteSalon(delConfirm.id)
        toastOk(`Salón "${delConfirm.name}" eliminado`)
        if (activeSalon?.id === delConfirm.id) setSalonId(state.salons.find((s) => s.id !== delConfirm.id)?.id || null)
      } else {
        deleteTable(delConfirm.id)
        toastOk('Mesa eliminada')
        if (selected?.id === delConfirm.id) setSelected(null)
      }
    } catch (e) { console.error('Error:', e); toastErr('Error') }
    setDelConfirm(null)
    refresh()
  }

  const changeStatus = (es) => {
    if (!selOrder) return
    try {
      setOrderStatus(selOrder.id, ESTADO_MAP[es], { user })
      updateTable(selectedTable.id, { status: es })
      refresh()
      toastOk(`Estado de mesa cambiado a ${es}`)
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const handlePick = (t) => {
    if (!selOrder) return
    try {
      if (selAction === 'move') { moveTable(selOrder.id, t.id); toastOk(`Pedido movido a ${t.name}`) }
      else { mergeTables(selectedTable.id, t.id); toastOk(`Cuenta de ${t.name} unida`) }
    } catch (e) { console.error('Error:', e); toastErr('Error') }
    setSelAction(null)
    setSelected(null)
    refresh()
  }

  const moveOptions = state.tables.filter((t) => t.id !== selectedTable?.id && t.status === 'libre')
  const mergeOptions = state.tables.filter((t) => {
    if (t.id === selectedTable?.id || !t.orderId) return false
    const o = state.orders.find((x) => x.id === t.orderId)
    return o && !o.paid && o.status !== 'cancelado'
  })

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?menu=1`
    : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-night">Mesas</h2>
          <p className="text-sm text-muted">Salones y ocupación en tiempo real</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openForm('salon', 'add', { name: '' })}><Plus size={15} className="mr-1" /> Salón</Button>
          <Button variant="primary" onClick={() => openForm('table', 'add', { name: '', capacity: 4, salonId: activeSalon?.id })}><Plus size={15} className="mr-1" /> Mesa</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Libres" value={counts.libre} tone="brand" />
        <StatCard icon={Armchair} label="Ocupadas" value={counts.ocupada} tone="amber" />
        <StatCard icon={Receipt} label="En cuenta" value={counts.cuenta} tone="gold" />
        <StatCard icon={CreditCard} label="Pagadas" value={counts.pagada} tone="night" />
      </div>

      {state.salons.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🪑" title="Sin salones" message="Crea tu primer salón para comenzar a dar de alta mesas."
            action={<Button onClick={() => openForm('salon', 'add', { name: '' })}><Plus size={15} className="mr-1" /> Crear salón</Button>} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0">
              <Tabs items={state.salons.map((s) => ({ id: s.id, label: s.name }))} value={activeSalon.id} onChange={setSalonId} />
            </div>
            <span className="flex gap-1 shrink-0">
              <span title="Editar salón" onClick={() => openForm('salon', 'edit', { id: activeSalon.id, name: activeSalon.name })}
                className="grid place-items-center w-9 h-9 rounded-xl border border-line bg-card text-night hover:bg-page cursor-pointer"><Pencil size={15} /></span>
              <span title="Eliminar salón" onClick={() => setDelConfirm({ type: 'salon', id: activeSalon.id, name: activeSalon.name })}
                className="grid place-items-center w-9 h-9 rounded-xl border border-line bg-card text-danger hover:bg-danger-soft cursor-pointer"><Trash2 size={15} /></span>
            </span>
          </div>

          {tables.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon="🪑" title={`Sin mesas en ${activeSalon.name}`}
                message="Agrega mesas a este salón."
                action={<Button onClick={() => openForm('table', 'add', { name: '', capacity: 4, salonId: activeSalon.id })}><Plus size={15} className="mr-1" /> Agregar mesa</Button>} />
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {tables.map((t) => (
                <MesaCard key={t.id} table={t} order={state.orders.find((o) => o.id === t.orderId) || state.orders.find((o) => o.tableId === t.id && !['finalizado', 'cancelado'].includes(o.status))}
                  onOpen={() => {
                    const linkedOrder = state.orders.find((o) => o.id === t.orderId) || state.orders.find((o) => o.tableId === t.id && !['finalizado', 'cancelado'].includes(o.status))
                    if (linkedOrder) {
                      setSelected(t)
                    } else {
                      // Sin pedido: abrir POS directamente con la mesa
                      if (t.status === 'libre') { try { updateTable(t.id, { status: 'ocupada' }) } catch (e) { console.error('Error:', e); toastErr('Error') } }
                      onNav('pos', { tableId: t.id })
                    }
                  }}
                  onEdit={() => openForm('table', 'edit', { id: t.id, name: t.name, capacity: t.capacity, salonId: t.salonId })}
                  onDelete={() => setDelConfirm({ type: 'table', id: t.id, name: t.name })} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal para mesa libre o sin pedido */}
      <Modal open={!!selectedTable && !drawerOrder && !selOrder} onClose={() => setSelected(null)} title={selectedTable ? selectedTable.name : ''} maxW="max-w-lg">
        {selectedTable && !selOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="white">{salonOf(selectedTable.salonId)}</Badge>
              <Badge tone={TONE_MAP[selectedTable.status]}>{selectedTable.status}</Badge>
              <span className="text-muted">👥 {selectedTable.capacity} pers.</span>
            </div>

            {selectedTable.status === 'libre' && (
              <div className="space-y-3">
                <p className="text-sm text-muted">La mesa está libre. Abre un pedido para comenzar a cargar consumos.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full !py-3 text-base" onClick={() => onNav('pos', { tableId: selectedTable.id })}>
                    <Plus size={16} className="mr-1" /> Abrir pedido
                  </Button>
                  <Button variant="outline" className="w-full !py-3 text-base" onClick={() => setQrTable(selectedTable)}>
                    <QrCode size={16} className="mr-1" /> QR Mesa
                  </Button>
                </div>
              </div>
            )}

            {selectedTable.status !== 'libre' && (
              <div className="space-y-3">
                <EmptyState icon="📭" title="Sin pedido activo" message="Esta mesa no tiene un pedido vinculado." />
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full" onClick={() => onNav('pos', { tableId: selectedTable.id })}>
                    <Plus size={16} className="mr-1" /> Nuevo pedido
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => setFreeConfirm(true)}>
                    <Trash2 size={16} className="mr-1" /> Liberar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer para mesa ocupada con pedido */}
      {selectedTable && drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          state={state}
          user={user}
          refresh={() => { refresh(); setDrawerOrder(null) }}
          onClose={() => setDrawerOrder(null)}
          onPay={(order) => { setPayObj(order); setDrawerOrder(null) }}
          onCancel={(order) => { setSelected(null); setDrawerOrder(null) }}
          canEdit={true}
          canPay={true}
          canPrint={true}
        />
      )}

      {/* Click en mesa ocupada → abre drawer */}
      {selectedTable && selOrder && !drawerOrder && (
        <Modal open={true} onClose={() => setSelected(null)} title="" maxW="max-w-lg">
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl">🍽️</div>
            <h3 className="text-xl font-bold text-night">Mesa {selectedTable.name}</h3>
            <p className="text-muted">Pedido #{selOrder.folio} · {fmtMoney(selOrder.total)}</p>
            <Button size="lg" className="w-full !py-4" onClick={openDrawer}>
              <Eye size={18} className="mr-2" /> Ver / Editar pedido
            </Button>
          </div>
        </Modal>
      )}

      <Modal open={!!selAction} onClose={() => setSelAction(null)} title={selAction === 'move' ? 'Cambiar a otra mesa' : 'Unir cuenta de otra mesa'} maxW="max-w-md">
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {(selAction === 'move' ? moveOptions : mergeOptions).length === 0 && (
            <EmptyState icon="🍽️" title={selAction === 'move' ? 'Sin mesas libres' : 'Sin mesas para unir'}
              message={selAction === 'move' ? 'Todas las mesas están ocupadas.' : 'No hay otras cuentas abiertas para unir.'} />
          )}
          {(selAction === 'move' ? moveOptions : mergeOptions).map((t) => {
            const o = state.orders.find((x) => x.id === t.orderId)
            return (
              <button key={t.id} onClick={() => handlePick(t)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line hover:border-brand hover:bg-brand-soft/40 transition text-left">
                <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-page font-bold text-night">{t.name.replace(/\D/g, '') || '🪑'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-night truncate">{t.name}</span>
                  <span className="block text-xs text-muted truncate">{salonOf(t.salonId)}{o ? ` · ${fmtMoney(o.total)}` : ''}</span>
                </span>
                <ArrowRightLeft size={16} className="text-muted shrink-0" />
              </button>
            )
          })}
        </div>
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={!form ? '' : form.mode === 'add' ? (form.type === 'salon' ? 'Nuevo salón' : 'Nueva mesa') : (form.type === 'salon' ? 'Editar salón' : 'Editar mesa')} maxW="max-w-sm">
        {form && (
          <div className="space-y-3">
            {form.type === 'salon' ? (
              <Field label="Nombre del salón">
                <Input autoFocus value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} placeholder="Ej. Salón principal" />
              </Field>
            ) : (
              <>
                <Field label="Nombre de la mesa">
                  <Input autoFocus value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} placeholder="Ej. Mesa 7" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacidad">
                    <Input type="number" min="1" value={form.data.capacity} onChange={(e) => setForm({ ...form, data: { ...form.data, capacity: e.target.value } })} />
                  </Field>
                  <Field label="Salón">
                    <Select value={form.data.salonId} onChange={(e) => setForm({ ...form, data: { ...form.data, salonId: e.target.value } })}>
                      {state.salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </Field>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setForm(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={submitForm}>{form.mode === 'add' ? 'Crear' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={freeConfirm}
        danger
        title="Liberar mesa"
        message={selectedTable ? `¿Liberar ${selectedTable.name}? El pedido quedará desvinculado de la mesa.` : ''}
        confirmLabel="Liberar"
        onConfirm={() => { try { freeTable(selectedTable.id); refresh(); setFreeConfirm(false); setSelected(null); toastOk('Mesa liberada') } catch (e) { console.error('Error:', e); toastErr('Error') } }}
        onCancel={() => setFreeConfirm(false)}
      />

      <ConfirmDialog
        open={!!delConfirm}
        danger
        title={delConfirm?.type === 'salon' ? 'Eliminar salón' : 'Eliminar mesa'}
        message={delConfirm?.type === 'salon' ? `¿Eliminar "${delConfirm?.name}"? Se borrarán también todas sus mesas.` : `¿Eliminar "${delConfirm?.name}"?`}
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setDelConfirm(null)}
      />

      <PaymentDialog order={payObj} open={!!payObj} onClose={() => setPayObj(null)}
        onPay={(p) => { try { payOrder(payObj.id, { ...p, user }); refresh(); setPayObj(null); setSelected(null); toastOk('Pedido cobrado') } catch (e) { console.error('Error:', e); toastErr('Error') } }} />

      <TicketModal order={ticketOrder} open={!!ticketOrder} onClose={() => setTicketOrder(null)} />

      {qrTable && (
        <QRTableModal table={qrTable} baseUrl={menuUrl.replace('?menu=1', '')} onClose={() => setQrTable(null)} />
      )}
    </div>
  )
}
