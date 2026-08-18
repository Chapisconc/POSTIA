import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Clock, X, Plus, Percent, Box, HandCoins, Tag, Printer, Check, ArrowLeft, ArrowLeftRight, Banknote, CheckCircle2, ChefHat } from 'lucide-react'
import { Card, Button, Badge, Field, Input, Select, Modal, QtyStepper, Segmented, EmptyState, SearchInput } from '../ui'
import ModifierPicker from '../shared/ModifierPicker'
import { ServiceBadge, OrderStatusBadge } from '../shared/StatusBadge'
import { fmtMoney, fmtDec, fmtDuration } from '../../lib/format'
import { toast, toastOk, toastErr, toastWarn } from '../../lib/notify'
import { soundNewOrder, vibrate } from '../../lib/sound'
import { fuzzyMatch } from '../../lib/search'

import { printTicket } from '../../lib/ticket'
import {
  buildItem, createOrder, payOrder, updateOrder, cancelOrder, findOrCreateClient, setOrderStatus, readState, moveTable,
  PAYMENT_METHODS, paymentBreakdown, getSettings, authorizeSupervisor, ORDER_TRANSITIONS, ORDER_STATUS_LABEL,
} from '../../lib/storage'
import ProductDetailModal from './ProductDetailModal'
import ClientSelect from './ClientSelect'

function couponDiscount(subtotal, code, coupons) {
  if (!code || !subtotal) return 0
  const c = (coupons || []).find((x) => x.code.toLowerCase() === String(code).trim().toLowerCase())
  if (!c || !c.active) return 0
  return c.type === 'percent' ? subtotal * (c.value / 100) : Math.min(Number(c.value) || 0, subtotal)
}

function FreeProductModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const save = () => {
    const p = parseFloat(price)
    if (!name.trim()) { toastErr('Escribe el nombre del artículo'); return }
    if (isNaN(p) || p < 0) { toastErr('Ingresa un precio válido'); return }
    onAdd(name.trim(), p)
  }
  return (
    <Modal open onClose={onClose} title="Producto libre" zIndex="z-[70]">
      <div className="space-y-4">
        <div className="rounded-xl bg-brand-soft border border-brand/20 px-4 py-3 text-[13px] text-brand-dark">
          <span className="font-bold">Artículo personalizado</span> que no está en tu catálogo.
          Úsalo para platos del día, modificaciones especiales o cualquier cobro extra.
        </div>
        <Field label="Nombre / descripción">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Plato del día, alitas extra…" />
        </Field>
        <Field label="Precio">
          <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={save}>Agregar</Button>
        </div>
      </div>
    </Modal>
  )
}

const SERVICE_OPTIONS = [
  { value: 'mostrador', emoji: '🛍️', label: 'Para llevar', desc: 'Pedido para recoger en mostrador. Rápido y directo.' },
  { value: 'express', emoji: '⚡', label: 'Express', desc: 'Pedido rápido sin cliente. Directo al catálogo.' },
  { value: 'domicilio', emoji: '🛵', label: 'Domicilio', desc: 'Entrega a dirección del cliente.' },
  { value: 'mesa', emoji: '🍽️', label: 'Mesa', desc: 'Comensal en restaurante. Selecciona mesa.' },
]

function ClientServiceDrawer({ open, onClose, onConfirm, state, user, existingOrder, isNewOrder = false, currentItems = [], currentOrderId = null, currentServiceType = 'mostrador' }) {
  const [step, setStep] = useState('service')
  const [selectedService, setSelectedService] = useState(null)
  const [tableId, setTableId] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [clientName, setClientName] = useState(existingOrder?.client?.name || '')
  const [clientPhone, setClientPhone] = useState(existingOrder?.client?.phone || '')
  const [address, setAddress] = useState(existingOrder?.client?.address || '')
  const [colony, setColony] = useState(existingOrder?.client?.colony || '')
  const [reference, setReference] = useState(existingOrder?.client?.reference || '')
  const [skipAddress, setSkipAddress] = useState(false)
  const [showSupervisorCode, setShowSupervisorCode] = useState(false)
  const [supervisorCode, setSupervisorCode] = useState('')
  const [supervisorError, setSupervisorError] = useState('')

  const freeTables = state.tables.filter((t) => t.status === 'libre')
  const mesaGroups = state.salons.map((salon) => ({
    salon,
    tables: freeTables.filter((t) => t.salonId === salon.id),
  })).filter((g) => g.tables.length > 0)
  const hasFreeTables = freeTables.length > 0

  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return []
    return state.clients
      .filter((c) => (c.name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q))
      .slice(0, 10)
  }, [state.clients, clientQuery])

  const handleSelectClient = (c) => {
    setClientName(c.name || '')
    setClientPhone(c.phone || '')
    setAddress(c.address || '')
    setColony(c.colony || '')
    setReference(c.reference || '')
    setClientQuery('')
    setStep('clientInfo')
  }

  const createNewClient = () => {
    if (!clientName.trim() && !clientQuery.trim()) {
      toastErr('Ingresa el nombre del cliente')
      return
    }
    const name = clientName.trim() || clientQuery.trim()
    const { client } = findOrCreateClient({ name, phone: clientPhone.trim() })
    setClientName(client.name || '')
    setClientPhone(client.phone || '')
    setClientQuery('')
    setStep('clientInfo')
  }

  const handleSupervisorBypass = () => {
    const auth = authorizeSupervisor(supervisorCode)
    if (auth) {
      setSkipAddress(true)
      setShowSupervisorCode(false)
      setSupervisorCode('')
      toastOk(`Autorizado por ${auth.role === 'admin' ? 'admin' : 'supervisor'} ${auth.name}`)
    } else {
      setSupervisorError('Código incorrecto. Solo admin o supervisor.')
    }
  }

  const continueToClient = () => {
    if (selectedService === 'mesa' && !tableId) {
      toastErr('Selecciona una mesa')
      return
    }
    setStep('client')
  }

  const continueToAddress = () => {
    if (selectedService === 'domicilio' && !address.trim() && !skipAddress) {
      setShowSupervisorCode(true)
      return
    }
    setStep(skipAddress ? 'review' : 'address')
  }

  const canConfirm = () => {
    if (selectedService === 'mesa' && !tableId) return false
    if (selectedService === 'domicilio' && !address.trim() && !skipAddress) return false
    return true
  }

  const handleConfirm = () => {
    if (!canConfirm()) return
    onConfirm({
      serviceType: selectedService,
      tableId: selectedService === 'mesa' ? tableId : undefined,
      client: {
        name: clientName.trim() || (existingOrder?.client?.name || ''),
        phone: clientPhone.trim() || (existingOrder?.client?.phone || ''),
        address: address.trim() || undefined,
        colony: colony.trim() || undefined,
        reference: reference.trim() || undefined,
      },
      deliveryCost: selectedService === 'domicilio' ? (state.settings.delivery?.baseCost ?? 30) : 0,
    })
    reset()
    onClose()
  }

  // Direct select: for mostrador/express, skip review and go to catalog
  const handleDirectSelect = (service) => {
    onConfirm({
      serviceType: service,
      client: null,
      deliveryCost: 0,
    })
    reset()
  }

  const reset = () => {
    setStep('service')
    setSelectedService(null)
    setTableId('')
    setClientQuery('')
    setClientName('')
    setClientPhone('')
    setAddress('')
    setColony('')
    setReference('')
    setSkipAddress(false)
    setShowSupervisorCode(false)
    setSupervisorCode('')
    setSupervisorError('')
  }

  const close = () => {
    // If drawer is closed without selecting service but items exist, default to mostrador
    if (!selectedService && currentItems && currentItems.length > 0) {
      onConfirm({
        serviceType: 'mostrador',
        client: null,
        deliveryCost: 0,
      })
      reset()
      onClose()
      return
    }
    onClose()
    reset()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-4 bg-night/50 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <h3 className="type-h3 text-night">{existingOrder ? 'Editar pedido' : 'Nuevo pedido'} · Paso {step === 'service' ? '1: Servicio' : step === 'client' ? '2: Cliente' : step === 'address' ? '3: Dirección' : step === 'clientInfo' ? '2: Cliente' : '4: Review'}</h3>
          <button onClick={close} className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger touch-icon">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
          {/* === STEP 1: Service === */}
          {step === 'service' && (
            <>
              <div className="grid grid-cols-2 gap-3">
              {SERVICE_OPTIONS.map((o) => {
                const disabled = o.value === 'mesa' && !hasFreeTables
                const selected = selectedService === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (o.value === 'mesa') {
                        setSelectedService(o.value)
                        setStep('client')
                      } else if (o.value === 'domicilio') {
                        setSelectedService(o.value)
                        setStep('client')
                      } else {
                        // mostrador or express — direct to catalog
                        handleDirectSelect(o.value === 'express' ? 'mostrador' : o.value)
                      }
                    }}
                    className={`relative flex flex-col items-start text-left rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${selected ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30 shadow-md' : 'border-line hover:border-brand bg-card'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{o.emoji}</span>
                      <span className="font-bold text-night text-base">{o.label}</span>
                    </div>
                    <span className="text-xs text-muted leading-relaxed">{o.desc}</span>
                    {o.value === 'express' && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-warning/20 text-warning-dark px-1.5 py-0.5 rounded-full">RÁPIDO</span>
                    )}
                    {disabled && (
                      <span className="mt-2 text-[10px] font-semibold text-muted bg-line/50 px-2 py-1 rounded-lg w-fit">Sin mesas libres</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-page border border-line">
              <span className="text-sm">💡</span>
              <span className="text-xs text-muted leading-relaxed">
                <strong className="text-night">Para llevar y Express</strong> van directo al catálogo. <strong className="text-night">Domicilio</strong> requiere datos de entrega. <strong className="text-night">Mesa</strong> necesita seleccionar una mesa.
              </span>
            </div>
          </>
        )}

          {/* === STEP: Mesa selection (when mesa chosen) === */}
          {selectedService === 'mesa' && step === 'client' && (
            <div className="space-y-3">
              <Field label="Selecciona mesa">
                <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="border-line">
                  <option value="">Seleccionar mesa…</option>
                  {mesaGroups.length === 0 && <option value="" disabled>No hay mesas libres</option>}
                  {mesaGroups.map((g) => (
                    <optgroup key={g.salon.id} label={g.salon.name}>
                      {g.tables.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} • {t.capacity} pers.</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {/* === STEP 2: Client search === */}
          {step === 'client' && (
            <div className="space-y-3">
              <Field label="Buscar cliente">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">📱</span>
                  <input
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Teléfono o nombre…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand"
                  />
                </div>
              </Field>

              {clientMatches.length > 0 && (
                <div className="space-y-1">
                  {clientMatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left p-2.5 rounded-xl border border-line bg-page hover:bg-line/30 transition"
                    >
                      <div className="font-medium text-sm text-night">{c.name}</div>
                      {c.phone && <div className="text-xs text-muted font-mono">{c.phone}</div>}
                    </button>
                  ))}
                </div>
              )}

              {clientQuery && clientMatches.length === 0 && (
                <div className="text-center py-4 text-sm text-muted">No se encontró. Crea el cliente abajo.</div>
              )}

              {!clientQuery && clientMatches.length === 0 && (
                <div className="text-center py-4 text-sm text-muted">Busca o escribe para crear un nuevo cliente.</div>
              )}
            </div>
          )}

          {/* === STEP: Client info (after selecting/creating === */}
          {step === 'clientInfo' && (
            <div className="space-y-3">
              <Field label="Nombre del cliente">
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre" className="!py-2 !text-base" />
              </Field>
              <Field label="Teléfono">
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="000-000-0000" type="tel" className="!py-2 !text-base" />
              </Field>
              {clientName && (
                <button
                  type="button"
                  onClick={createNewClient}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-brand/30 text-brand text-sm font-semibold hover:bg-brand-soft transition"
                >
                  <span className="w-5 h-5 rounded-full bg-brand/10 grid place-items-center text-xs">+</span>
                  Crear nuevo cliente "{clientName}"
                </button>
              )}
            </div>
          )}

          {/* === STEP 3: Address (domicilio only) === */}
          {selectedService === 'domicilio' && step === 'address' && (
            <div className="space-y-3">
              <Field label="Dirección de entrega *">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" className="!py-2 !text-base" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Colonia">
                  <Input value={colony} onChange={(e) => setColony(e.target.value)} placeholder="Colonia" className="!py-2 !text-sm" />
                </Field>
                <Field label="Referencia">
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia" className="!py-2 !text-sm" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={skipAddress} onChange={(e) => setSkipAddress(e.target.checked)} className="w-4 h-4 rounded border-line text-brand" />
                <span className="text-muted">Sin dirección (requiere código de supervisor)</span>
              </label>
            </div>
          )}

          {/* === STEP: Supervisor code popup === */}
          {showSupervisorCode && (
            <div className="fixed inset-0 z-[80] grid place-items-center p-4 bg-night/50 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-card rounded-xl p-5 shadow-2xl">
                <h4 className="type-h3 text-night mb-3">Autorización supervisor</h4>
                <p className="text-sm text-muted mb-3">Ingresa el código de supervisor o admin para omitir dirección.</p>
                <Input
                  value={supervisorCode}
                  onChange={(e) => { setSupervisorCode(e.target.value); setSupervisorError('') }}
                  placeholder="Código de supervisor"
                  type="password"
                  className="!py-2 !text-base"
                />
                {supervisorError && <p className="text-xs text-danger mt-1">{supervisorError}</p>}
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowSupervisorCode(false)}>Cancelar</Button>
                  <Button variant="gradient" className="flex-1" onClick={handleSupervisorBypass}>Autorizar</Button>
                </div>
              </div>
            </div>
          )}

          {/* === STEP 4: Review === */}
          {step === 'review' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-page border border-line space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Servicio</span><span className="font-semibold text-night">{SERVICE_OPTIONS.find(o => o.value === selectedService)?.label || selectedService}</span></div>
                {selectedService === 'mesa' && tableId && (
                  <div className="flex justify-between"><span className="text-muted">Mesa</span><span className="font-semibold text-night">{tableOf(state, tableId)?.name || tableId}</span></div>
                )}
                {selectedService === 'domicilio' && address && (
                  <div className="flex justify-between"><span className="text-muted">Dirección</span><span className="font-semibold text-night truncate">{address}</span></div>
                )}
                {(clientName || clientPhone) && (
                  <div className="flex justify-between"><span className="text-muted">Cliente</span><span className="font-semibold text-night">{clientName || clientPhone || '—'}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-2">
            {step !== 'service' && (
              <Button variant="ghost" className="flex-1" onClick={() => setStep('service')}>← Back</Button>
            )}
            {step === 'client' && selectedService !== 'mesa' && (
              <Button variant="ghost" className="flex-1" onClick={() => setStep(selectedService === 'domicilio' ? 'address' : 'clientInfo')}>Saltar</Button>
            )}
            {step === 'client' && (
              <Button variant="gradientSuccess" className="flex-1" onClick={continueToClient}>
                Continuar
              </Button>
            )}
            {step === 'clientInfo' && (
              <Button variant="gradientSuccess" className="flex-1" onClick={() => selectedService === 'domicilio' ? setStep('address') : setStep('review')}>
                Continuar
              </Button>
            )}
            {step === 'address' && (
              <Button variant="gradientSuccess" className="flex-1" onClick={handleConfirm} disabled={!canConfirm()}>
                Confirmar pedido
              </Button>
            )}
            {step === 'review' && (
              <Button variant="gradientSuccess" className="flex-1" onClick={handleConfirm}>
                Confirmar pedido
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const tableOf = (state, id) => state.tables.find((t) => t.id === id)

function PosTimer({ start }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, now - start)
  return (
    <div className="flex items-center gap-1 bg-page/60 rounded-lg px-2.5 py-1 shrink-0">
      <Clock size={15} />
      <span className="font-mono font-bold tabular-nums text-xs">{fmtDuration(ms)}</span>
      <span className="text-[10px] text-white/80">min</span>
    </div>
  )
}

export default function POS({ state, refresh, onNav, params, user }) {
  const [serviceType, setServiceType] = useState('mostrador')
  const [tableId, setTableId] = useState('')
  const [orderTitle, setOrderTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [address, setAddress] = useState('')
  const [colony, setColony] = useState('')
  const [reference, setReference] = useState('')
  const [deliveryCost, setDeliveryCost] = useState('')
  const [items, setItems] = useState([])
  const [discountMode, setDiscountMode] = useState('$')
  const [discountVal, setDiscountVal] = useState('')
  const [tip, setTip] = useState('')
  const [packCost, setPackCost] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [orderId, setOrderId] = useState(null)
  const [picker, setPicker] = useState(null)

  const [serviceOpen, setServiceOpen] = useState(false)
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [openExtra, setOpenExtra] = useState(null)
  const [activeCat, setActiveCat] = useState('featured')
  const [search, setSearch] = useState('')
  const [freeOpen, setFreeOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [modifiedAfterAccept, setModifiedAfterAccept] = useState(false)
  const [payMethod, setPayMethod] = useState('efectivo')
  const [payCashReceived, setPayCashReceived] = useState('')
  const [mountAt] = useState(() => Date.now())
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [printMenuOpen, setPrintMenuOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1024px)').matches
      : true
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setServiceType('mostrador')
    setTableId('')
    setOrderTitle('')
    setClientName('')
    setClientPhone('')
    setAddress('')
    setColony('')
    setReference('')
    setDeliveryCost('')
    setItems([])
    setDiscountVal('')
    setDiscountMode('$')
    setTip('')
    setPackCost('')
    setCouponCode('')
    setOrderId(null)
    setCartOpen(false)
    const order = params?.orderId ? state.orders.find((o) => o.id === params.orderId) : null
    if (order && !order.paid && order.status !== 'finalizado' && order.status !== 'cancelado') {
      const cpDisc = couponDiscount(order.subtotal, order.couponCode, state.coupons)
      const manual = Math.max(0, (order.discount || 0) - cpDisc)
      setServiceType(order.serviceType || 'mostrador')
      setTableId(order.tableId || '')
      setOrderTitle(order.title || '')
      setClientName(order.client?.name || '')
      setClientPhone(order.client?.phone || '')
      setAddress(order.client?.address || '')
      setColony(order.client?.colony || '')
      setReference(order.client?.reference || '')
      setDeliveryCost(order.deliveryCost ? String(order.deliveryCost) : '')
      loadedOrderIdRef.current = order.id
      setItems((order.items || []).map((i) => ({ ...i })))
      setDiscountVal(manual > 0 ? String(Number(manual.toFixed(2))) : '')
      setTip(order.tip ? String(order.tip) : '')
      setPackCost(order.packagingCost ? String(order.packagingCost) : '')
      setCouponCode(order.couponCode || '')
      setOrderId(order.id)
      setModifiedAfterAccept(false)
      setCartOpen(true)
      setCatalogOpen(true)
    } else if (params?.tableId) {
      const existingOrder = state.orders.find(o => o.tableId === params.tableId && !['finalizado', 'cancelado'].includes(o.status))
      if (existingOrder) {
        const cpDisc = couponDiscount(existingOrder.subtotal, existingOrder.couponCode, state.coupons)
        const manual = Math.max(0, (existingOrder.discount || 0) - cpDisc)
        setServiceType(existingOrder.serviceType || 'mesa')
        setTableId(params.tableId)
        setOrderTitle(existingOrder.title || '')
        setClientName(existingOrder.client?.name || '')
        setClientPhone(existingOrder.client?.phone || '')
        loadedOrderIdRef.current = existingOrder.id
        setItems((existingOrder.items || []).map((i) => ({ ...i })))
        setDiscountVal(manual > 0 ? String(Number(manual.toFixed(2))) : '')
        setTip(existingOrder.tip ? String(existingOrder.tip) : '')
        setPackCost(existingOrder.packagingCost ? String(existingOrder.packagingCost) : '')
        setCouponCode(existingOrder.couponCode || '')
        setOrderId(existingOrder.id)
        setModifiedAfterAccept(false)
        setCartOpen(true)
        setCatalogOpen(true)
      } else {
        setServiceType('mesa')
        setTableId(params.tableId)
        setCartOpen(true)
        setCatalogOpen(true)
      }
    } else if (params?.serviceType) {
      setServiceType(params.serviceType)
    }
    setServiceOpen(!params?.orderId && !params?.tableId && !params?.serviceType)
  }, [params?.tableId, params?.orderId, params?.serviceType])

  const itemsRef = useRef(items)
  const itemsCountRef = useRef(items.length)
  const loadedOrderIdRef = useRef(null)
  useEffect(() => {
    if (!orderId || !items.length) { itemsRef.current = items; itemsCountRef.current = items.length; return }
    if (loadedOrderIdRef.current === orderId) { loadedOrderIdRef.current = null; itemsRef.current = items; itemsCountRef.current = items.length; return }
    if (itemsCountRef.current === items.length && JSON.stringify(itemsRef.current) === JSON.stringify(items)) return
    itemsRef.current = items
    itemsCountRef.current = items.length
    const p = payload()
    persistOrder(p, orderId)
    const current = readState().orders.find(o => o.id === orderId)
    if (current && current.status !== 'nuevo' && current.status !== 'cancelado' && current.status !== 'finalizado') {
      setOrderStatus(orderId, 'preparando', { user })
      if (current.status === 'preparando') setModifiedAfterAccept(true)
    }
    refresh()
  }, [items])

  const cats = state.categories.slice()
    .filter((c) => !/más vendidos/i.test(c.name))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const products = state.products.filter((p) => p.available !== false)
  const mesaGroups = state.salons.map((salon) => ({
    salon,
    tables: state.tables.filter((t) => t.salonId === salon.id),
  })).filter((g) => g.tables.length > 0)
  const subtotal = items.reduce((a, i) => a + (Number(i.lineTotal) || 0), 0)

  const couponInfo = useMemo(() => {
    const code = couponCode.trim()
    if (!code) return { discount: 0, ok: false, error: '', coupon: null }
    const c = state.coupons.find((x) => x.code.toLowerCase() === code.toLowerCase())
    if (!c || !c.active) return { discount: 0, ok: false, error: 'Cupón no existe o está inactivo', coupon: null }
    const now = Date.now()
    if (c.start && new Date(c.start).getTime() > now) return { discount: 0, ok: false, error: 'Cupón aún no válido', coupon: null }
    if (c.end && new Date(c.end).getTime() < now) return { discount: 0, ok: false, error: 'Cupón expirado', coupon: null }
    if (c.maxUses && (c.usedCount || 0) >= c.maxUses) return { discount: 0, ok: false, error: 'Cupón agotado', coupon: null }
    if (c.minPurchase && subtotal < c.minPurchase) return { discount: 0, ok: false, error: `Compra mínima de ${fmtMoney(c.minPurchase)}`, coupon: null }
    const discount = c.type === 'percent' ? subtotal * (c.value / 100) : Math.min(Number(c.value) || 0, subtotal)
    return { discount, ok: true, error: '', coupon: c }
  }, [couponCode, subtotal, state.coupons])

  const manualDisc = subtotal > 0 && discountVal !== ''
    ? discountMode === '%'
      ? (subtotal * (parseFloat(discountVal) || 0)) / 100
      : Math.min(parseFloat(discountVal) || 0, subtotal)
    : 0
  const tipNum = parseFloat(tip) || 0
  const deliveryNum = parseFloat(deliveryCost) || 0
  const packNum = parseFloat(packCost) || 0
  const totalDisc = Math.min(manualDisc + couponInfo.discount, subtotal)
  const total = Math.max(0, subtotal - totalDisc + tipNum + deliveryNum + packNum)

  const shown = products.filter((p) => {
    const q = search.trim()
    if (q) return fuzzyMatch(q, p.name)
    if (activeCat === 'featured') return !!p.featured
    return p.categoryId === activeCat
  })
  const activeCatLabel = activeCat === 'featured' ? 'Más vendidos' : cats.find((c) => c.id === activeCat)?.name || 'Productos'

  const counts = useMemo(() => {
    const c = { mostrador: 0, domicilio: 0, mesa: 0 }
    state.orders.forEach((o) => {
      if (!o.paid && o.status !== 'finalizado' && o.status !== 'cancelado' && c[o.serviceType] !== undefined) {
        c[o.serviceType]++
      }
    })
    return c
  }, [state.orders])

  const handlePickService = (data) => {
    setServiceType(data.serviceType || 'mostrador')
    setTableId(data.tableId || '')
    if (data.client) {
      setClientName(data.client.name || '')
      setClientPhone(data.client.phone || '')
      setAddress(data.client.address || '')
      setColony(data.client.colony || '')
      setReference(data.client.reference || '')
    }
    if (data.deliveryCost != null) setDeliveryCost(String(data.deliveryCost))
    setServiceOpen(false)
    setCatalogOpen(true)
    setCartOpen(true)
    if (data.serviceType === 'domicilio') {
      toast('Pedido de domicilio · agrega dirección y reparto', 'info')
    }
  }

  const changeServiceType = () => {
    setClientDrawerOpen(true)
  }

  const addItem = (product, qty = 1, modifiers = [], note = '') => {
    const it = buildItem(product, qty, modifiers, note)
    setItems((prev) => [...prev, it])
    toastOk(`${product.emoji} ${product.name} agregado`)
  }

  const addFree = (name, price) => {
    const it = buildItem({ id: `libre-${Date.now()}`, name, price, emoji: '🏷️' }, 1, [], '')
    setItems((prev) => [...prev, it])
    setFreeOpen(false)
    toastOk(`🏷️ ${name} agregado`)
  }

  const confirmMods = (r) => {
    if (!picker) return
    const it = buildItem(picker, r.qty, r.modifiers, r.note)
    setItems((prev) => [...prev, it])
    setPicker(null)
    toastOk(`${picker.name} agregado`)
  }

  const changeQty = (id, v) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: v, lineTotal: v * i.price } : i)).filter((i) => i.qty > 0))
  }

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))

  const openDetail = (p) => { setSelectedProduct(p); setDetailOpen(true) }

  const quickAdd = (p) => {
    openDetail(p)
  }

  const buildClient = () => {
    if (!clientName.trim()) return null
    const { client } = findOrCreateClient({ name: clientName.trim(), phone: clientPhone })
    return { ...client, address: address.trim(), colony: colony.trim(), reference: reference.trim() }
  }

  const hasClientData = () =>
    clientName.trim() !== '' || clientPhone.trim() !== '' || address.trim() !== '' ||
    colony.trim() !== '' || reference.trim() !== ''

  const hasOrderData = () =>
    items.length > 0 || hasClientData() || tipNum > 0 || packNum > 0 || deliveryNum > 0 || serviceType !== 'mostrador'

  const payload = () => ({
    serviceType,
    tableId: serviceType === 'mesa' ? tableId : null,
    title: orderTitle.trim(),
    client: buildClient(),
    items,
    discount: manualDisc,
    discountReason: manualDisc > 0 ? (discountMode === '%' ? `Descuento ${fmtDec(parseFloat(discountVal) || 0)}%` : 'Descuento manual') : '',
    tip: tipNum,
    deliveryCost: serviceType === 'domicilio' ? deliveryNum : 0,
    packagingCost: packNum,
    couponCode: couponCode.trim() || undefined,
    createdBy: user,
  })

  const draftRef = useRef(null)
  useEffect(() => {
    draftRef.current = { payload: payload(), orderId, hasData: hasOrderData() }
  })
  useEffect(() => {
    return () => {
      const d = draftRef.current
      if (!d || !d.hasData) return
      try {
        if (d.orderId) {
          const existing = readState().orders.find((o) => o.id === d.orderId)
          if (existing && !existing.paid && existing.status !== 'finalizado' && existing.status !== 'cancelado') {
            persistOrder(d.payload, d.orderId)
            refresh()
          }
          return
        }
        const before = readState().orders
        const res = createOrder({ ...d.payload, status: 'nuevo' })
        const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
        if (created) {
          soundNewOrder()
          toastWarn(`Borrador #${created.folio} guardado como pendiente`)
          refresh()
        }
      } catch (e) {
        console.error('Error guardando borrador al salir:', e)
      }
    }
  }, [])

  const persistOrder = (p, id) => {
    const res = updateOrder(id, {
      serviceType: p.serviceType,
      tableId: p.tableId,
      title: p.title,
      client: p.client,
      items: p.items,
      discount: p.discount,
      discountReason: p.discountReason,
      tip: p.tip,
      deliveryCost: p.deliveryCost,
      packagingCost: p.packagingCost,
      couponCode: p.couponCode,
    }, user)
    return res.orders.find((o) => o.id === id) || null
  }

  const saveOrder = () => {
    const p = payload()
    if (!items.length) { toastErr('Agrega al menos un producto'); return }
    if (!p.serviceType) { toastErr('Elige el tipo de servicio'); return }
    if (p.serviceType === 'mesa' && !p.tableId) { toastErr('Selecciona una mesa'); return }
    if (orderId) {
      const updated = persistOrder(p, orderId)
      refresh()
      if (updated && updated.status !== 'porcobrar') {
        setOrderStatus(orderId, 'porcobrar', { user })
        refresh()
      }
      setPayTarget(updated)
    } else {
      try {
        const before = state.orders
        const res = createOrder({ ...p, status: 'porcobrar' })
        const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
        if (!created) { toastErr('No se pudo crear el pedido'); return }
        setOrderId(created.id)
        soundNewOrder()
        vibrate()
        toastOk(`Pedido #${created.folio || created.id} creado`)
        refresh()
        setPayTarget(created)
      } catch (e) {
        console.error('Error creando pedido:', e)
        toastErr('Error al crear el pedido')
      }
    }
  }

  const handleCancel = () => {
    if (orderId) {
      setConfirmAction('cancel')
    } else {
      onNav('pedidos')
    }
  }

  const openPay = () => {
    if (items.length === 0) { toastErr('Agrega al menos un producto'); return }
    const p = payload()
    if (orderId) {
      const updated = persistOrder(p, orderId)
      refresh()
      setPayTarget(updated)
      return
    }
    const before = state.orders
    const res = createOrder(p)
    const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
    setOrderId(created?.id || null)
    setPayTarget(created || null)
  }

  const printKitchen = () => {
    if (items.length === 0) { toastErr('Agrega al menos un producto'); return }
    if (!serviceType) { toastErr('Elige el tipo de servicio'); return }
    let target = activeOrder
    if (!target) {
      try {
        const before = state.orders
        const res = createOrder(payload())
        const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
        if (!created) { toastErr('No se pudo imprimir la comanda'); return }
        setOrderId(created.id)
        refresh()
        target = created
      } catch (e) {
        console.error('Error creando pedido para comanda:', e)
        toastErr('No se pudo imprimir la comanda')
        return
      }
    }
    const ok = printTicket(target, undefined, 'kitchen')
    if (ok) toastOk(`Comanda #${target.folio || target.id} enviada a impresión`)
    else toastErr('No se pudo imprimir la comanda')
  }

  const acceptOrder = () => {
    const p = payload()
    if (!items.length) { toastErr('Agrega al menos un producto'); return }
    if (!p.serviceType) { toastErr('Elige el tipo de servicio'); return }
    if (p.serviceType === 'mesa' && !p.tableId) { toastErr('Selecciona una mesa'); return }
    let target = activeOrder
    if (!target) {
      try {
        const before = state.orders
        const res = createOrder({ ...p, status: 'nuevo' })
        const created = res.orders.find((o) => !before.some((b) => b.id === o.id))
        if (!created) { toastErr('No se pudo crear el pedido'); return }
        setOrderId(created.id)
        soundNewOrder()
        vibrate()
        refresh()
        target = created
      } catch (e) {
        console.error('Error creando pedido:', e)
        toastErr('Error al crear el pedido')
        return
      }
    }
    if (target.status === 'nuevo' || target.status === 'preparando') {
      if (target.status === 'nuevo') {
        setOrderStatus(target.id, 'preparando', { user })
      }
      setModifiedAfterAccept(false)
      toastOk(`#${target.folio || target.id} → Aceptado`)
      refresh()
    }
    printTicket(target, undefined, 'ticket')
    printTicket(target, undefined, 'kitchen')
  }

  const handleMoveTable = (targetTableId) => {
    if (!orderId || !targetTableId) return
    const targetTable = state.tables.find(t => t.id === targetTableId)
    if (targetTable?.orderId && targetTable.orderId !== orderId) {
      toastErr('Esa mesa ya tiene un pedido activo')
      return
    }
    moveTable(orderId, targetTableId)
    setTableId(targetTableId)
    setMoveOpen(false)
    refresh()
    toastOk(`Pedido movido a ${targetTable?.name || 'mesa'}`)
  }

  const moveOptions = state.tables.filter(t => t.id !== tableId && t.status === 'libre')

  const handlePay = ({ payment, cashReceived }) => {
    if (!payTarget) return
    payOrder(payTarget.id, { payment, cashReceived, user })
    toastOk(`Pedido #${payTarget.folio} cobrado`)
    setPayTarget(null)
    refresh()
    onNav('pedidos')
  }

  const payInfo = useMemo(() => {
    if (!payTarget) return { charge: 0, commission: 0, rounding: 0 }
    return paymentBreakdown(payTarget.total || 0, payMethod, getSettings())
  }, [payTarget, payMethod])

  useEffect(() => {
    if (payTarget) { setPayMethod('efectivo'); setPayCashReceived('') }
  }, [payTarget?.id])

  const payChange = Number(payCashReceived) - payInfo.charge
  const payPresets = useMemo(() => {
    if (!payTarget) return []
    const base = [0, 50, 100, 200, 500].filter((x) => x >= payInfo.charge)
    return [...new Set(base.concat([Math.ceil(payInfo.charge / 100) * 100]))].sort((a, b) => a - b)
  }, [payTarget, payInfo.charge])

  const handleInlinePay = () => {
    if (!payTarget) return
    const cash = payMethod === 'efectivo' && payCashReceived !== '' ? Number(payCashReceived) : null
    payOrder(payTarget.id, { payment: payMethod, cashReceived: cash, user })
    toastOk(`Pedido #${payTarget.folio} cobrado`)
    setPayTarget(null)
    setPayMethod('efectivo')
    setPayCashReceived('')
    refresh()
    onNav('pedidos')
  }

  const handleInlinePayFinalize = () => {
    if (!payTarget) return
    const p = payload()
    if (orderId) persistOrder(p, orderId)
    const cash = payMethod === 'efectivo' && payCashReceived !== '' ? Number(payCashReceived) : null
    payOrder(payTarget.id, { payment: payMethod, cashReceived: cash, user })
    toastOk(`Pedido #${payTarget.folio} cobrado y finalizado`)
    setPayTarget(null)
    setPayMethod('efectivo')
    setPayCashReceived('')
    refresh()
    onNav('pedidos')
  }

  const activeOrder = orderId ? state.orders.find((o) => o.id === orderId) : null
  const needsAccept = activeOrder?.status === 'nuevo' || (!orderId && items.length > 0) || modifiedAfterAccept
  const isMesa = serviceType === 'mesa' && !!tableId
  const showCatalog = catalogOpen && !serviceOpen
  const showDrawer = !serviceOpen && (isMesa ? cartOpen : (isDesktop ? (cartOpen || items.length > 0 || orderId || params?.orderId) : cartOpen))

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 pb-24 lg:pb-0 overflow-hidden">
        <div className={`h-full flex flex-col lg:grid lg:gap-3 lg:items-stretch ${showDrawer ? 'lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]' : 'lg:grid-cols-[1fr]'}`}>

      {/* ===== CATÁLOGO ===== */}
      <section className={`flex flex-col min-w-0 h-full overflow-hidden relative ${showCatalog && (!showDrawer || isDesktop) ? '' : 'hidden lg:flex'}`}>
        {/* Mobile: back button + categories */}
        <div className="lg:hidden shrink-0 border-b border-line">
          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
            <button onClick={() => { setCatalogOpen(false); setCartOpen(true) }}
              className="flex items-center gap-1.5 text-sm font-bold text-brand shrink-0 px-3 py-2.5 rounded-lg hover:bg-brand-soft transition touch-target">
              <ArrowLeft size={16} /> Volver al pedido
            </button>
            <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1">
              <button type="button" onClick={() => { setActiveCat('featured'); setSearch('') }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition touch-target ${activeCat === 'featured' ? 'bg-brand text-white' : 'bg-page text-muted'}`}>
                Vendidos
              </button>
              {cats.map((c) => (
                <button key={c.id} type="button" onClick={() => { setActiveCat(c.id); setSearch('') }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition touch-target ${activeCat === c.id ? 'bg-brand text-white' : 'bg-page text-muted'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 pb-2.5 flex gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar…" className="flex-1 !py-2 !text-[12px]" />
            <Button onClick={() => setFreeOpen(true)} className="shrink-0 !py-2 !text-xs touch-target"><Tag size={12} className="mr-1" /> Libre</Button>
          </div>
        </div>

        {/* Desktop: sidebar + content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Vertical category sidebar - desktop only */}
          <div className="hidden lg:flex flex-col w-40 shrink-0 border-r border-line bg-page overflow-y-auto py-2 gap-0.5">
            <button type="button" onClick={() => { setActiveCat('featured'); setSearch('') }}
              className={`text-left px-3 py-2.5 rounded-lg mx-1.5 text-sm font-semibold transition truncate ${activeCat === 'featured' ? 'bg-brand text-white shadow-sm' : 'text-night hover:bg-card'}`}>
              Más vendidos
            </button>
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={() => { setActiveCat(c.id); setSearch('') }}
                className={`text-left px-3 py-2.5 rounded-lg mx-1.5 text-sm font-semibold transition truncate ${activeCat === c.id ? 'bg-brand text-white shadow-sm' : 'text-night hover:bg-card'}`}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-w-0">
            <div className="hidden lg:flex items-center gap-2">
              <button onClick={() => onNav('pedidos')}
                className="flex items-center gap-1.5 text-sm font-bold text-brand shrink-0 px-3 py-2 rounded-lg hover:bg-brand-soft transition">
                <ArrowLeft size={16} /> Volver
              </button>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar… (F2)" className="flex-1 !py-1.5 !text-[12px]" />
              <Button onClick={() => setFreeOpen(true)} className="shrink-0 !py-1.5 !text-xs"><Tag size={13} className="mr-1" /> Libre</Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-night truncate">{activeCatLabel}</h3>
              <span className="text-[11px] text-muted whitespace-nowrap shrink-0">{shown.length} artículos</span>
            </div>

            {shown.length === 0 ? (
              <Card className="p-6"><EmptyState icon="🍽️" title="Sin productos" message="No hay productos en esta vista." /></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
                {shown.map((p) => (
                  <div key={p.id} className="group bg-card rounded-xl border border-line shadow-sm overflow-hidden hover:border-brand hover:shadow-md transition-all flex flex-col">
                    <button type="button" onClick={() => openDetail(p)} className="w-full text-left flex-1">
                      <div className="h-24 lg:h-32 grid place-items-center bg-page text-4xl lg:text-5xl">{p.emoji}</div>
                      <div className="p-2.5 lg:p-3">
                        <div className="text-sm lg:text-base font-semibold text-night leading-tight line-clamp-2">{p.name}</div>
                        <div className="mt-1 font-mono font-bold text-brand dark:text-night text-sm lg:text-base tabular-nums">{fmtMoney(p.price)}</div>
                        {p.modGroupIds?.length > 0 && <div className="text-[11px] lg:text-xs text-muted mt-1">⚙️ Personalizable</div>}
                      </div>
                    </button>
                    <div className="px-2.5 lg:px-3 pb-2.5 lg:pb-3">
                      <button type="button" onClick={() => quickAdd(p)}
                        className="w-full flex items-center justify-center gap-1 py-2.5 rounded-lg bg-brand text-white text-xs lg:text-sm font-semibold hover:bg-brand-dark transition touch-target">
                        <Plus size={14} /> Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ MODAL DE MODIFICADORES — sobre el catálogo (panel izquierdo), el ticket queda visible ═══ */}
        {picker && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center p-4 bg-night/40 backdrop-blur-sm" onClick={() => setPicker(null)}>
            <div className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden bg-card border border-line rounded-2xl shadow-2xl animate-pop"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                <h3 className="text-lg font-bold text-night truncate">Personalizar</h3>
                <button onClick={() => setPicker(null)} className="touch-icon w-10 h-10 grid place-items-center rounded-xl hover:bg-page transition text-muted">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                <ModifierPicker product={picker} groups={state.modGroups} onCancel={() => setPicker(null)} onConfirm={confirmMods} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ DETALLE DE PRODUCTO — sobre el catálogo (panel izquierdo) ═══ */}
        {detailOpen && selectedProduct && (
          <ProductDetailModal
            open={detailOpen}
            product={selectedProduct}
            groups={state.modGroups}
            onClose={() => { setDetailOpen(false); setSelectedProduct(null) }}
            onAdd={({ product, qty, modifiers, note }) => {
              addItem(product, qty, modifiers, note)
              setDetailOpen(false)
              setSelectedProduct(null)
            }}
          />
        )}
      </section>

      {/* ===== DRAWER / CARRITO ===== */}
      {/* Mobile: full screen. Desktop: side panel within grid */}
      <aside id="pos-cart"
        className={`
          ${showDrawer ? 'translate-x-0' : 'translate-x-full'}
          fixed inset-y-0 right-0 z-[60] w-full max-w-md
          bg-card shadow-2xl
          transition-transform duration-300 ease-out
          lg:transition-none
          ${showDrawer ? 'lg:static lg:translate-x-0 lg:max-w-none lg:shadow-none' : 'lg:hidden'}
          ${!showDrawer ? 'pointer-events-none' : 'pointer-events-auto'}
          flex flex-col
        `}>
        <div className="flex flex-col h-full bg-card overflow-hidden relative z-50">

          {payTarget ? (
            <>
              {/* ═══ HEADER PAGO ═══ */}
              <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-line bg-card">
                <button type="button" onClick={() => setPayTarget(null)}
                  className="shrink-0 w-10 h-10 grid place-items-center rounded-lg hover:bg-page transition touch-icon">
                  <ArrowLeft size={18} />
                </button>
                <span className="text-sm font-bold text-night truncate">Registrar pago</span>
                <Badge className="shrink-0">#{payTarget.folio}</Badge>
                <ServiceBadge type={payTarget.serviceType} />
              </div>

              {/* ═══ BODY PAGO ═══ */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted uppercase tracking-wide">Total</div>
                    <div className="font-mono font-extrabold text-2xl text-night">{fmtMoney(payTarget.total)}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-xs text-muted">Pagado <span className="font-mono font-semibold text-night">{fmtMoney(payInfo.charge - (Number(payCashReceived) > 0 ? 0 : 0))}</span></div>
                    <div className="text-xs text-muted">Queda a pagar <span className="font-mono font-bold text-danger">{fmtMoney(Math.max(0, payInfo.charge - (payMethod === 'efectivo' ? Number(payCashReceived) || 0 : 0)))}</span></div>
                  </div>
                </div>

                {/* Método de pago */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted">Método de pago</div>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setPayMethod(m.id); setPayCashReceived('') }}
                        className={`py-3 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 touch-target ${payMethod === m.id ? 'border-brand bg-brand-soft text-brand-dark ring-1 ring-brand' : 'border-line text-muted hover:bg-page'}`}>
                        <span className="text-lg">{m.icon}</span>{m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === 'tarjeta' && getSettings().payments.applyCommission && (
                  <div className="rounded-xl border border-gold/30 bg-gold-soft/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted">Venta</span><span className="font-mono">{fmtMoney(payTarget.total)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Comisión {getSettings().payments.cardCommission}%</span><span className="font-mono">−{fmtMoney(payInfo.commission)}</span></div>
                    {payInfo.rounding > 0 && <div className="flex justify-between"><span className="text-muted">Redondeo</span><span className="font-mono">+{fmtMoney(payInfo.rounding)}</span></div>}
                    <div className="flex justify-between font-bold text-night border-t border-gold/30 pt-1"><span>Cobro al cliente</span><span className="font-mono">{fmtMoney(payInfo.charge)}</span></div>
                  </div>
                )}

                {payMethod === 'efectivo' && (
                  <div className="space-y-2">
                    <Field label="Pago">
                      <Input type="number" min="0" step="0.01" value={payCashReceived} onChange={(e) => setPayCashReceived(e.target.value)} placeholder={fmtMoney(payInfo.charge)} className="!text-lg !font-mono" />
                    </Field>
                    <div className="flex flex-wrap gap-1.5">
                      {payPresets.map((p) => (
                        <button key={p} type="button" onClick={() => setPayCashReceived(String(p))}
                          className={`px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition touch-target ${Number(payCashReceived) === p ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                          {fmtMoney(p)}
                        </button>
                      ))}
                    </div>
                    {payCashReceived !== '' && (
                      <div className={`flex justify-between rounded-xl px-3 py-2 font-bold text-sm ${payChange >= 0 ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger'}`}>
                        <span>Cambio</span><span className="font-mono">{fmtMoney(Math.max(0, payChange))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ FOOTER PAGO ═══ */}
              <div className="border-t border-line px-4 py-3 shrink-0 flex gap-2">
                <Button variant="ghost" onClick={() => setPayTarget(null)} className="flex-1">Cancelar</Button>
                <Button variant="gradient" className="flex-1 !py-3" onClick={handleInlinePay}>
                  Registrar pago
                </Button>
                <Button variant="gradientSuccess" className="flex-1 !py-3" onClick={handleInlinePayFinalize}>
                  Finalizar
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* ═══ HEADER PEDIDO ═══ */}
              <div
                className="flex flex-col shrink-0 border-b border-line bg-card"
              >
                {/* Row 1: badges + timer + close */}
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <Badge className="shrink-0 !text-[10px]">#{activeOrder?.folio || 'Nuevo'}</Badge>
                  <ServiceBadge type={serviceType} />
                  {!activeOrder?.paid && (
                    <button
                      type="button"
                      onClick={() => changeServiceType()}
                      title="Cambiar tipo de servicio"
                      className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-night hover:bg-page transition shrink-0 touch-icon"
                    >
                      <ArrowLeftRight size={13} />
                    </button>
                  )}
                  <OrderStatusBadge status={activeOrder?.status || 'nuevo'} />
                  <PosTimer start={mountAt} />
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (items.length === 0 && orderId) cancelOrder(orderId, { reason: 'Pedido vacío cerrado sin confirmar', user })
                      setCartOpen(false)
                      onNav('pedidos')
                    }}
                    title="Cerrar pedido"
                    className="ml-auto shrink-0 w-9 h-9 grid place-items-center rounded-lg bg-danger text-white hover:bg-danger-dark transition touch-icon">
                    <X size={18} />
                  </button>
                </div>
                {/* Row 2: compact info (always visible) */}
                <div className="flex items-center justify-between px-3 pb-1.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-night font-medium truncate">
                      {clientName || 'Sin cliente'}
                      {serviceType === 'mesa' && state.tables.find(t => t.id === tableId)?.name ? ` · ${state.tables.find(t => t.id === tableId).name}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted">{items.reduce((a, i) => a + (Number(i.qty) || 1), 0)} artículo{items.reduce((a, i) => a + (Number(i.qty) || 1), 0) !== 1 ? 's' : ''}</span>
                    <span className="font-mono font-bold text-night ml-1">{fmtMoney(total)}</span>
                  </div>
                </div>
              </div>

              {/* ═══ BODY PEDIDO ═══ */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">


                {/* Scrollable area: title, client, items */}
                <div className="flex-1 overflow-y-auto min-h-0">

                {/* Título */}
                <div className="px-3 pt-2">
                  <input type="text" value={orderTitle} onChange={(e) => setOrderTitle(e.target.value)} placeholder="Título..."
                    className="w-full bg-transparent text-[13px] text-night placeholder:text-muted/60 outline-none border-b border-line pb-1.5" />
                </div>

                {/* Cliente */}
                <div className="px-3 pt-2">
                  <ClientSelect
                    value={clientName}
                    phone={clientPhone}
                    onNameChange={setClientName}
                    onPhoneChange={setClientPhone}
                    clients={state.clients}
                  />
                </div>

                {serviceType === 'mesa' && !tableId && (
                  <div className="px-4 pt-3">
                    <Field label="Mesa">
                      <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
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
                  </div>
                )}

                {serviceType === 'domicilio' && (
                  <div className="px-4 pt-3 space-y-2">
                    <Field label="Dirección">
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" className="!py-1.5 !text-[13px]" />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Colonia">
                        <Input value={colony} onChange={(e) => setColony(e.target.value)} placeholder="Colonia" className="!py-1.5 !text-[13px]" />
                      </Field>
                      <Field label="Referencia">
                        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia" className="!py-1.5 !text-[13px]" />
                      </Field>
                    </div>
                    <Field label="Costo de envío">
                      <Input type="number" min="0" step="0.01" value={deliveryCost} onChange={(e) => setDeliveryCost(e.target.value)} placeholder={fmtMoney(state.settings.delivery?.baseCost || 30)} className="!py-1.5 !text-[13px]" />
                    </Field>
                  </div>
                )}

                {/* Botones + Productos / Cocina */}
                <div className="px-3 pt-2 flex items-center gap-2">
                  <button type="button" onClick={() => { setCatalogOpen(true); setCartOpen(false); setPicker(null) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark transition shadow-sm touch-target">
                    <Plus size={16} /> Productos
                  </button>
                  {orderId && (
                    <button type="button" onClick={printKitchen}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-line text-sm font-semibold text-night hover:bg-page transition touch-target">
                      <Printer size={15} /> Cocina
                    </button>
                  )}
                </div>

                {/* ═══ LISTA DE ARTÍCULOS ═══ */}
                <div className="px-4 py-3 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">🛒</div>
                      <p className="text-muted text-sm">Agrega productos al pedido</p>
                    </div>
                  ) : items.map((it) => (
                    <div key={it.id} className="rounded-lg border border-line bg-card p-2 space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-night text-[13px] flex items-baseline gap-1">
                            <span>{it.emoji}</span>
                            <span className="truncate">{it.name}</span>
                          </div>
                          {it.modifiers?.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-0.5 sm:gap-1 mt-0.5">
                              {it.modifiers.map((m) => {
                                const n = String(m.name || '').replace(/^[+\-−–—]\s*/, '')
                                const paid = Number(m.price) > 0
                                return (
                                  <span key={m.id}
                                    className={`text-[11px] sm:text-[9px] px-1.5 sm:px-1 py-0.5 sm:py-px rounded border whitespace-nowrap ${paid ? 'border-brand/30 bg-brand-soft/60 text-brand-dark dark:text-night font-semibold' : 'border-line bg-page text-muted'}`}>
                                    {paid ? `+${n}` : `−${n}`}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {it.note && <div className="text-[10px] text-gold-dark font-medium">📝 {it.note}</div>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-night text-[13px]">{fmtMoney(it.lineTotal)}</div>
                          </div>
                          <button type="button" title="Quitar" onClick={() => removeItem(it.id)}
                            className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger transition touch-icon">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <QtyStepper value={it.qty} min={0} onChange={(v) => { if (v === 0) removeItem(it.id); else changeQty(it.id, v) }} />
                      </div>
                    </div>
                  ))}
                </div>
                </div>{/* end scrollable */}

                {/* ═══ SUMMARY: sticky bottom ═══ */}
                <div className="shrink-0 border-t border-line">
                {items.length > 0 && (
                  <div className="px-3 pb-1.5 flex items-center justify-between text-[11px] text-muted pt-1.5">
                    <span>{items.reduce((a, i) => a + (Number(i.qty) || 1), 0)} artículo{items.reduce((a, i) => a + (Number(i.qty) || 1), 0) === 1 ? '' : 's'}</span>
                    <span className="font-mono font-semibold text-night">{fmtMoney(subtotal)}</span>
                  </div>
                )}

                {/* ═══ EXTRAS ═══ */}
                {items.length > 0 && (
                  <div className="px-3 pb-1.5 flex gap-1.5">
                    <button type="button" onClick={() => setOpenExtra(openExtra === 'disc' ? null : 'disc')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition touch-target ${openExtra === 'disc' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                      <Percent size={12} /> Dcto
                    </button>
                    <button type="button" onClick={() => setOpenExtra(openExtra === 'tip' ? null : 'tip')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition touch-target ${openExtra === 'tip' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                      <HandCoins size={12} /> Servicio
                    </button>
                    <button type="button" onClick={() => setOpenExtra(openExtra === 'pack' ? null : 'pack')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition touch-target ${openExtra === 'pack' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                      <Box size={12} /> Embalaje
                    </button>
                  </div>
                )}

                {/* Paneles extras */}
                <div className="px-4 pb-2 space-y-2">
                  {openExtra === 'disc' && (
                    <div className="rounded-xl border border-line bg-page p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted">Descuento</span>
                        <Segmented className="!p-0.5 w-36" options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]} value={discountMode} onChange={setDiscountMode} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" step="0.01" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)} placeholder={discountMode === '%' ? '0%' : '$0.00'} />
                        <Button variant="ghost" className="shrink-0 !py-1.5" onClick={() => setOpenExtra(null)}>Listo</Button>
                      </div>
                    </div>
                  )}
                  {openExtra === 'tip' && (
                    <div className="rounded-xl border border-line bg-page p-3 space-y-2">
                      <span className="block text-xs font-semibold text-muted">Servicio (propina)</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" step="0.01" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="$0.00" />
                        <Button variant="ghost" className="shrink-0 !py-1.5" onClick={() => setOpenExtra(null)}>Listo</Button>
                      </div>
                    </div>
                  )}
                  {openExtra === 'pack' && (
                    <div className="rounded-xl border border-line bg-page p-3 space-y-2">
                      <span className="block text-xs font-semibold text-muted">Embalaje</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" step="0.01" value={packCost} onChange={(e) => setPackCost(e.target.value)} placeholder="$0.00" />
                        <Button variant="ghost" className="shrink-0 !py-1.5" onClick={() => setOpenExtra(null)}>Listo</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                {(tipNum > 0 || packNum > 0 || deliveryNum > 0 || totalDisc > 0) && (
                  <div className="px-4 pb-2 space-y-1 text-xs text-muted border-t border-line pt-2">
                    {totalDisc > 0 && (
                      <div className="flex justify-between">
                        <span>{manualDisc > 0 ? (discountMode === '%' ? `Descuento ${fmtDec(parseFloat(discountVal) || 0)}%` : 'Descuento manual') : 'Cupón'}</span>
                        <span className="font-mono font-medium text-danger">-{fmtMoney(totalDisc)}</span>
                      </div>
                    )}
                    {tipNum > 0 && <div className="flex justify-between"><span>Servicio</span><span className="font-mono font-medium text-night">+{fmtMoney(tipNum)}</span></div>}
                    {packNum > 0 && <div className="flex justify-between"><span>Embalaje</span><span className="font-mono font-medium text-night">+{fmtMoney(packNum)}</span></div>}
                    {deliveryNum > 0 && <div className="flex justify-between"><span>Envío</span><span className="font-mono font-medium text-night">+{fmtMoney(deliveryNum)}</span></div>}
                  </div>
                )}

                {/* ═══ TOTAL ═══ */}
                {items.length > 0 && (
                  <div className="px-3 py-2 flex items-center justify-between border-t border-line bg-card">
                    <div className="flex items-center gap-2">
                      <Badge tone={activeOrder?.paid ? 'success' : 'amber'} className="text-[10px]">
                        {activeOrder?.paid ? 'Pagado' : 'No pagado'}
                      </Badge>
                      {/* Print menu */}
                      {orderId && (
                        <div className="relative">
                          <button type="button" onClick={() => { setPrintMenuOpen(!printMenuOpen); setStatusMenuOpen(false); setMoreMenuOpen(false) }}
                            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-page transition text-muted hover:text-night touch-icon">
                            <Printer size={14} />
                          </button>
                          {printMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-line rounded-xl shadow-xl z-50 py-1">
                              <button type="button" onClick={() => { printTicket(activeOrder, undefined, 'ticket'); setPrintMenuOpen(false) }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-page flex items-center gap-2 transition">
                                <Printer size={12} /> Ticket cliente
                              </button>
                              <button type="button" onClick={() => { printTicket(activeOrder, undefined, 'kitchen'); setPrintMenuOpen(false) }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-page flex items-center gap-2 transition">
                                <ChefHat size={12} /> Ticket cocina
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Total</div>
                      <div className="font-mono font-extrabold text-lg text-night tabular-nums leading-none">{fmtMoney(total)}</div>
                    </div>
                  </div>
                )}
                </div>{/* end summary sticky */}
              </div>{/* end body flex-col */}

              {/* ═══ FOOTER PEDIDO ═══ */}
              <div className="border-t border-line px-3 py-2.5 shrink-0 bg-card z-10 relative">
                {/* Main action buttons - responsive */}
                <div className="flex items-center gap-2 flex-wrap">
                  {needsAccept ? (
                    <>
                      <button type="button" onClick={handleCancel}
                        className="px-3 py-2.5 rounded-lg text-xs font-semibold transition border-2 border-danger text-danger hover:bg-danger hover:text-white flex items-center gap-1 touch-target">
                        <X size={14} /> Cancelar
                      </button>
                      <button type="button" onClick={openPay}
                        className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 flex items-center justify-center gap-1 touch-target">
                        <Banknote size={14} /> Pago
                      </button>
                      <button type="button" onClick={acceptOrder}
                        className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/40 active:scale-[0.98] active:brightness-95 flex items-center justify-center gap-1 touch-target">
                        <Check size={14} /> Aceptar
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <button type="button" onClick={() => { setStatusMenuOpen(!statusMenuOpen); setMoreMenuOpen(false); setPrintMenuOpen(false) }}
                          className="px-3 py-2.5 rounded-lg text-xs font-semibold transition bg-page border border-line text-night hover:bg-card flex items-center gap-1 touch-target">
                          <Clock size={14} /> Estado
                        </button>
                        {statusMenuOpen && (
                          <div className="absolute bottom-full left-0 mb-1 w-44 bg-card border border-line rounded-xl shadow-xl z-[100] py-1">
                            {(ORDER_TRANSITIONS[activeOrder?.status] || []).filter((s) => s !== 'cancelado').map((s) => (
                              <button key={s} type="button"
                                onClick={() => { if (orderId) { setOrderStatus(orderId, s, { user }); refresh() }; setStatusMenuOpen(false) }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-page flex items-center gap-2 transition touch-target">
                                {activeOrder?.status === s && <Check size={12} className="text-success" />}
                                <span className={activeOrder?.status === s ? 'font-semibold text-night' : 'text-muted'}>{ORDER_STATUS_LABEL[s]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={openPay}
                        className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 flex items-center justify-center gap-1 touch-target">
                        <Banknote size={14} /> Pago
                      </button>
                      <button type="button" onClick={saveOrder}
                        className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg text-xs font-bold transition bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/40 active:scale-[0.98] active:brightness-95 flex items-center justify-center gap-1 touch-target">
                        <CheckCircle2 size={14} /> Finalizar
                      </button>
                      <div className="relative">
                        <button type="button" onClick={() => { setMoreMenuOpen(!moreMenuOpen); setStatusMenuOpen(false); setPrintMenuOpen(false) }}
                          className="w-9 h-9 rounded-lg text-sm font-bold transition bg-page border border-line text-night hover:bg-card grid place-items-center touch-icon">
                          ⋯
                        </button>
                        {moreMenuOpen && (
                          <div className="absolute bottom-full right-0 mb-2 w-44 bg-card border border-line rounded-xl shadow-xl z-50 py-1">
                            <button type="button" onClick={() => { setConfirmAction('cancel'); setMoreMenuOpen(false) }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-page flex items-center gap-2 text-danger transition touch-target">
                              <X size={14} /> Cancelar
                            </button>
                            <button type="button" onClick={() => { setConfirmAction('delete'); setMoreMenuOpen(false) }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-page flex items-center gap-2 text-danger transition touch-target">
                              <X size={14} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
      </div>

      {/* ═══ FOOTER ACCIONES - Siempre visible cuando hay items/pedido ═══ */}
      {(items.length > 0 || orderId) && !showDrawer && (
        <div className="hidden lg:flex shrink-0 border-t border-line bg-card px-4 py-3 items-center gap-2 z-10">
          <button type="button" onClick={() => { setCatalogOpen(false); setCartOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark transition shadow-sm">
            <Box size={16} /> Carrito {items.length > 0 && <Badge className="!bg-white/25 !text-white">{items.length}</Badge>}
          </button>
          <div className="flex-1" />
          {needsAccept ? (
            <>
              <button type="button" onClick={handleCancel}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition border-2 border-danger text-danger hover:bg-danger hover:text-white flex items-center gap-1.5">
                <X size={15} /> Cancelar
              </button>
              <button type="button" onClick={openPay}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 flex items-center gap-1.5">
                <Banknote size={16} /> Pago
              </button>
              <button type="button" onClick={acceptOrder}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/40 active:scale-[0.98] active:brightness-95 flex items-center gap-1.5">
                <Check size={16} /> Aceptar
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleCancel}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition border-2 border-danger text-danger hover:bg-danger hover:text-white flex items-center gap-1.5">
                <X size={15} /> Cancelar
              </button>
              <button type="button" onClick={openPay}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 flex items-center gap-1.5">
                <Banknote size={16} /> Pago
              </button>
              <button type="button" onClick={saveOrder}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/40 active:scale-[0.98] active:brightness-95 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Finalizar
              </button>
            </>
          )}
        </div>
      )}

      {serviceOpen && (
        <ClientServiceDrawer
          open={serviceOpen}
          state={state}
          user={user}
          existingOrder={null}
          isNewOrder={true}
          currentItems={items}
          currentOrderId={orderId}
          currentServiceType={serviceType}
          onClose={() => setServiceOpen(false)}
          onConfirm={handlePickService}
        />
      )}

      {clientDrawerOpen && (
        <ClientServiceDrawer
          open={clientDrawerOpen}
          state={state}
          user={user}
          existingOrder={orderId ? state.orders.find((o) => o.id === orderId) : null}
          onClose={() => setClientDrawerOpen(false)}
          onConfirm={handlePickService}
        />
      )}

      {freeOpen && <FreeProductModal onClose={() => setFreeOpen(false)} onAdd={addFree} />}

      {moveOpen && (
        <Modal open onClose={() => setMoveOpen(false)} title="Mover a otra mesa" maxW="max-w-md" zIndex="z-[70]">
          <div className="space-y-3">
            <p className="text-sm text-muted">Selecciona la mesa destino. Solo se muestran mesas libres.</p>
            {moveOptions.length === 0 ? (
              <EmptyState icon="🪑" title="Sin mesas libres" message="No hay mesas disponibles para trasladar." />
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {moveOptions.map(t => (
                  <button key={t.id} type="button" onClick={() => handleMoveTable(t.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-line bg-card hover:border-brand hover:bg-brand-soft transition">
                    <span className="text-xs font-bold text-night">{t.name}</span>
                    <span className="text-[10px] text-muted">{t.capacity} pers.</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ═══ MODAL CONFIRMAR ELIMINAR/CANCELAR ═══ */}
      {confirmAction && (
        <Modal open onClose={() => { setConfirmAction(null); setConfirmPassword(''); setConfirmError('') }} title={confirmAction === 'delete' ? 'Eliminar pedido' : 'Cancelar pedido'} maxW="max-w-md" zIndex="z-[90]">
          <div className="space-y-4">
            <div className="rounded-xl bg-danger-soft border border-danger/20 px-4 py-3 text-sm text-danger-dark">
              <span className="font-bold">Acción irreversible.</span>{' '}
              {confirmAction === 'delete'
                ? 'Todos los pagos de este pedido serán cancelados. Esta acción no se puede deshacer.'
                : 'El pedido será cancelado y no podrá modificarse.'}
            </div>
            {user?.role === 'cajero' && (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Se requiere <span className="font-semibold text-night">contraseña de supervisor o administrador</span> para realizar esta acción.
                </p>
                <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError('') }}
                  placeholder="Contraseña de supervisor" autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-line bg-card text-sm text-night placeholder:text-muted/60 focus:outline-none focus:border-brand" />
                {confirmError && <p className="text-xs text-danger font-medium">{confirmError}</p>}
              </div>
            )}
            <p className="text-sm font-semibold text-night">¿Estás seguro de que deseas eliminar permanentemente el pedido?</p>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => { setConfirmAction(null); setConfirmPassword(''); setConfirmError('') }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition border border-line text-muted hover:bg-page">
                Atrás
              </button>
              <button type="button" onClick={() => {
                if (user?.role === 'cajero') {
                  const auth = authorizeSupervisor(confirmPassword)
                  if (!auth) { setConfirmError('Contraseña incorrecta. Solo supervisor o administrador.'); return }
                }
                if (confirmAction === 'delete') {
                  cancelOrder(orderId, { reason: 'Eliminado', user })
                  toastOk('Pedido eliminado')
                } else {
                  cancelOrder(orderId, { reason: 'Cancelado desde POS', user })
                  toastOk('Pedido cancelado')
                }
                setConfirmAction(null); setConfirmPassword(''); setConfirmError('')
                refresh(); onNav('pedidos')
              }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition bg-danger text-white hover:bg-danger-dark">
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Backdrop: mobile always when drawer open; desktop only when floating drawer (catalog closed) */}
      {showDrawer && !isMesa && (!isDesktop || !showCatalog) && (
        <div className={`fixed inset-0 z-30 bg-night/50 backdrop-blur-sm`} onClick={() => onNav('pedidos')} />
      )}

      {items.length > 0 && !showDrawer && (
        <button
          type="button"
          onClick={() => { setCartOpen(true); setCatalogOpen(false) }}
          className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-night text-white px-4 py-3.5 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.18)] touch-target">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-7 h-7 rounded-lg bg-brand grid place-items-center text-xs font-extrabold">{items.length}</span>
            <span>Ver pedido</span>
          </span>
          <span className="font-mono text-lg font-extrabold">{fmtMoney(total)}</span>
        </button>
      )}
      </div>
    </div>
  )
}
