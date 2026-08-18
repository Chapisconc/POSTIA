import React, { useState } from 'react'
import {
  Card, Button, Badge, Field, Input, Modal, Toggle, ConfirmDialog,
  PageHeader, StatCard, EmptyState,
} from '../ui'
import { fmtMoney, fmtNum, fmtDateTime } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import { addRider, updateRider, deleteRider, assignRider, setRiderStatus } from '../../lib/storage'
import { User, Clock, Bike, CheckCircle2, PlusCircle, Pencil, Trash2, History, Phone, MapPin } from 'lucide-react'

const RIDER_TONE = { disponible: 'success', ocupado: 'amber', encamino: 'blue' }
const isDelivery = (o) => o.serviceType === 'domicilio' || (o.serviceType === 'menudigital' && o.client?.address)

function RiderFormModal({ initial, onClose, onSubmit }) {
  const [name, setName] = useState(initial?.name || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [active, setActive] = useState(initial ? initial.active !== false : true)
  const save = () => {
    if (!name.trim()) { toastErr('Escribe el nombre'); return }
    onSubmit({ name: name.trim(), phone: phone.trim(), ...(initial ? { active } : {}) })
  }
  return (
    <Modal open onClose={onClose} title={initial ? `Editar ${initial.name}` : 'Nuevo repartidor'}>
      <div className="space-y-4">
        <Field label="Nombre">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del repartidor" />
        </Field>
        <Field label="Teléfono">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 3312345678" />
        </Field>
        {initial && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-night font-medium">Repartidor activo</span>
            <Toggle checked={active} onChange={setActive} />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={save}>{initial ? 'Guardar' : 'Agregar repartidor'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function AssignOrderModal({ rider, state, onClose, onAssign }) {
  const [oid, setOid] = useState('')
  const pending = state.orders.filter((o) => isDelivery(o) && !o.riderId && o.status !== 'finalizado' && o.status !== 'cancelado')
  return (
    <Modal open onClose={onClose} title={`Asignar reparto a ${rider.name}`}>
      <div className="space-y-4">
        {pending.length === 0 ? (
          <EmptyState icon="🛵" title="Sin repartos pendientes" message="No hay domicilios sin repartidor asignado." />
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {pending.map((o) => (
              <button key={o.id} type="button" onClick={() => setOid(o.id)}
                className={`w-full text-left rounded-xl border p-2.5 transition ${oid === o.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-page'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono font-bold text-night">#{o.folio}</span>
                  <span className="font-mono font-semibold text-brand">{fmtMoney(o.total)}</span>
                </div>
                <div className="text-xs text-muted truncate">{o.client?.name || 'Sin cliente'}{o.client?.address ? ` · ${o.client.address}` : ''}</div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" disabled={!oid} onClick={() => onAssign(state.orders.find((o) => o.id === oid))}>Asignar</Button>
        </div>
      </div>
    </Modal>
  )
}

function RiderHistoryModal({ rider, state, onClose }) {
  const done = state.orders
    .filter((o) => o.riderId === rider.id && o.status === 'finalizado')
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
  return (
    <Modal open onClose={onClose} title={`Historial de ${rider.name}`} maxW="max-w-lg">
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {done.length === 0 ? (
          <EmptyState icon="📦" title="Sin entregas" message={`${rider.name} aún no registra entregas.`} />
        ) : done.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-xl border border-line p-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-night font-mono">#{o.folio}</div>
              <div className="text-xs text-muted truncate">{o.client?.name || 'Sin cliente'}{o.client?.address ? ` · ${o.client.address}` : ''}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-mono font-bold text-brand">{fmtMoney(o.total)}</div>
              <div className="text-[10px] text-muted">{fmtDateTime(o.paidAt || o.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  )
}

export default function Repartidores({ state, refresh, onNav, params, user }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [assignOrder, setAssignOrder] = useState(null)
  const [historyRider, setHistoryRider] = useState(null)

  const riders = state.riders
  const disponibles = riders.filter((r) => r.active !== false && r.status === 'disponible').length
  const ocupados = riders.filter((r) => r.active !== false && r.status === 'ocupado').length
  const encamino = riders.filter((r) => r.active !== false && r.status === 'encamino').length
  const entregas = riders.reduce((a, r) => a + (Number(r.deliveriesCount) || 0), 0)

  const liberar = (r) => { setRiderStatus(r.id, 'disponible', null); toastOk(`${r.name} liberado`); refresh() }
  const confirmDelete = () => { deleteRider(deleteTarget.id); toastOk(`${deleteTarget.name} eliminado`); setDeleteTarget(null); refresh() }
  const handleAssign = (o) => {
    if (!o) return
    assignRider(o.id, assignOrder.id)
    toastOk(`Reparto #${o.folio} asignado a ${assignOrder.name}`)
    setAssignOrder(null)
    refresh()
  }
  const submitAdd = (data) => { addRider(data); toastOk(`Repartidor ${data.name} agregado`); setFormOpen(false); refresh() }
  const submitEdit = (data) => { updateRider(editTarget.id, data); toastOk(`${editTarget.name} actualizado`); setEditTarget(null); refresh() }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Repartidores"
        subtitle={`${riders.length} repartidores · ${encamino} en camino`}
        actions={<Button onClick={() => setFormOpen(true)}><PlusCircle size={16} className="mr-1" /> Nuevo repartidor</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={User} label="Disponibles" value={fmtNum(disponibles)} sub="Listos para repartir" tone="brand" />
        <StatCard icon={Clock} label="Ocupados" value={fmtNum(ocupados)} sub="Con reparto asignado" tone="amber" />
        <StatCard icon={Bike} label="En camino" value={fmtNum(encamino)} sub="Entregando ahora" tone="blue" />
        <StatCard icon={CheckCircle2} label="Entregas" value={fmtNum(entregas)} sub="Histórico total" tone="purple" />
      </div>

      {riders.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🛵" title="Sin repartidores" message="Agrega repartidores para asignarles domicilios." action={<Button onClick={() => setFormOpen(true)}>+ Nuevo repartidor</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {riders.map((r) => {
            const cur = r.currentOrderId ? state.orders.find((o) => o.id === r.currentOrderId) : null
            const curAddr = cur?.client?.address
            return (
              <Card key={r.id} className="p-4 flex flex-col gap-2.5 animate-pop">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-soft grid place-items-center text-xl shrink-0">🛵</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-night truncate">{r.name}</div>
                    <div className="text-xs text-muted truncate flex items-center gap-1"><Phone size={11} className="shrink-0" /> {r.phone || 'Sin teléfono'}</div>
                  </div>
                  <Badge tone={RIDER_TONE[r.status] || 'muted'}>{r.status}</Badge>
                </div>

                {cur && curAddr ? (
                  <div className="rounded-xl bg-warning-soft border border-warning px-3 py-2">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-warning shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-night">Pedido #{cur.folio}</div>
                        <div className="text-xs text-muted truncate">{curAddr}{cur.client?.colony ? ` · ${cur.client.colony}` : ''}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted">Sin pedido asignado</div>
                )}

                <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-2">
                  <span className={`font-semibold ${r.active !== false ? 'text-success-dark' : 'text-danger'}`}>
                    {r.active !== false ? '✅ Activo' : '⛔ Inactivo'}
                  </span>
                  <span className="font-semibold"><CheckCircle2 size={12} className="inline text-brand mr-1" />{fmtNum(r.deliveriesCount || 0)} entregas</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" className="flex-1" onClick={() => setAssignOrder(r)}>🛵 Asignar</Button>
                  {r.status !== 'disponible' && <Button variant="dark" className="flex-1" onClick={() => liberar(r)}>Liberar</Button>}
                  <Button variant="outline" title="Historial" onClick={() => setHistoryRider(r)}><History size={14} /></Button>
                  <Button variant="outline" title="Editar" onClick={() => setEditTarget(r)}><Pencil size={14} /></Button>
                  <Button variant="danger" title="Eliminar" onClick={() => setDeleteTarget(r)}><Trash2 size={14} /></Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {formOpen && <RiderFormModal onClose={() => setFormOpen(false)} onSubmit={submitAdd} />}
      {editTarget && <RiderFormModal initial={editTarget} onClose={() => setEditTarget(null)} onSubmit={submitEdit} />}
      {deleteTarget && (
        <ConfirmDialog
          open
          danger
          title={`Eliminar a ${deleteTarget.name}`}
          message="Se quitará al repartidor. Los pedidos asignados quedarán sin repartidor."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {assignOrder && <AssignOrderModal rider={assignOrder} state={state} onClose={() => setAssignOrder(null)} onAssign={handleAssign} />}
      {historyRider && <RiderHistoryModal rider={historyRider} state={state} onClose={() => setHistoryRider(null)} />}
    </div>
  )
}
