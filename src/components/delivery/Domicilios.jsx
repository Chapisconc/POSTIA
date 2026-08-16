import React, { useState, useMemo } from 'react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, Tabs, SearchInput,
  EmptyState, PageHeader, StatCard, QtyStepper, ConfirmDialog,
} from '../ui'
import ModifierPicker from '../shared/ModifierPicker'
import PaymentDialog from '../shared/PaymentDialog'
import TicketModal from '../shared/TicketModal'
import { fmtMoney, fmtNum, fmtAgo } from '../../lib/format'
import { toast, toastOk, toastErr } from '../../lib/notify'
import { deliveryStats, isToday } from '../../lib/stats'
import {
  createOrder, buildItem, findOrCreateClient, assignRider, setRiderStatus,
  setOrderStatus, setKitchenStatus, payOrder, updateOrder,
  ORDER_STATUS_LABEL, PAYMENT_METHODS,
} from '../../lib/storage'
import { Receipt, Bike, CheckCircle2, XCircle, Banknote, MapPin, PlusCircle } from 'lucide-react'

const STATUS_TONE = {
  nuevo: 'blue', preparando: 'amber', listo: 'success',
  porcobrar: 'purple', finalizado: 'muted', cancelado: 'danger',
}
const RIDER_TONE = { disponible: 'success', ocupado: 'amber', encamino: 'blue' }
const isDelivery = (o) => o.serviceType === 'domicilio' || (o.serviceType === 'menudigital' && o.client?.address)

function AssignRiderModal({ order, state, onClose, onAssign }) {
  const [rid, setRid] = useState('')
  const riders = state.riders.filter((r) => r.active !== false)
  return (
    <Modal open onClose={onClose} title={`Asignar repartidor · #${order.folio}`}>
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <div className="text-sm font-bold text-night">{order.client?.name || 'Sin cliente'}</div>
          <div className="text-xs text-muted mt-0.5">📍 {order.client?.address || 'Sin dirección'}</div>
        </div>
        <Field label="Repartidor">
          <Select value={rid} onChange={(e) => setRid(e.target.value)}>
            <option value="">Seleccionar…</option>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.status !== 'disponible' ? ` · ${r.status}` : ''}</option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" disabled={!rid} onClick={() => onAssign(order, rid)}>Asignar</Button>
        </div>
      </div>
    </Modal>
  )
}

function NewDeliveryModal({ state, user, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [colony, setColony] = useState('')
  const [reference, setReference] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [deliveryCost, setDeliveryCost] = useState(String(state.settings.delivery?.baseCost ?? 30))
  const [riderId, setRiderId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [picker, setPicker] = useState(null)

  const riders = state.riders.filter((r) => r.active !== false)
  const products = state.products.filter((p) => p.available !== false && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())))
  const subtotal = items.reduce((a, i) => a + (Number(i.lineTotal) || 0), 0)
  const ship = parseFloat(deliveryCost) || 0
  const total = subtotal + ship

  const onName = (e) => {
    const v = e.target.value
    setName(v)
    const c = state.clients.find((x) => x.name.toLowerCase() === v.trim().toLowerCase())
    if (c) { setPhone(c.phone || ''); setAddress(c.address || ''); setColony(c.colony || ''); setReference(c.reference || '') }
  }
  const addItem = (p) => {
    if (p.modGroupIds?.length) { setPicker(p); return }
    setItems((prev) => [...prev, buildItem(p, 1, [], '')])
    toastOk(`${p.emoji} ${p.name} agregado`)
  }
  const confirmMods = (r) => {
    if (!picker) return
    setItems((prev) => [...prev, buildItem(picker, r.qty, r.modifiers, r.note)])
    setPicker(null)
    toastOk(`${picker.emoji} ${picker.name} agregado`)
  }
  const changeQty = (id, v) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: v, lineTotal: v * i.price } : i)).filter((i) => i.qty > 0))
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))

  const create = () => {
    if (items.length === 0) { toastErr('Agrega al menos un producto'); return }
    if (!name.trim()) { toastErr('Escribe el nombre del cliente'); return }
    if (!address.trim()) { toastErr('Escribe la dirección de entrega'); return }
    const before = state.orders
    const { client } = findOrCreateClient({ name: name.trim(), phone })
    const res = createOrder({
      serviceType: 'domicilio',
      client: { ...client, address: address.trim(), colony: colony.trim(), reference: reference.trim() },
      items,
      deliveryCost: ship,
      status: 'nuevo',
      createdBy: user,
    })
    const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
    if (created) {
      if (riderId) assignRider(created.id, riderId)
      updateOrder(created.id, { deliveryPayment: payment, note: note.trim() }, user)
    }
    onCreated(created)
  }

  if (picker) {
    return (
      <Modal open onClose={() => setPicker(null)} title={picker.name} maxW="max-w-lg">
        <ModifierPicker product={picker} groups={state.modGroups} onCancel={() => setPicker(null)} onConfirm={confirmMods} />
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Nuevo domicilio" maxW="max-w-3xl">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Cliente">
            <Input list="delivery-client-list" value={name} onChange={onName} placeholder="Nombre del cliente" />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 3312345678" />
          </Field>
        </div>
        <datalist id="delivery-client-list">
          {state.clients.map((c) => <option key={c.id} value={c.name}>{c.phone}</option>)}
        </datalist>
        <Field label="Dirección">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Colonia">
            <Input value={colony} onChange={(e) => setColony(e.target.value)} placeholder="Colonia" />
          </Field>
          <Field label="Referencia">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Puntos de referencia" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <Field label="Costo de envío">
            <Input type="number" min="0" step="0.01" value={deliveryCost} onChange={(e) => setDeliveryCost(e.target.value)} placeholder={fmtMoney(state.settings.delivery?.baseCost || 30)} />
          </Field>
          <Field label="Repartidor">
            <Select value={riderId} onChange={(e) => setRiderId(e.target.value)}>
              <option value="">Sin repartidor</option>
              {riders.map((r) => <option key={r.id} value={r.id}>{r.name}{r.status !== 'disponible' ? ` · ${r.status}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Notas del pedido">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Instrucciones…" />
          </Field>
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-1">Forma de pago</span>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPayment(p.id)}
                className={`touch-target py-2 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 ${payment === p.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                <span className="text-lg">{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line p-3">
          <span className="block text-xs font-semibold text-muted mb-2">Productos</span>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar producto…" className="mb-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
            {products.map((p) => (
              <button key={p.id} type="button" onClick={() => addItem(p)}
                className="touch-target text-left rounded-xl border border-line p-2 hover:border-brand hover:bg-brand-soft transition">
                <div className="text-xl">{p.emoji}</div>
                <div className="text-xs font-semibold text-night leading-tight mt-0.5">{p.name}</div>
                <div className="text-[11px] font-mono font-bold text-brand mt-0.5">{fmtMoney(p.price)}</div>
                {p.modGroupIds?.length > 0 && <div className="text-[11px] text-muted mt-0.5">⚙️ Personalizable</div>}
              </button>
            ))}
          </div>
          {products.length === 0 && <p className="text-xs text-muted text-center py-3">Sin productos que coincidan</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Artículos ({items.length})</span>
          </div>
          {items.length === 0 ? (
            <EmptyState icon="🛒" title="Sin artículos" message="Toca un producto para agregarlo." />
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-night truncate">{it.emoji} {it.name}</div>
                    {it.modifiers?.length > 0 && <div className="text-[11px] text-muted truncate">{it.modifiers.map((m) => m.name).join(' · ')}</div>}
                    {it.note && <div className="text-[11px] text-gold-dark font-medium truncate">📝 {it.note}</div>}
                  </div>
                  <QtyStepper value={it.qty} min={1} onChange={(v) => changeQty(it.id, v)} />
                  <div className="w-16 text-right text-sm font-mono font-bold text-night">{fmtMoney(it.lineTotal)}</div>
                  <button type="button" onClick={() => removeItem(it.id)} className="touch-icon text-muted hover:text-danger text-lg leading-none shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-page p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-mono font-semibold text-night">{fmtMoney(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Envío</span><span className="font-mono font-semibold text-night">{fmtMoney(ship)}</span></div>
          <div className="flex justify-between border-t border-line pt-1.5 font-bold text-night"><span>TOTAL</span><span className="font-mono text-brand text-lg">{fmtMoney(total)}</span></div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="gold" className="flex-1 !py-3" onClick={create}>🛵 Crear domicilio · {fmtMoney(total)}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Domicilios({ state, refresh, onNav, params, user }) {
  const [tab, setTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [payTarget, setPayTarget] = useState(null)
  const [printTarget, setPrintTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const ds = useMemo(() => deliveryStats(state), [state])
  const todayCount = useMemo(() => state.orders.filter((o) => isDelivery(o) && isToday(o.createdAt)).length, [state])
  const base = useMemo(() => state.orders.filter(isDelivery), [state])

  const filtered = base
    .filter((o) => tab === 'todos' || o.status === tab)
    .filter((o) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return String(o.folio).includes(q) || (o.client?.name || '').toLowerCase().includes(q) || (o.client?.phone || '').includes(q)
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const tabItems = [
    { id: 'todos', label: `Todos (${base.length})` },
    ...['nuevo', 'preparando', 'listo', 'porcobrar', 'finalizado', 'cancelado'].map((s) => ({
      id: s, label: `${ORDER_STATUS_LABEL[s]} (${base.filter((o) => o.status === s).length})`,
    })),
  ]

  const goCocina = (o) => { setKitchenStatus(o.id, 'preparando', user); toastOk(`#${o.folio} enviado a cocina`); refresh() }
  const markListo = (o) => { setKitchenStatus(o.id, 'listo', user); toastOk(`#${o.folio} listo para repartir`); refresh() }
  const startDelivery = (o) => {
    const r = state.riders.find((x) => x.id === o.riderId)
    if (!r) return
    setRiderStatus(r.id, 'encamino', o.id)
    setOrderStatus(o.id, 'porcobrar', { user })
    toastOk(`#${o.folio} en camino`)
    refresh()
  }
  const handlePay = ({ payment, cashReceived }) => {
    const o = payTarget
    const r = state.riders.find((x) => x.id === o.riderId)
    payOrder(o.id, { payment, cashReceived, user })
    if (r) setRiderStatus(r.id, 'disponible', null)
    toastOk(`#${o.folio} entregado y cobrado`)
    setPayTarget(null)
    refresh()
  }
  const confirmCancel = () => {
    setOrderStatus(cancelTarget.id, 'cancelado', { reason: 'Cancelado desde Domicilios', user })
    toastOk(`#${cancelTarget.folio} cancelado`)
    setCancelTarget(null)
    refresh()
  }
  const handleAssign = (o, rid) => { assignRider(o.id, rid); toastOk(`Repartidor asignado a #${o.folio}`); setAssignTarget(null); refresh() }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Domicilios"
        subtitle={`${base.length} repartos · ${ds.enCamino} en camino · ${fmtNum(ds.entregados)} entregados`}
        actions={<Button onClick={() => setOpen(true)}><PlusCircle size={16} className="mr-1" /> Nuevo domicilio</Button>}
      />

      {base.length === 0 ? (
        <Card className="py-14 px-6 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-soft grid place-items-center text-4xl">🛵</div>
          <div>
            <div className="text-xl font-bold text-night">Sin repartos activos</div>
            <p className="text-sm text-muted mt-1 max-w-xs">Crea tu primer domicilio para comenzar a gestionar entregas.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="!px-6 !py-3" onClick={() => setOpen(true)}><PlusCircle size={16} className="mr-1" /> Nuevo pedido</Button>
            <Button variant="outline" className="!px-6 !py-3" onClick={() => toast('Mapa de entregas próximamente', 'info')}><MapPin size={16} className="mr-1" /> Mapa de entregas</Button>
          </div>
        </Card>
      ) : (
        <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard icon={Receipt} label="Pedidos hoy" value={fmtNum(todayCount)} sub={`${fmtNum(ds.total)} en total`} tone="blue" />
        <StatCard icon={Bike} label="En camino" value={fmtNum(ds.enCamino)} sub="Repartos activos" tone="purple" />
        <StatCard icon={CheckCircle2} label="Entregados" value={fmtNum(ds.entregados)} sub="Histórico" tone="brand" />
        <StatCard icon={XCircle} label="Cancelados" value={fmtNum(ds.cancelados)} sub="Histórico" tone="danger" />
        <StatCard icon={Banknote} label="Ingresos" value={fmtMoney(ds.revenue)} sub="Domicilios cobrados" tone="gold" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs items={tabItems} value={tab} onChange={setTab} className="flex-1 min-w-[280px]" />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio o cliente…" className="w-full sm:w-64" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🛵" title="Sin domicilios" message="No hay repartos que coincidan con la vista actual." action={<Button onClick={() => setOpen(true)}>+ Nuevo domicilio</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => {
            const rider = state.riders.find((r) => r.id === o.riderId)
            const terminal = o.status === 'finalizado' || o.status === 'cancelado'
            const late = !terminal && (Date.now() - new Date(o.createdAt)) > 15 * 60 * 1000
            const pm = PAYMENT_METHODS.find((p) => p.id === o.deliveryPayment)
            const act = (() => {
              if (o.status === 'nuevo') return { label: '🍳 A cocina', variant: 'dark', onClick: () => goCocina(o) }
              if (o.status === 'preparando') return { label: '✅ Listo', variant: 'primary', onClick: () => markListo(o) }
              if (o.status === 'listo' && rider) return { label: '🛵 Iniciar reparto', variant: 'primary', onClick: () => startDelivery(o) }
              if (o.status === 'porcobrar') return { label: '💰 Cobrar / Entregado', variant: 'gold', onClick: () => setPayTarget(o) }
              return null
            })()
            return (
              <Card key={o.id} className={`p-4 flex flex-col gap-2.5 animate-pop ${late ? 'border-l-4 border-l-danger' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-extrabold text-night font-mono">#{o.folio}</div>
                    <div className="text-[11px] text-muted">{fmtAgo(o.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {late && <Badge tone="danger">⏰ Atrasado</Badge>}
                    <Badge tone={STATUS_TONE[o.status] || 'muted'}>{ORDER_STATUS_LABEL[o.status] || o.status}</Badge>
                  </div>
                </div>

                <div className="text-sm text-night font-medium truncate">
                  {o.client?.name || 'Sin cliente'}{o.client?.phone ? ` · ${o.client.phone}` : ''}
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-night leading-snug">{o.client?.address || 'Sin dirección'}</div>
                      {(o.client?.colony || o.client?.reference) && (
                        <div className="text-xs text-muted mt-0.5">
                          {[o.client?.colony, o.client?.reference ? `Ref: ${o.client.reference}` : ''].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {o.note && <div className="text-xs text-gold-dark bg-gold-soft/50 rounded-lg px-2 py-1 font-medium">📝 {o.note}</div>}

                <div className="flex items-end justify-between mt-auto border-t border-line pt-2">
                  <div className="space-y-1">
                    <Badge tone="white">{pm ? `${pm.icon} ${pm.label}` : '💵 Efectivo'}</Badge>
                    {o.paid && o.payment && <div className="text-[10px] text-muted">Pagado · {o.payment}</div>}
                  </div>
                  <div className="text-xl font-extrabold font-mono text-night">{fmtMoney(o.total)}</div>
                </div>

                {rider ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Bike size={14} className="text-brand shrink-0" />
                    <span className="font-semibold text-night truncate">{rider.name}</span>
                    <Badge tone={RIDER_TONE[rider.status] || 'muted'} className="ml-auto">{rider.status}</Badge>
                  </div>
                ) : !terminal ? (
                  <Button variant="outline" className="w-full" onClick={() => setAssignTarget(o)}>🛵 Asignar repartidor</Button>
                ) : null}

                <div className="flex flex-wrap gap-1.5">
                  {act && <Button variant={act.variant} className="flex-1 min-w-[110px]" onClick={act.onClick}>{act.label}</Button>}
                  <Button variant="outline" onClick={() => setPrintTarget(o)} title="Imprimir">🖨️</Button>
                  <Button variant="outline" className="flex-1" onClick={() => onNav('pedidos', { orderId: o.id })}>Ver</Button>
                  {!terminal && <Button variant="danger" className="flex-1" onClick={() => setCancelTarget(o)}>Cancelar</Button>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
        </>
      )}

      {open && (
        <NewDeliveryModal
          state={state}
          user={user}
          onClose={() => setOpen(false)}
          onCreated={(o) => { setOpen(false); refresh(); toastOk(o ? `Domicilio #${o.folio} registrado` : 'Domicilio registrado') }}
        />
      )}
      {assignTarget && <AssignRiderModal order={assignTarget} state={state} onClose={() => setAssignTarget(null)} onAssign={handleAssign} />}
      {payTarget && <PaymentDialog order={payTarget} open onClose={() => setPayTarget(null)} onPay={handlePay} />}
      {printTarget && <TicketModal order={printTarget} open onClose={() => setPrintTarget(null)} />}
      {cancelTarget && (
        <ConfirmDialog
          open
          danger
          title={`Cancelar domicilio #${cancelTarget.folio}`}
          message={`Se cancelará el reparto de ${cancelTarget.client?.name || 'este cliente'}. Esta acción no se puede deshacer.`}
          confirmLabel="Sí, cancelar"
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
