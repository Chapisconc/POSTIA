import React, { useState, useEffect, useMemo } from 'react'
import { X, Plus, Percent, Box, HandCoins, Printer, Check } from 'lucide-react'
import { Button, Badge, Field, Input, Select, QtyStepper, Segmented, SearchInput, EmptyState } from '../ui'
import { ServiceBadge, OrderStatusBadge } from '../shared/StatusBadge'
import ClientSelect from '../pos/ClientSelect'
import ModifierPicker from '../shared/ModifierPicker'
import { fmtMoney, fmtDec, fmtDuration } from '../../lib/format'
import { toast, toastOk, toastErr } from '../../lib/notify'
import { printTicket } from '../../lib/ticket'
import {
  updateOrder, updateOrderItem, removeOrderItem, setOrderStatus, findOrCreateClient, freeTable,
  addItemsToOrder, buildItem,
} from '../../lib/storage'

const SERVICE_OPTIONS = [
  { value: 'mostrador', label: '🛍️ Para llevar' },
  { value: 'domicilio', label: '🛵 Domicilio' },
  { value: 'mesa', label: '🍽️ Mesa' },
]

function OrderTimer({ createdAt }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, now - new Date(createdAt).getTime())
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1 shrink-0">
      <span className="font-mono font-bold tabular-nums text-xs">{fmtDuration(ms)}</span>
      <span className="text-[10px] text-white/80">min</span>
    </div>
  )
}

export default function OrderDrawer({ order, state, user, refresh, onClose, onPay, onCancel, canEdit, canPay, canPrint }) {
  if (!order) return null
  const [clientName, setClientName] = useState(order.client?.name || '')
  const [clientPhone, setClientPhone] = useState(order.client?.phone || '')
  const [address, setAddress] = useState(order.client?.address || '')
  const [colony, setColony] = useState(order.client?.colony || '')
  const [reference, setReference] = useState(order.client?.reference || '')
  const [deliveryCost, setDeliveryCost] = useState(order.deliveryCost ? String(order.deliveryCost) : '')
  const [discountMode, setDiscountMode] = useState('$')
  const [discountVal, setDiscountVal] = useState(order.discount > 0 ? String(Number(Number(order.discount).toFixed(2))) : '')
  const [tip, setTip] = useState(order.tip ? String(order.tip) : '')
  const [packCost, setPackCost] = useState(order.packagingCost ? String(order.packagingCost) : '')
  const [openExtra, setOpenExtra] = useState(null)
  const [productOpen, setProductOpen] = useState(false)
  const [productQ, setProductQ] = useState('')
  const [pickTarget, setPickTarget] = useState(null)

  useEffect(() => {
    setClientName(order.client?.name || '')
    setClientPhone(order.client?.phone || '')
    setAddress(order.client?.address || '')
    setColony(order.client?.colony || '')
    setReference(order.client?.reference || '')
    setDeliveryCost(order.deliveryCost ? String(order.deliveryCost) : '')
    setDiscountVal(order.discount > 0 ? String(Number(Number(order.discount).toFixed(2))) : '')
    setTip(order.tip ? String(order.tip) : '')
    setPackCost(order.packagingCost ? String(order.packagingCost) : '')
  }, [order.id])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const terminal = order.status === 'finalizado' || order.status === 'cancelado'
  const isEditable = !order.paid && !terminal && canEdit
  const canPayBtn = canPay && !order.paid && (order.status === 'listo' || order.status === 'porcobrar')
  const serviceType = order.serviceType || 'mostrador'
  const mesaGroups = state.salons.map((salon) => ({
    salon,
    tables: state.tables.filter((t) => t.salonId === salon.id && (t.status === 'libre' || t.id === order.tableId)),
  })).filter((g) => g.tables.length > 0)

  const subtotal = order.subtotal || order.items.reduce((a, i) => a + (Number(i.lineTotal) || 0), 0)
  const manualDisc = subtotal > 0 && discountVal !== ''
    ? discountMode === '%'
      ? (subtotal * (parseFloat(discountVal) || 0)) / 100
      : Math.min(parseFloat(discountVal) || 0, subtotal)
    : 0
  const tipNum = parseFloat(tip) || 0
  const packNum = parseFloat(packCost) || 0
  const deliveryNum = parseFloat(deliveryCost) || 0
  const total = Math.max(0, subtotal - manualDisc + tipNum + deliveryNum + packNum)

  const products = state.products.filter((p) => p.available !== false && (!productQ.trim() || p.name.toLowerCase().includes(productQ.trim().toLowerCase())))

  const changeService = (st) => {
    if (!isEditable) return
    try {
      const wasMesa = serviceType === 'mesa'
      const isMesa = st === 'mesa'
      let nextTable = null
      if (wasMesa && !isMesa && order.tableId) {
        const t = state.tables.find((x) => x.id === order.tableId)
        if (t && t.orderId === order.id) freeTable(order.tableId)
      }
      let nextDelivery = 0
      if (st === 'domicilio') {
        const base = state.settings.delivery?.baseCost ?? 30
        nextDelivery = deliveryNum > 0 ? deliveryNum : base
        if (nextDelivery === base) toast('Costo de envío base aplicado', 'info')
        setDeliveryCost(String(nextDelivery))
      } else {
        setDeliveryCost('')
      }
      updateOrder(order.id, { serviceType: st, tableId: isMesa ? order.tableId || nextTable : null, deliveryCost: st === 'domicilio' ? nextDelivery : 0 }, user)
      toastOk('Servicio actualizado')
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const setTable = (v) => {
    if (!isEditable) return
    try { updateOrder(order.id, { tableId: v || null }, user); toastOk('Mesa actualizada'); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const commitClient = () => {
    if (!isEditable) return
    try {
      const name = clientName.trim()
      const client = name
        ? (() => {
          const c = findOrCreateClient({ name, phone: clientPhone }).client
          return { ...c, address: address.trim(), colony: colony.trim(), reference: reference.trim() }
        })()
        : { ...(order.client || {}), name: '', phone: clientPhone.trim(), address: address.trim(), colony: colony.trim(), reference: reference.trim() }
      updateOrder(order.id, { client }, user)
      if (name) toastOk('Cliente actualizado')
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const commitDelivery = () => {
    if (!isEditable) return
    try { const v = parseFloat(deliveryCost) || 0; updateOrder(order.id, { deliveryCost: v }, user); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const commitDiscount = () => {
    if (!isEditable) return
    try { const d = manualDisc; updateOrder(order.id, { discount: d, discountReason: d > 0 ? (discountMode === '%' ? `Descuento ${fmtDec(parseFloat(discountVal) || 0)}%` : 'Descuento manual') : '' }, user); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const commitTip = () => {
    if (!isEditable) return
    try { updateOrder(order.id, { tip: tipNum }, user); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const commitPack = () => {
    if (!isEditable) return
    try { updateOrder(order.id, { packagingCost: packNum }, user); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const changeQty = (it, v) => {
    if (!isEditable) return
    try {
      if (v === 0) { removeOrderItem(order.id, it.id); toastOk('Artículo eliminado'); refresh(); return }
      updateOrderItem(order.id, it.id, { qty: v })
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const removeItem = (it) => {
    if (!isEditable) return
    try { removeOrderItem(order.id, it.id); toastOk('Artículo eliminado'); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const addQuick = (p) => {
    if (!isEditable) return
    try { addItemsToOrder(order.id, [buildItem(p, 1, [], '')], user); toastOk(`${p.emoji} ${p.name} agregado`); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const confirmPick = (r) => {
    if (!pickTarget || !isEditable) return
    try { addItemsToOrder(order.id, [buildItem(pickTarget, r.qty, r.modifiers, r.note)], user); toastOk(`${pickTarget.emoji} ${pickTarget.name} agregado`); setPickTarget(null); refresh() }
    catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const liveOrder = useMemo(() => state.orders.find((o) => o.id === order.id) || order, [state.orders, order.id])
  const printKitchen = () => {
    if (!canPrint) { toastErr('Sin permiso para imprimir'); return }
    const ok = printTicket(liveOrder, undefined, 'kitchen')
    if (ok) toastOk(`Comanda #${liveOrder.folio || liveOrder.id} enviada a impresión`)
    else toastErr('No se pudo imprimir la comanda')
  }

  const acceptOrder = () => {
    if (!isEditable) return
    try {
      commitClient()
      commitDiscount()
      commitTip()
      commitPack()
      if (order.status === 'nuevo') {
        setOrderStatus(order.id, 'preparando', { user })
        toastOk(`#${order.folio} → Aceptado`)
      }
      const target = state.orders.find((o) => o.id === order.id) || order
      printTicket(target, undefined, 'ticket')
      printTicket(target, undefined, 'kitchen')
      refresh()
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const finalize = () => {
    if (!isEditable) return
    try {
      commitClient()
      commitDiscount()
      commitTip()
      commitPack()
      if (order.status !== 'porcobrar') {
        setOrderStatus(order.id, 'porcobrar', { user })
        toastOk(`#${order.folio} → Por cobrar`)
      }
      refresh()
      onPay(order)
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-night" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card shadow-2xl flex flex-col animate-pop text-night h-screen overflow-hidden">
        {/* Header de marca */}
        <div className="bg-brand text-white px-6 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-mono font-extrabold text-2xl leading-tight">#{order.folio}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <ServiceBadge type={serviceType} />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            <OrderTimer createdAt={order.createdAt} />
            <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 p-2.5 -mr-1 rounded-xl hover:bg-white/20 transition">
              <X size={22} className="text-white" />
            </button>
          </div>
        </div>

        {/* Cuerpo del pedido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {isEditable && (
            <Segmented className="!p-0.5" options={SERVICE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={serviceType} onChange={changeService} />
          )}
          {serviceType === 'mesa' && (
            isEditable ? (
              <Field label="Mesa">
                <Select value={order.tableId || ''} onChange={(e) => setTable(e.target.value)}>
                  <option value="">Seleccionar mesa…</option>
                  {mesaGroups.map((g) => (
                    <optgroup key={g.salon.id} label={g.salon.name}>
                      {g.tables.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.status === 'ocupada' ? ' (en uso)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-page text-base text-night font-semibold">{state.tables.find((t) => t.id === order.tableId)?.name || 'Sin mesa'}</div>
            )
          )}

          {isEditable ? (
            <div className="space-y-4">
              <Field label="Cliente">
                <ClientSelect value={clientName} phone={clientPhone} onNameChange={setClientName} onPhoneChange={setClientPhone} clients={state.clients} />
              </Field>
              <Field label="Teléfono">
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} onBlur={commitClient} placeholder="Ej. 3312345678" className="!py-2 !text-sm" />
              </Field>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-xl bg-page text-base text-night font-semibold">{order.client?.name || 'Sin cliente'}</div>
          )}

          {(serviceType === 'domicilio' || serviceType === 'menudigital') && (
            isEditable ? (
              <div className="space-y-3">
                <Field label="Dirección">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={commitClient} placeholder="Calle y número" className="!py-2 !text-sm" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Colonia">
                    <Input value={colony} onChange={(e) => setColony(e.target.value)} onBlur={commitClient} placeholder="Colonia" className="!py-2 !text-sm" />
                  </Field>
                  <Field label="Referencia">
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} onBlur={commitClient} placeholder="Referencia" className="!py-2 !text-sm" />
                  </Field>
                </div>
                <Field label="Costo de envío">
                  <Input type="number" min="0" step="0.01" value={deliveryCost} onChange={(e) => setDeliveryCost(e.target.value)} onBlur={commitDelivery} placeholder={fmtMoney(state.settings.delivery?.baseCost || 30)} className="!py-2 !text-sm" />
                </Field>
              </div>
            ) : (
              order.client?.address && <div className="px-4 py-3 rounded-xl bg-page text-sm text-night">{order.client.address}{order.client.colony ? ` · ${order.client.colony}` : ''}{order.client.reference ? ` · Ref: ${order.client.reference}` : ''}</div>
            )
          )}

          {isEditable && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button className="flex-1 !py-2.5 !text-sm" onClick={() => { setProductOpen(!productOpen); setPickTarget(null) }}>
                  <Plus size={16} className={`mr-1 transition-transform ${productOpen ? 'rotate-45' : ''}`} /> Productos
                </Button>
                <Button variant="ghost" className="shrink-0 !py-2.5 !text-sm" onClick={printKitchen}><Printer size={16} className="mr-1" /> Cocina</Button>
              </div>

              {productOpen && (
                <div className="rounded-xl border border-line bg-page p-3 space-y-3">
                  {pickTarget ? (
                    <ModifierPicker product={pickTarget} groups={state.modGroups} onCancel={() => setPickTarget(null)} onConfirm={confirmPick} />
                  ) : (
                    <>
                      <SearchInput value={productQ} onChange={setProductQ} placeholder="Buscar producto…" />
                      {products.length === 0 ? (
                        <EmptyState icon="🍽️" title="Sin productos" message="No hay productos que coincidan." />
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-auto">
                          {products.map((p) => (
                            <button key={p.id} type="button" onClick={() => (p.modGroupIds?.length > 0 ? setPickTarget(p) : addQuick(p))}
                              className="text-left rounded-lg border border-line bg-card p-2.5 hover:border-brand hover:bg-brand-soft transition">
                              <div className="text-xl leading-none">{p.emoji}</div>
                              <div className="text-xs font-semibold text-night leading-tight mt-1.5 line-clamp-2">{p.name}</div>
                              <div className="text-xs font-mono text-brand font-semibold mt-1">{fmtMoney(p.price)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {order.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-muted text-base font-medium">Agrega productos antes de finalizar el pedido</p>
            </div>
          ) : (
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="rounded-xl border border-line bg-card shadow-sm p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-night text-base flex items-baseline gap-2">
                        <span className="text-lg">{it.emoji}</span>
                        <span className="truncate">{it.name}</span>
                        {it.saved > 0 && <Badge tone="gold">−{fmtMoney(it.saved)}</Badge>}
                      </div>
                      {it.modifiers?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {it.modifiers.map((m) => {
                            const n = String(m.name || '').replace(/^[+\-−–—]\s*/, '')
                            const paid = Number(m.price) > 0
                            return (
                              <span key={m.id}
                                className={`text-xs px-2 py-0.5 rounded-md border whitespace-nowrap ${paid ? 'border-brand/30 bg-brand-soft/60 text-brand-dark font-semibold' : 'border-line bg-page text-muted'}`}>
                                {paid ? `+ ${n} ${fmtMoney(m.price)}` : `− ${n}`}
                              </span>
                            )
                          })}
                        </div>
                      )}
                      {it.note && <div className="text-xs text-gold-dark font-medium mt-1">📝 {it.note}</div>}
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-night text-base">{fmtMoney(it.lineTotal)}</div>
                        <div className="text-xs text-muted font-mono">{fmtMoney(it.price)} c/u</div>
                      </div>
                      {isEditable && (
                        <button type="button" title="Quitar" onClick={() => removeItem(it)}
                          className="touch-icon w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <div className="flex items-center justify-end">
                      <QtyStepper value={it.qty} min={0} onChange={(v) => changeQty(it, v)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {order.cancelReason && <div className="text-sm text-danger bg-danger-soft rounded-lg px-4 py-2.5 font-medium">Cancelado: {order.cancelReason}</div>}
          {order.note && <div className="text-sm text-gold-dark bg-gold-soft/50 rounded-lg px-4 py-2.5 font-medium">📝 {order.note}</div>}
        </div>

        {/* Pie: extras + total + acciones */}
        <div className="border-t border-line bg-card p-5 shrink-0 space-y-4">
          {isEditable && (
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setOpenExtra(openExtra === 'disc' ? null : 'disc')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${openExtra === 'disc' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-card text-night hover:bg-page'}`}>
                <Percent size={16} /> Descuento
              </button>
              <button type="button" onClick={() => setOpenExtra(openExtra === 'tip' ? null : 'tip')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${openExtra === 'tip' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-card text-night hover:bg-page'}`}>
                <HandCoins size={16} /> + Servicio
              </button>
              <button type="button" onClick={() => setOpenExtra(openExtra === 'pack' ? null : 'pack')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${openExtra === 'pack' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-card text-night hover:bg-page'}`}>
                <Box size={16} /> + Embalaje
              </button>
            </div>
          )}

          {isEditable && openExtra === 'disc' && (
            <div className="rounded-xl border border-line bg-page p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-muted">Descuento</span>
                <Segmented className="!p-0.5 w-40" options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]} value={discountMode} onChange={setDiscountMode} />
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)} onBlur={commitDiscount} placeholder={discountMode === '%' ? '0%' : '$0.00'} />
                <Button variant="ghost" className="shrink-0 !py-2" onClick={commitDiscount}>Listo</Button>
              </div>
            </div>
          )}
          {isEditable && openExtra === 'tip' && (
            <div className="rounded-xl border border-line bg-page p-4 space-y-3">
              <span className="block text-sm font-semibold text-muted">Servicio (propina)</span>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" value={tip} onChange={(e) => setTip(e.target.value)} onBlur={commitTip} placeholder="$0.00" />
                <Button variant="ghost" className="shrink-0 !py-2" onClick={commitTip}>Listo</Button>
              </div>
            </div>
          )}
          {isEditable && openExtra === 'pack' && (
            <div className="rounded-xl border border-line bg-page p-4 space-y-3">
              <span className="block text-sm font-semibold text-muted">Embalaje</span>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" value={packCost} onChange={(e) => setPackCost(e.target.value)} onBlur={commitPack} placeholder="$0.00" />
                <Button variant="ghost" className="shrink-0 !py-2" onClick={commitPack}>Listo</Button>
              </div>
            </div>
          )}

          {(manualDisc > 0 || tipNum > 0 || packNum > 0 || deliveryNum > 0) && (
            <div className="space-y-1.5 text-sm text-muted border-t border-line pt-3">
              {manualDisc > 0 && (
                <div className="flex justify-between">
                  <span>{discountMode === '%' ? `Descuento ${fmtDec(parseFloat(discountVal) || 0)}%` : 'Descuento'}</span>
                  <span className="font-mono font-medium text-danger">-{fmtMoney(manualDisc)}</span>
                </div>
              )}
              {tipNum > 0 && (
                <div className="flex justify-between">
                  <span>Servicio</span>
                  <span className="font-mono font-medium text-night">+{fmtMoney(tipNum)}</span>
                </div>
              )}
              {packNum > 0 && (
                <div className="flex justify-between">
                  <span>Embalaje</span>
                  <span className="font-mono font-medium text-night">+{fmtMoney(packNum)}</span>
                </div>
              )}
              {deliveryNum > 0 && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-mono font-medium text-night">+{fmtMoney(deliveryNum)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
            <div className="text-sm text-muted">
              {order.items.length} artículo{order.items.length === 1 ? '' : 's'}
              <Badge tone={order.paid ? 'success' : 'amber'} className="block mt-1.5 w-fit">{order.paid ? 'Pagado' : 'No pagado'}</Badge>
            </div>
            <div className="flex items-end gap-4">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted">Total</div>
                <div className="font-mono font-extrabold text-3xl text-night tabular-nums leading-none">{fmtMoney(total)}</div>
              </div>
              <button type="button" onClick={printKitchen} disabled={!canPrint} className="flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/50 hover:scale-105 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                <Printer size={24} />
                <span className="text-[10px] font-semibold leading-none">Imprimir</span>
              </button>
            </div>
          </div>

          {!terminal && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="dangerOutline" onClick={() => onCancel(order)}>Cancelar</Button>
              {canPayBtn && <Button variant="outlineBrand" onClick={() => onPay(order)}>Pago</Button>}
              {isEditable && order.status === 'nuevo'
                ? <Button variant="gradientSuccess" onClick={acceptOrder}><Check className="h-5 w-5" /> Aceptar</Button>
                : isEditable && <Button variant="gradient" onClick={finalize}>Finalizar</Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
