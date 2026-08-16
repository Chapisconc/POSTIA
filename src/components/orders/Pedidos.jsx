import React, { useState, useEffect, useMemo, useRef, useCallback, createPortal } from 'react'
import { Card, Button, Badge, Input, ConfirmDialog, Modal, StatCard } from '../ui'
import { fmtMoney, fmtDateTime, fmtDuration, fmtTime, fmtAgo } from '../../lib/format'
import { Store, Truck, Table2, Search, RefreshCw, Banknote, Clock, Printer, Eye, X, Plus, AlertTriangle, CheckCircle2, CircleDot, ArrowLeft, ChevronDown, Pencil, Trash2, Armchair, Receipt, CreditCard, Move, Merge, CirclePlus, XCircle } from 'lucide-react'
import { ORDER_STATUS_LABEL, SERVICE_LABEL, setOrderStatus, payOrder, cancelOrder, addSalon, updateSalon, deleteSalon, addTable, updateTable, deleteTable, freeTable, moveTable, mergeTables } from '../../lib/storage'
import { toastOk, toastErr, toastWarn } from '../../lib/notify'
import OrderDrawer from './OrderDrawer'
import PrintMenu from './PrintMenu'
import PaymentDialog from '../shared/PaymentDialog'

const SERVICE_TABS = [
  { key: 'mostrador', label: 'Mostrador', icon: Store },
  { key: 'domicilio', label: 'A domicilio', icon: Truck },
  { key: 'mesa', label: 'Mesas', icon: Table2 },
]

const STATUS_FILTERS = [
  { key: 'todo', label: 'Todo' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'encurso', label: 'En curso' },
  { key: 'pdv_web', label: 'PDV / WEB' },
  { key: 'apps', label: 'Aplicaciones' },
]

const STATUS_TONE = {
  nuevo: 'info',
  preparando: 'success',
  listo: 'brand',
  porcobrar: 'warning',
  finalizado: 'muted',
  cancelado: 'danger',
}

const SERVICE_ICON = {
  mostrador: Store,
  domicilio: Truck,
  mesa: Table2,
}

const TABLE_STATUS_STYLE = {
  libre: 'border-success bg-success-soft text-success-dark',
  ocupada: 'border-gold bg-gold-soft text-gold-dark',
  cuenta: 'border-warning bg-warning-soft text-warning-dark',
  pagada: 'border-line bg-page text-muted',
}

const TABLE_STATUS_LABEL = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  cuenta: 'Cuenta',
  pagada: 'Pagada',
}

// Dropdown inline para el botón Estado
function EstadoDropdown({ order, onClose, onSelect }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const options = []
  if (order.status === 'nuevo') {
    options.push({ key: 'preparando', label: 'En preparación', desc: 'Enviar a cocina', icon: '🍳', tone: 'info' })
    options.push({ key: 'cancelado', label: 'Cancelar', desc: 'Cancelar pedido', icon: '❌', tone: 'danger' })
  } else if (order.status === 'preparando') {
    options.push({ key: 'listo', label: 'Entregado', desc: 'Marcar como listo', icon: '✅', tone: 'success' })
    options.push({ key: 'porcobrar', label: 'Por cobrar', desc: 'Generar cuenta', icon: '💰', tone: 'warning' })
    options.push({ key: 'finalizado', label: 'Finalizado', desc: 'Cerrar pedido', icon: '🎉', tone: 'success' })
    options.push({ key: 'cancelado', label: 'Cancelar', desc: 'Cancelar pedido', icon: '❌', tone: 'danger' })
  } else if (order.status === 'listo') {
    options.push({ key: 'porcobrar', label: 'Por cobrar', desc: 'Generar cuenta', icon: '💰', tone: 'warning' })
    options.push({ key: 'finalizado', label: 'Finalizado', desc: 'Cerrar pedido', icon: '🎉', tone: 'success' })
    options.push({ key: 'cancelado', label: 'Cancelar', desc: 'Cancelar pedido', icon: '❌', tone: 'danger' })
  } else if (order.status === 'porcobrar') {
    options.push({ key: 'finalizado', label: 'Finalizado', desc: 'Cerrar pedido', icon: '🎉', tone: 'success' })
    options.push({ key: 'cancelado', label: 'Cancelar', desc: 'Cancelar pedido', icon: '❌', tone: 'danger' })
  } else {
    options.push({ key: 'finalizado', label: 'Finalizado', desc: 'Cerrar pedido', icon: '🎉', tone: 'success' })
  }

  const toneClasses = {
    success: 'border-success/40 bg-success/5 hover:border-success hover:bg-success/10',
    warning: 'border-gold/40 bg-gold/5 hover:border-gold hover:bg-gold/10',
    danger: 'border-danger/40 bg-danger/5 hover:border-danger hover:bg-danger/10',
    info: 'border-sky-400/40 bg-sky-400/5 hover:border-sky-400 hover:bg-sky-400/10',
  }
  const dotClasses = {
    success: 'bg-success',
    warning: 'bg-gold',
    danger: 'bg-danger',
    info: 'bg-sky-400',
  }

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-[200] w-64 sm:w-72 bg-card border border-line rounded-xl shadow-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-line bg-page/50">
        <div className="text-[11px] font-bold text-muted uppercase tracking-wide">Cambiar estado</div>
      </div>
      <div className="p-1.5 space-y-1">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={(e) => { e.stopPropagation(); onSelect(opt.key); onClose() }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${toneClasses[opt.tone]}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClasses[opt.tone]}`} />
            <span className="text-base shrink-0">{opt.icon}</span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-night leading-tight">{opt.label}</div>
              <div className="text-[10px] text-muted leading-tight">{opt.desc}</div>
            </div>
            <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// MesaCard moderno
function MesaCard({ table, order, onClick }) {
  const st = table.status
  const num = table.name.replace(/\D/g, '') || table.name

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${TABLE_STATUS_STYLE[st] || TABLE_STATUS_STYLE.libre}`}
    >
      <span className="font-extrabold text-3xl leading-none">{num}</span>
      <span className="text-[10px] font-bold mt-1.5 tracking-[0.15em] uppercase">{TABLE_STATUS_LABEL[st]}</span>
      {st !== 'libre' && order && (
        <div className="mt-2 w-full text-center">
          <div className="font-mono text-sm font-bold">{fmtMoney(order.total)}</div>
          {order.client?.name && (
            <div className="text-[10px] leading-tight mt-0.5 truncate opacity-80">{order.client.name}</div>
          )}
        </div>
      )}
    </button>
  )
}

export default function Pedidos({ state, refresh, onNav, params, user }) {
  const [serviceTab, setServiceTab] = useState('mostrador')
  const [statusFilter, setStatusFilter] = useState('todo')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [payTarget, setPayTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [printMenuId, setPrintMenuId] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [now, setNow] = useState(new Date())
  const [searchOpen, setSearchOpen] = useState(false)
  const [estadoDropdown, setEstadoDropdown] = useState(null)

  // Mesas state
  const [salonId, setSalonId] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [form, setForm] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [freeConfirm, setFreeConfirm] = useState(false)
  const [selAction, setSelAction] = useState(null)

  useEffect(() => {
    if (state.salons.length > 0 && !salonId) {
      setSalonId(state.salons[0].id)
    }
  }, [state.salons, salonId])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const can = useMemo(() => ({
    print: user?.permissions?.orders?.print ?? user?.role === 'admin',
    pay: user?.permissions?.orders?.pay ?? ['admin', 'cajero'].includes(user?.role),
    cancel: user?.permissions?.orders?.cancel ?? user?.role === 'admin',
    edit: user?.permissions?.orders?.edit ?? ['admin', 'supervisor'].includes(user?.role),
  }), [user])

  const isCajaAbierta = useMemo(() => {
    return state.caja?.sessions?.some(c => c.status === 'abierta') ?? false
  }, [state.caja])

  const filtered = useMemo(() => {
    let list = state.orders.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    list = list.filter(o => !['finalizado', 'cancelado'].includes(o.status))

    if (serviceTab === 'mostrador') list = list.filter(o => o.serviceType === 'mostrador')
    else if (serviceTab === 'domicilio') list = list.filter(o => o.serviceType === 'domicilio')
    else if (serviceTab === 'mesa') list = list.filter(o => o.serviceType === 'mesa' && !o.tableId) // Solo mesas sin asignar

    if (statusFilter === 'pendiente') list = list.filter(o => o.status === 'nuevo')
    else if (statusFilter === 'encurso') list = list.filter(o => o.status === 'preparando')
    else if (statusFilter === 'pdv_web') list = list.filter(o => ['mostrador', 'domicilio', 'menudigital'].includes(o.serviceType))
    else if (statusFilter === 'apps') list = list.filter(o => o.serviceType === 'menudigital')

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(o => String(o.folio).includes(q) || (o.client?.name || '').toLowerCase().includes(q) || (o.title || '').toLowerCase().includes(q))
    }
    return list
  }, [state.orders, serviceTab, statusFilter, search])

  const tabCounts = useMemo(() => {
    const active = state.orders.filter(o => !['finalizado', 'cancelado'].includes(o.status))
    return {
      mostrador: active.filter(o => o.serviceType === 'mostrador').length,
      domicilio: active.filter(o => o.serviceType === 'domicilio').length,
      mesa: active.filter(o => o.serviceType === 'mesa').length,
    }
  }, [state.orders])

  const totalFiltered = useMemo(() => filtered.reduce((acc, o) => acc + (o.total || 0), 0), [filtered])

  const filterCounts = useMemo(() => {
    const base = state.orders.filter(o => !['finalizado', 'cancelado'].includes(o.status))
    const serviceFiltered = (() => {
      if (serviceTab === 'mostrador') return base.filter(o => o.serviceType === 'mostrador')
      if (serviceTab === 'domicilio') return base.filter(o => o.serviceType === 'domicilio')
      if (serviceTab === 'mesa') return base.filter(o => o.serviceType === 'mesa')
      return base
    })()
    return {
      todo: serviceFiltered.length,
      pendiente: serviceFiltered.filter(o => o.status === 'nuevo').length,
      encurso: serviceFiltered.filter(o => o.status === 'preparando').length,
      pdv_web: serviceFiltered.filter(o => ['mostrador', 'domicilio', 'menudigital'].includes(o.serviceType)).length,
      apps: serviceFiltered.filter(o => o.serviceType === 'menudigital').length,
    }
  }, [state.orders, serviceTab])

  // Mesas
  const activeSalon = state.salons.find(s => s.id === salonId) || state.salons[0] || null
  const tables = activeSalon ? state.tables.filter(t => t.salonId === activeSalon.id) : []
  const tableCounts = {
    libre: state.tables.filter(t => t.status === 'libre').length,
    ocupada: state.tables.filter(t => t.status === 'ocupada').length,
    cuenta: state.tables.filter(t => t.status === 'cuenta').length,
    pagada: state.tables.filter(t => t.status === 'pagada').length,
  }
  const selTableOrder = selectedTable?.orderId ? state.orders.find(o => o.id === selectedTable.orderId) : null

  const refreshOrders = async () => {
    setIsRefreshing(true)
    try { await refresh() } finally { setIsRefreshing(false) }
  }

  const doPay = (o) => {
    if (!can.pay) return
    setPayTarget(o)
  }

  const confirmPay = async ({ payment, cashReceived }) => {
    if (!payTarget) return
    const orderToFinalize = payTarget._finalizarDespues
    const orderId = payTarget.id
    const orderFolio = payTarget.folio

    const ok = await payOrder(orderId, { payment, cashReceived, user })
    if (ok) {
      toastOk(`Pedido #${orderFolio} cobrado`)
      setPayTarget(null)
      refresh()
      if (orderToFinalize) {
        toastOk(`Pedido #${orderFolio} finalizado`)
        refresh()
      }
    } else {
      toastErr('No se pudo cobrar el pedido')
    }
  }

  const confirmCancel = () => {
    if (!cancelTarget) return
    cancelOrder(cancelTarget.id, { reason: 'Cancelado desde pedidos', user })
    toastOk(`Pedido #${cancelTarget.folio} cancelado`)
    setCancelTarget(null)
    refresh()
  }

  const finalizarPedido = (o) => {
    if (!o.paid) {
      setPayTarget({ ...o, _finalizarDespues: true })
    } else {
      setOrderStatus(o.id, 'finalizado', { user })
      toastOk(`Pedido #${o.folio} finalizado`)
      refresh()
    }
  }

  const handleEstadoSelect = (o, action) => {
    if (action === 'cobrar') {
      doPay(o)
    } else if (action === 'cancelado') {
      setCancelTarget(o)
    } else if (action === 'finalizado') {
      finalizarPedido(o)
    } else {
      setOrderStatus(o.id, action, { user })
      toastOk(`Pedido #${o.folio} → ${ORDER_STATUS_LABEL[action]}`)
      refresh()
    }
  }

  const advanceStatus = (o) => {
    const flow = { nuevo: 'preparando', preparando: 'listo' }
    const next = flow[o.status]
    if (next) {
      setOrderStatus(o.id, next, { user })
      toastOk(`Pedido #${o.folio} → ${ORDER_STATUS_LABEL[next]}`)
      refresh()
    }
  }

  const elapsed = (createdAt) => {
    const start = new Date(createdAt).getTime()
    return Math.max(0, now.getTime() - start)
  }

  const fmtElapsed = (ms) => {
    if (ms >= 24 * 60 * 60 * 1000) return fmtAgo(new Date(Date.now() - ms).toISOString())
    return fmtDuration(ms)
  }

  const urgency = (createdAt) => {
    const ms = elapsed(createdAt)
    if (ms >= 60 * 60 * 1000) return 'critical'
    if (ms >= 30 * 60 * 1000) return 'danger'
    if (ms >= 15 * 60 * 1000) return 'warning'
    return 'normal'
  }

  // Mesas handlers
  const openForm = (type, mode, data = {}) => setForm({ type, mode, data })

  const submitForm = () => {
    if (!form) return
    if (form.type === 'salon') {
      const name = form.data.name.trim()
      if (!name) return toastWarn('Escribe el nombre del salón')
      if (form.mode === 'add') { addSalon(name); toastOk('Salón creado') }
      else { updateSalon(form.data.id, { name }); toastOk('Salón actualizado') }
    } else {
      const name = form.data.name.trim()
      if (!name) return toastWarn('Escribe el nombre de la mesa')
      const payload = { name, capacity: Number(form.data.capacity) || 4, salonId: form.data.salonId }
      if (form.mode === 'add') { addTable(payload); toastOk('Mesa agregada') }
      else { updateTable(form.data.id, payload); toastOk('Mesa actualizada') }
    }
    setForm(null)
    refresh()
  }

  const doDelete = () => {
    if (delConfirm.type === 'salon') {
      deleteSalon(delConfirm.id)
      toastOk(`Salón "${delConfirm.name}" eliminado`)
      if (activeSalon?.id === delConfirm.id) setSalonId(state.salons.find(s => s.id !== delConfirm.id)?.id || null)
    } else {
      deleteTable(delConfirm.id)
      toastOk('Mesa eliminada')
      if (selectedTable?.id === delConfirm.id) setSelectedTable(null)
    }
    setDelConfirm(null)
    refresh()
  }

  const changeTableStatus = (es) => {
    if (!selTableOrder || !selectedTable) return
    setOrderStatus(selTableOrder.id, es === 'ocupada' ? 'preparando' : es === 'cuenta' ? 'porcobrar' : 'finalizado', { user })
    updateTable(selectedTable.id, { status: es })
    refresh()
    toastOk(`Mesa → ${TABLE_STATUS_LABEL[es]}`)
  }

  const handlePickTable = (t) => {
    if (!selTableOrder) return
    if (selAction === 'move') { moveTable(selTableOrder.id, t.id); toastOk(`Pedido movido a ${t.name}`) }
    else { mergeTables(selectedTable.id, t.id); toastOk(`Cuenta de ${t.name} unida`) }
    setSelAction(null)
    setSelectedTable(null)
    refresh()
  }

  const moveOptions = state.tables.filter(t => t.id !== selectedTable?.id && t.status === 'libre')
  const mergeOptions = state.tables.filter(t => {
    if (t.id === selectedTable?.id || !t.orderId) return false
    const o = state.orders.find(x => x.id === t.orderId)
    return o && !o.paid && o.status !== 'cancelado'
  })

  return (
    <div className="space-y-5">
      {/* Cash closed alert */}
      {!isCajaAbierta && (
        <div className="flex items-center gap-4 rounded-xl border-2 border-warning bg-warning-soft p-5">
          <AlertTriangle size={24} className="text-warning-dark shrink-0" />
          <div className="flex-1">
            <div className="text-base font-bold text-warning-dark">Tu caja está cerrada y ya empezaste tu turno</div>
            <div className="text-sm text-warning-dark/80 mt-0.5">Para registrar pedidos y llevar control de ventas, es necesario abrir la caja</div>
          </div>
          <Button variant="outline" onClick={() => onNav('caja')} className="!border-warning !text-warning-dark hover:bg-warning/20 shrink-0 !px-4 !py-2 !text-sm">
            <Banknote size={16} className="mr-1.5" /> Abrir caja
          </Button>
        </div>
      )}

      {/* Service tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-card border border-line p-0.5 sm:p-1">
        {SERVICE_TABS.map(tab => {
          const Icon = tab.icon
          const count = tabCounts[tab.key] || 0
          const active = serviceTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setServiceTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-[11px] sm:text-[13px] font-bold transition-all duration-300 touch-target ${
                active ? 'text-white' : 'text-night'
              }`}
              style={{
                background: active ? 'rgb(var(--c-brand))' : 'transparent',
                boxShadow: active
                  ? '0 0 20px 2px rgb(var(--c-brand) / 0.35), 0 0 4px rgb(var(--c-brand) / 0.25)'
                  : '0 0 8px 0 rgb(var(--c-brand) / 0.06)',
              }}
            >
              <Icon size={14} className="sm:hidden" />
              <Icon size={16} className="hidden sm:block" />
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
              <Badge tone={active ? 'white' : 'night'} className={`text-[9px] sm:text-[10px] ${active ? '!bg-white/25 !text-white font-bold' : '!bg-line !text-night font-bold'}`}>{count}</Badge>
            </button>
          )
        })}
      </div>

      {/* MESAS VIEW */}
      {serviceTab === 'mesa' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={CheckCircle2} label="Libres" value={tableCounts.libre} tone="success" />
            <StatCard icon={Armchair} label="Ocupadas" value={tableCounts.ocupada} tone="amber" />
            <StatCard icon={Receipt} label="Cuenta" value={tableCounts.cuenta} tone="gold" />
            <StatCard icon={CreditCard} label="Pagadas" value={tableCounts.pagada} tone="night" />
          </div>

          {state.salons.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-5xl mb-3">🪑</div>
              <div className="text-lg font-bold text-night mb-1">Sin salones</div>
              <div className="text-sm text-muted mb-4">Crea tu primer salón para comenzar a dar de alta mesas.</div>
              <Button onClick={() => openForm('salon', 'add', { name: '' })}>
                <Plus size={16} className="mr-1.5" /> Crear salón
              </Button>
            </Card>
          ) : (
            <>
              {/* Salon tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {state.salons.map(s => {
                    const active = s.id === salonId
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSalonId(s.id)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${active ? 'bg-brand text-white' : 'bg-card border border-line text-night hover:bg-page'}`}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => openForm('salon', 'add', { name: '' })}
                    className="rounded-lg px-3 py-2 text-sm font-bold border border-dashed border-line text-muted hover:border-brand hover:text-brand transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => openForm('salon', 'edit', { id: activeSalon.id, name: activeSalon.name })}
                    className="w-9 h-9 grid place-items-center rounded-lg border border-line bg-card text-night hover:bg-page" title="Editar salón">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDelConfirm({ type: 'salon', id: activeSalon.id, name: activeSalon.name })}
                    className="w-9 h-9 grid place-items-center rounded-lg border border-line bg-card text-danger hover:bg-danger-soft" title="Eliminar salón">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Tables grid */}
              {tables.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-5xl mb-3">🪑</div>
                  <div className="text-lg font-bold text-night mb-1">Sin mesas en {activeSalon.name}</div>
                  <div className="text-sm text-muted mb-4">Agrega mesas a este salón.</div>
                  <Button onClick={() => openForm('table', 'add', { name: '', capacity: 4, salonId: activeSalon.id })}>
                    <Plus size={16} className="mr-1.5" /> Agregar mesa
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                  {tables.map(t => (
                    <MesaCard
                        key={t.id}
                        table={t}
                        order={state.orders.find(o => o.id === t.orderId)}
                        onClick={() => {
                          if (t.status === 'libre') {
                            updateTable(t.id, { status: 'ocupada' })
                          }
                          // Siempre abrir POS con la mesa (creará pedido si no tiene uno)
                          onNav('pos', { tableId: t.id, ...(t.orderId ? { orderId: t.orderId } : {}) })
                        }}
                      />
                  ))}
                  <button
                    onClick={() => openForm('table', 'add', { name: '', capacity: 4, salonId: activeSalon.id })}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line p-4 text-muted hover:border-brand hover:text-brand transition-colors min-h-[100px]"
                  >
                    <Plus size={28} />
                    <span className="text-xs font-bold mt-1">Nueva mesa</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ORDERS VIEW (mostrador / domicilio) */}
      {serviceTab !== 'mesa' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
          {/* Toolbar: filters + total + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {STATUS_FILTERS.map((f, i) => {
                const active = statusFilter === f.key
                const count = filterCounts[f.key] || 0
                const colors = [
                  { bg: '139 92 246', glow: 'rgba(139, 92, 246, 0.6)' },   // violet
                  { bg: '236 72 153', glow: 'rgba(236, 72, 153, 0.6)' },   // pink
                  { bg: '59 130 246', glow: 'rgba(59, 130, 246, 0.6)' },   // blue
                  { bg: '6 182 212', glow: 'rgba(6, 182, 212, 0.6)' },     // cyan
                  { bg: '16 185 129', glow: 'rgba(16, 185, 129, 0.6)' },   // emerald
                ]
                const c = colors[i % colors.length]
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`relative rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-[12px] font-bold transition-all duration-300 touch-target ${
                      active ? 'text-white' : 'text-muted hover:text-night'
                    }`}
                    style={{
                      background: active ? `rgb(${c.bg})` : 'transparent',
                      boxShadow: active
                        ? `0 0 20px 4px ${c.glow}, 0 0 8px 2px ${c.glow}, inset 0 0 12px rgba(255,255,255,0.15)`
                        : '0 0 6px 0 rgba(0,0,0,0.04)',
                      border: active ? 'none' : '1px solid rgb(var(--c-line))',
                      backdropFilter: active ? 'blur(8px)' : 'none',
                    }}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ background: `rgb(${c.bg})` }} />
                    )}
                    <span className="relative z-10">{f.label}{' '}
                      <span className={`ml-0.5 sm:ml-1 ${active ? 'text-white/80' : 'text-muted'}`}>({count})</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Search */}
              <div className="flex items-center bg-card border border-line rounded-lg h-7 sm:h-8 shadow-sm focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all overflow-hidden">
                <div className="flex items-center gap-1 sm:gap-1.5 pl-2 sm:pl-2.5 pr-1 flex-1">
                  <Search size={13} className="text-muted shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="border-none outline-none bg-transparent text-[12px] sm:text-[13px] text-night placeholder:text-muted w-24 sm:w-40 focus:w-36 sm:focus:w-56 transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="p-0.5 rounded text-muted hover:text-night hover:bg-page">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="w-px h-4 bg-line mx-0.5" />
                <button
                  onClick={refreshOrders}
                  disabled={isRefreshing}
                  className="p-1.5 text-muted hover:text-brand hover:bg-brand/5 rounded-r-lg transition-colors disabled:opacity-50"
                  title="Actualizar"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>

              {serviceTab === 'domicilio' && (
                <div className="text-right px-2 sm:px-3 hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-bold">Total</div>
                  <div className="text-lg font-mono font-extrabold text-night">{fmtMoney(totalFiltered)}</div>
                </div>
              )}
              <button
                onClick={() => onNav('pos')}
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg bg-brand text-white font-semibold text-[12px] sm:text-[13px] hover:bg-brand-dark active:bg-brand-dark transition flex items-center gap-1 sm:gap-1.5 shrink-0"
              >
                <Plus size={16} />
                <span>Nuevo pedido</span>
              </button>
            </div>
          </div>

          {/* Orders list */}
          <div className="flex-1 min-h-[200px] sm:min-h-[300px] flex flex-col rounded-2xl bg-card shadow-sm border border-line overflow-hidden lg:pb-0 pb-16">
            <div className="overflow-auto flex-1 min-h-0">
              <div className="divide-y divide-line">
                {filtered.map((o) => {
                  const isLive = ['nuevo','preparando','listo','porcobrar'].includes(o.status)
                  const elapsedMs = elapsed(o.createdAt)
                  const urg = urgency(o.createdAt)
                  const isPending = o.status === 'nuevo'
                  const canEditOrder = isLive && !o.paid
                  const ServiceIcon = SERVICE_ICON[o.serviceType] || Store

                  return (
                    <div key={o.id}
                      onClick={() => canEditOrder && onNav('pos', { orderId: o.id })}
                      className={`px-3 py-2 border-b border-line last:border-b-0 transition-colors hover:bg-page/50 ${canEditOrder ? 'cursor-pointer' : ''} ${!isLive ? 'opacity-40' : ''} relative`}>
                      {/* Row 1: Icon + Folio + Client + Total + Timer */}
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${o.serviceType === 'domicilio' ? 'bg-info-soft text-info-dark' : o.serviceType === 'mesa' ? 'bg-brand-soft text-brand-dark' : 'bg-page text-muted'}`}>
                          <ServiceIcon size={12} />
                        </div>
                        <span className="font-mono font-bold text-night text-xs">#{o.folio}</span>
                        <span className="text-xs text-night truncate flex-1 min-w-0">{o.client?.name || 'Sin cliente'}</span>
                        <span className="font-mono font-bold text-night text-xs shrink-0">{fmtMoney(o.total)}</span>
                        <span className="text-[10px] text-muted shrink-0 w-8 text-right">{fmtElapsed(elapsedMs)}</span>
                      </div>
                      {/* Row 2: Status + Actions */}
                      <div className="flex items-center gap-1.5 mt-1.5 pl-9">
                        <Badge tone={STATUS_TONE[o.status] || 'muted'} className="text-[9px]">{ORDER_STATUS_LABEL[o.status] || o.status}</Badge>
                        <div className="flex-1" />
                        {isPending && (
                          <button onClick={(e) => { e.stopPropagation(); advanceStatus(o) }}
                            className="p-1 text-success hover:bg-success-soft rounded transition" title="Aceptar">
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        {can.pay && !o.paid && !isPending && (
                          <button onClick={(e) => { e.stopPropagation(); doPay(o) }}
                            className="p-1 text-gold hover:bg-gold-soft rounded transition" title="Cobrar">
                            <Banknote size={13} />
                          </button>
                        )}
                        {can.cancel && isLive && !o.paid && (
                          <button onClick={(e) => { e.stopPropagation(); setCancelTarget(o) }}
                            className="p-1 text-danger hover:bg-danger-soft rounded transition" title="Cancelar">
                            <XCircle size={13} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setEstadoDropdown(estadoDropdown === o.id ? null : o.id) }}
                          className="p-1 text-brand hover:bg-brand-soft rounded transition" title="Estado">
                          <CircleDot size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setPrintMenuId(o.id) }} disabled={!can.print}
                          className="p-1 text-muted hover:bg-page rounded transition disabled:opacity-30" title="Imprimir">
                          <Printer size={13} />
                        </button>
                      </div>
                      {estadoDropdown === o.id && (
                        <div className="absolute right-2 top-full mt-1 z-[200]">
                          <EstadoDropdown order={o} onClose={() => setEstadoDropdown(null)}
                            onSelect={(action) => handleEstadoSelect(o, action)} />
                        </div>
                      )}
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="px-6 py-20 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-base font-semibold text-night mb-1">Sin pedidos en esta sección</div>
                    <div className="text-sm text-muted">Crea un nuevo pedido para comenzar</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}

      {/* Order detail */}
      <OrderDrawer order={state.orders.find((x) => x.id === selectedId) || null} state={state} user={user} refresh={refresh} open={!!selectedId} onClose={() => setSelectedId(null)} onPay={setPayTarget} onCancel={(o) => setCancelTarget(o)} canEdit={can.edit} canPay={can.pay} canPrint={can.print} />
      <PaymentDialog order={payTarget} open={!!payTarget} onClose={() => setPayTarget(null)} onPay={confirmPay} />
      <ConfirmDialog open={!!cancelTarget} title="Cancelar pedido" message={`¿Seguro que deseas cancelar el pedido #${cancelTarget?.folio}?`} confirmLabel="Cancelar pedido" danger onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
      <PrintMenu order={state.orders.find((x) => x.id === printMenuId) || null} state={state} open={!!printMenuId} onClose={() => setPrintMenuId(null)} />

      {/* Table detail modal */}
      <Modal open={!!selectedTable} onClose={() => setSelectedTable(null)} title={selectedTable ? selectedTable.name : ''} maxW="max-w-lg">
        {selectedTable && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="night">{activeSalon?.name}</Badge>
              <Badge tone={selectedTable.status === 'libre' ? 'success' : selectedTable.status === 'ocupada' ? 'amber' : selectedTable.status === 'cuenta' ? 'gold' : 'night'}>
                {TABLE_STATUS_LABEL[selectedTable.status]}
              </Badge>
              <span className="text-muted">👥 {selectedTable.capacity} pers.</span>
            </div>

            {selectedTable.status === 'libre' && (
              <div className="space-y-3">
                <p className="text-sm text-muted">Mesa libre. Abre un pedido para comenzar.</p>
                <Button className="w-full !py-3.5 text-base" onClick={() => { onNav('pos', { tableId: selectedTable.id }); setSelectedTable(null) }}>
                  Abrir pedido
                </Button>
              </div>
            )}

            {selectedTable.status !== 'libre' && !selTableOrder && (
              <div className="space-y-3">
                <div className="text-sm text-muted text-center py-4">Sin pedido activo vinculado.</div>
                <Button variant="dangerOutline" className="w-full" onClick={() => setFreeConfirm(true)}>Liberar mesa</Button>
              </div>
            )}

            {selectedTable.status !== 'libre' && selTableOrder && (
              <div className="space-y-4">
                <div className="bg-night text-white rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                    <Badge tone="white">{ORDER_STATUS_LABEL[selTableOrder.status]}</Badge>
                    <span className="text-white/50">#{selTableOrder.folio}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wide text-white/60">Total</span>
                    <span className="font-mono text-2xl font-extrabold">{fmtMoney(selTableOrder.total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => { onNav('pos', { tableId: selectedTable.id, orderId: selTableOrder.id }); setSelectedTable(null) }}>
                    <CirclePlus size={15} className="mr-1" /> Agregar
                  </Button>
                  {!selTableOrder.paid && (
                    <Button variant="gradient" onClick={() => { setPayTarget(selTableOrder); setSelectedTable(null) }}>
                      <Banknote size={15} className="mr-1" /> Cobrar
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelAction('move')}>
                    <Move size={15} className="mr-1" /> Mover
                  </Button>
                  {!selTableOrder.paid && (
                    <Button variant="outline" onClick={() => setSelAction('merge')}>
                      <Merge size={15} className="mr-1" /> Unir
                    </Button>
                  )}
                  <Button variant="dangerOutline" className="col-span-2" onClick={() => setFreeConfirm(true)}>
                    <Trash2 size={15} className="mr-1" /> Liberar mesa
                  </Button>
                </div>

                <div className="border-t border-line pt-3">
                  <div className="text-xs font-semibold text-muted mb-2">Cambiar estado</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['ocupada', 'cuenta', 'pagada'].map(es => (
                      <button key={es} onClick={() => changeTableStatus(es)}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold capitalize transition border ${selectedTable.status === es ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:bg-page'}`}>
                        {TABLE_STATUS_LABEL[es]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Move/merge modal */}
      <Modal open={!!selAction} onClose={() => setSelAction(null)} title={selAction === 'move' ? 'Cambiar a otra mesa' : 'Unir cuenta'} maxW="max-w-md">
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {(selAction === 'move' ? moveOptions : mergeOptions).length === 0 && (
            <div className="text-center text-muted text-sm py-8">
              {selAction === 'move' ? 'Todas las mesas están ocupadas.' : 'No hay otras cuentas abiertas.'}
            </div>
          )}
          {(selAction === 'move' ? moveOptions : mergeOptions).map(t => {
            const o = state.orders.find(x => x.id === t.orderId)
            return (
              <button key={t.id} onClick={() => handlePickTable(t)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line hover:border-brand hover:bg-brand-soft/40 transition text-left">
                <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-page font-bold text-night">{t.name.replace(/\D/g, '') || '🪑'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-night truncate">{t.name}</span>
                  <span className="block text-xs text-muted truncate">{o ? fmtMoney(o.total) : TABLE_STATUS_LABEL.libre}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Form modal (salon/table) */}
      <Modal open={!!form} onClose={() => setForm(null)} title={!form ? '' : form.mode === 'add' ? (form.type === 'salon' ? 'Nuevo salón' : 'Nueva mesa') : (form.type === 'salon' ? 'Editar salón' : 'Editar mesa')} maxW="max-w-sm">
        {form && (
          <div className="space-y-3">
            <Field label={form.type === 'salon' ? 'Nombre del salón' : 'Nombre de la mesa'}>
              <Input autoFocus value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} placeholder={form.type === 'salon' ? 'Ej. Salón principal' : 'Ej. Mesa 7'} />
            </Field>
            {form.type === 'table' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacidad">
                  <Input type="number" min="1" value={form.data.capacity} onChange={(e) => setForm({ ...form, data: { ...form.data, capacity: e.target.value } })} />
                </Field>
                <Field label="Salón">
                  <Select value={form.data.salonId} onChange={(e) => setForm({ ...form, data: { ...form.data, salonId: e.target.value } })}>
                    {state.salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setForm(null)}>Cancelar</Button>
              <Button variant="gradient" className="flex-1" onClick={submitForm}>{form.mode === 'add' ? 'Crear' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog open={!!delConfirm} danger
        title={delConfirm?.type === 'salon' ? 'Eliminar salón' : 'Eliminar mesa'}
        message={delConfirm?.type === 'salon' ? `¿Eliminar "${delConfirm?.name}"? Se borrarán también todas sus mesas.` : `¿Eliminar "${delConfirm?.name}"?`}
        confirmLabel="Eliminar" onConfirm={doDelete} onCancel={() => setDelConfirm(null)} />

      {/* Confirm free table */}
      <ConfirmDialog open={freeConfirm} danger title="Liberar mesa"
        message={selectedTable ? `¿Liberar ${selectedTable.name}? El pedido quedará desvinculado.` : ''}
        confirmLabel="Liberar"
        onConfirm={() => { freeTable(selectedTable.id); refresh(); setFreeConfirm(false); setSelectedTable(null); toastOk('Mesa liberada') }}
        onCancel={() => setFreeConfirm(false)} />
    </div>
  )
}
