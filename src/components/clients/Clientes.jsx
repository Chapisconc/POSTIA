import React, { useMemo, useState } from 'react'
import {
  Users, UserPlus, Eye, Pencil, Trash2, Phone, MapPin, StickyNote,
  Wallet, Receipt, ArrowRight, ChevronRight,
} from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Textarea, Modal, ConfirmDialog,
  SearchInput, EmptyState, PageHeader, StatCard,
} from '../ui'
import { OrderStatusBadge } from '../shared/StatusBadge'
import { fmtMoney, fmtDateTime, fmtAgo } from '../../lib/format'
import { toast, toastOk } from '../../lib/notify'
import { addClient, updateClient, deleteClient } from '../../lib/storage'
import { clientStatsAll } from '../../lib/stats'
import { fuzzyMatch } from '../../lib/search'

const emptyForm = { name: '', phone: '', address: '', notes: '' }

export default function Clientes({ state, refresh, onNav }) {
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [focusField, setFocusField] = useState('name')
  const [form, setForm] = useState(emptyForm)
  const [viewId, setViewId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const stats = useMemo(() => clientStatsAll(state), [state])
  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return stats
    return stats.filter((c) =>
      [c.name, c.phone, c.address, c.notes].some((x) => fuzzyMatch(q, String(x || '')))
    )
  }, [stats, query])

  const totalSpent = stats.reduce((a, c) => a + c.totalSpent, 0)
  const totalOrders = stats.reduce((a, c) => a + c.ordersCount, 0)
  const activeCount = stats.filter((c) => c.ordersCount > 0).length
  const avgAll = totalOrders ? totalSpent / totalOrders : 0

  const viewed = viewId ? state.clients.find((c) => c.id === viewId) : null
  const viewStats = viewed ? stats.find((c) => c.id === viewId) : null
  const viewOrders = useMemo(
    () => (viewed ? state.orders.filter((o) => o.client?.id === viewed.id).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []),
    [state, viewed]
  )

  const openForm = (client = null, focus = 'name') => {
    setEditing(client)
    setForm(client ? { name: client.name, phone: client.phone || '', address: client.address || '', notes: client.notes || '' } : emptyForm)
    setFocusField(focus)
    setFormOpen(true)
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) { toast('El nombre es obligatorio', 'error'); return }
    const payload = { name, phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() }
    if (editing) {
      updateClient(editing.id, payload)
      toastOk('Cliente actualizado')
    } else {
      addClient(payload)
      toastOk('Cliente creado')
    }
    refresh()
    setFormOpen(false)
    setEditing(null)
  }

  const confirmDelete = () => {
    deleteClient(deleting.id)
    refresh()
    toastOk('Cliente eliminado')
    setDeleting(null)
    if (viewId === deleting.id) setViewId(null)
  }

  const openOrder = (o) => {
    setViewId(null)
    onNav('pedidos', { orderId: o.id })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle={query ? `${filtered.length} de ${stats.length} clientes` : `${stats.length} clientes · ${activeCount} con compras`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente…" className="w-64" />
            <Button onClick={() => openForm()}><UserPlus size={16} className="mr-1" /> Nuevo cliente</Button>
          </>
        }
      />

      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Clientes" value={stats.length} sub={`${activeCount} con pedidos`} tone="blue" />
          <StatCard icon={Receipt} label="Pedidos" value={totalOrders} sub="Total registrados" tone="brand" />
          <StatCard icon={Wallet} label="Total gastado" value={fmtMoney(totalSpent)} sub="Suma de compras pagadas" tone="gold" />
          <StatCard icon={ChevronRight} label="Ticket promedio" value={fmtMoney(avgAll)} sub="Por pedido" tone="purple" />
        </div>
      )}

      {stats.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon="👥"
            title="Aún no hay clientes"
            message="Registra tu primer cliente para guardar su historial de compras."
            action={<Button onClick={() => openForm()}><UserPlus size={16} className="mr-1" /> Nuevo cliente</Button>}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🔍" title="Sin resultados" message={`No hay clientes que coincidan con «${query}».`} />
        </Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Teléfono</th>
                    <th className="px-4 py-3 font-semibold">Dirección</th>
                    <th className="px-4 py-3 font-semibold text-center">Pedidos</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                    <th className="px-4 py-3 font-semibold text-right">Ticket prom.</th>
                    <th className="px-4 py-3 font-semibold">Última compra</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-line/50 last:border-0 hover:bg-page transition">
                      <td className="px-4 py-3">
                        <button onClick={() => setViewId(c.id)} className="flex items-center gap-3 text-left group">
                          <span className="w-9 h-9 rounded-full bg-brand-soft text-brand-dark grid place-items-center font-bold text-sm shrink-0">
                            {c.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-semibold text-night group-hover:text-brand transition">{c.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-muted max-w-[180px] truncate">{c.address || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={c.ordersCount > 0 ? 'brand' : 'muted'}>{c.ordersCount}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-night text-right">{fmtMoney(c.totalSpent)}</td>
                      <td className="px-4 py-3 font-mono text-muted text-right">{fmtMoney(c.avgTicket)}</td>
                      <td className="px-4 py-3 text-muted">{fmtAgo(c.lastOrder)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setViewId(c.id)} title="Ver" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-brand transition"><Eye size={16} /></button>
                          <button onClick={() => openForm(c)} title="Editar" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-gold transition"><Pencil size={16} /></button>
                          <button onClick={() => setDeleting(c)} title="Eliminar" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-danger transition"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-3 lg:hidden">
            {filtered.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-full bg-brand-soft text-brand-dark grid place-items-center font-bold shrink-0">{c.name.slice(0, 1).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setViewId(c.id)} className="font-bold text-night truncate hover:text-brand transition">{c.name}</button>
                    <div className="text-xs text-muted flex items-center gap-1"><Phone size={11} /> {c.phone || 'Sin teléfono'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-night text-sm">{fmtMoney(c.totalSpent)}</div>
                    <div className="text-[10px] text-muted">{c.ordersCount} pedidos</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-page rounded-lg p-2 text-muted">
                    <div className="text-[10px] uppercase mb-0.5">Ticket prom.</div>
                    <div className="font-mono text-night font-semibold">{fmtMoney(c.avgTicket)}</div>
                  </div>
                  <div className="bg-page rounded-lg p-2 text-muted">
                    <div className="text-[10px] uppercase mb-0.5">Última compra</div>
                    <div className="text-night font-semibold">{fmtAgo(c.lastOrder)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs" onClick={() => setViewId(c.id)}><Eye size={14} className="mr-1" /> Ver</Button>
                  <Button variant="ghost" className="flex-1 text-xs" onClick={() => openForm(c)}><Pencil size={14} className="mr-1" /> Editar</Button>
                  <Button variant="ghost" className="text-xs" onClick={() => setDeleting(c)}><Trash2 size={14} className="text-danger" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null) }} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <div className="space-y-3">
          <Field label="Nombre *">
            <Input
              value={form.name}
              autoFocus={focusField === 'name'}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.phone}
              autoFocus={focusField === 'phone'}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ej. 33 1234 5678"
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={form.address}
              autoFocus={focusField === 'address'}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Calle, número, colonia…"
            />
          </Field>
          <Field label="Notas">
            <Textarea
              value={form.notes}
              autoFocus={focusField === 'notes'}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas, preferencias, referencias…"
              rows={3}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setFormOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewed} onClose={() => setViewId(null)} title={viewed ? viewed.name : ''} maxW="max-w-2xl">
        {viewed && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand"><Users size={12} /> {viewStats ? viewStats.ordersCount : 0} pedidos</Badge>
              <Badge tone="gold">Total {fmtMoney(viewStats ? viewStats.totalSpent : 0)}</Badge>
              {viewStats?.lastOrder && <Badge tone="blue">Última compra {fmtAgo(viewStats.lastOrder)}</Badge>}
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {viewed.phone && (
                <div className="flex items-center gap-2 bg-page rounded-xl px-3 py-2 text-sm">
                  <Phone size={15} className="text-brand shrink-0" />
                  <span className="text-night font-medium">{viewed.phone}</span>
                </div>
              )}
              {viewed.address && (
                <div className="flex items-center gap-2 bg-page rounded-xl px-3 py-2 text-sm">
                  <MapPin size={15} className="text-brand shrink-0" />
                  <span className="text-night font-medium">{viewed.address}</span>
                </div>
              )}
            </div>

            {viewed.notes && (
              <div className="flex gap-2 bg-gold-soft rounded-xl px-3 py-2 text-sm">
                <StickyNote size={15} className="text-gold shrink-0 mt-0.5" />
                <span className="text-night">{viewed.notes}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-night text-sm">Historial de pedidos</h4>
                <Badge tone="muted">{viewOrders.length}</Badge>
              </div>
              {viewOrders.length === 0 ? (
                <div className="text-center py-6 bg-page rounded-xl">
                  <div className="text-2xl mb-1">🧾</div>
                  <p className="text-sm text-muted">Sin pedidos todavía. Las compras de este cliente aparecerán aquí.</p>
                </div>
              ) : (
                <div className="divide-y divide-line/60 border border-line rounded-xl overflow-hidden">
                  {viewOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => openOrder(o)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-page transition text-left"
                    >
                      <span className="font-mono font-bold text-brand text-sm">#{o.folio}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted">{fmtDateTime(o.createdAt)}</div>
                        <div className="text-[11px] text-muted truncate">
                          {o.items ? o.items.reduce((a, i) => a + i.qty, 0) : 0} artículos
                        </div>
                      </div>
                      <OrderStatusBadge status={o.status} />
                      <span className="font-mono font-bold text-night text-sm w-24 text-right">{fmtMoney(o.total)}</span>
                      <ArrowRight size={14} className="text-muted shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="dark" onClick={() => openForm(viewed)}><Pencil size={15} className="mr-1" /> Editar</Button>
              <Button variant="outline" onClick={() => openForm(viewed, 'address')}><MapPin size={15} className="mr-1" /> Agregar dirección</Button>
              <Button variant="outline" onClick={() => openForm(viewed, 'notes')}><StickyNote size={15} className="mr-1" /> Agregar nota</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar cliente"
        message={deleting ? `¿Eliminar a «${deleting.name}»? Se conservarán sus pedidos, pero perderá el perfil del cliente.` : ''}
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
