import React, { useState, useMemo } from 'react'
import {
  Boxes, Plus, SlidersHorizontal, Recycle, History, Pencil, Trash2,
  Package, AlertTriangle, Wallet, Flame, ArrowUpRight,
} from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog,
  Tabs, SearchInput, EmptyState, PageHeader, StatCard,
} from '../ui'
import { addInventoryItem, updateInventoryItem, deleteInventoryItem, addMovement } from '../../lib/storage'
import { inventoryLow } from '../../lib/stats'
import { fmtMoney, fmtDate, fmtDateTime, fmtNum } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'

const MOV_TYPES = {
  entrada: { label: 'Entrada', tone: 'success', sign: '+' },
  salida: { label: 'Salida', tone: 'danger', sign: '−' },
  ajuste: { label: 'Ajuste', tone: 'blue', sign: '=' },
  merma: { label: 'Merma', tone: 'amber', sign: '−' },
}

const blankItem = () => ({ name: '', unit: 'pieza', stock: '0', minStock: '0', cost: '', category: '' })

const itemFrom = (i) => ({
  name: i.name || '', unit: i.unit || 'pieza', stock: String(i.stock ?? 0),
  minStock: String(i.minStock ?? 0), cost: i.cost ? String(i.cost) : '', category: i.category || '',
})

export default function Inventario({ state, refresh, onNav, user }) {
  const [tab, setTab] = useState('existencias')
  const [search, setSearch] = useState('')
  const [itemOpen, setItemOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [itemForm, setItemForm] = useState(blankItem())
  const [mov, setMov] = useState(null)
  const [mform, setMform] = useState({ qty: '', cost: '', note: '' })
  const [hist, setHist] = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [movFilter, setMovFilter] = useState('')

  const setItem = (k, v) => setItemForm((f) => ({ ...f, [k]: v }))
  const setM = (k, v) => setMform((f) => ({ ...f, [k]: v }))

  const low = useMemo(() => inventoryLow(state), [state])
  const invValue = useMemo(() => state.inventoryItems.reduce((a, i) => a + (Number(i.stock) || 0) * (Number(i.cost) || 0), 0), [state])

  const monthMermas = useMemo(() => {
    const now = new Date()
    return state.inventoryMovements.filter((m) => m.type === 'merma' && m.date &&
      new Date(m.date).getMonth() === now.getMonth() && new Date(m.date).getFullYear() === now.getFullYear())
  }, [state])
  const mermaValue = monthMermas.reduce((a, m) => a + (Number(m.qty) || 0) * (Number(m.cost) || 0), 0)

  const itemOf = (id) => state.inventoryItems.find((i) => i.id === id)
  const itemState = (i) => {
    if (i.stock <= 0) return { label: 'Agotado', tone: 'danger' }
    if (i.stock <= i.minStock) return { label: 'Bajo', tone: 'danger' }
    return { label: 'Normal', tone: 'success' }
  }

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return state.inventoryItems.slice()
      .filter((i) => !q || `${i.name} ${i.category}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [state, search])

  const movements = useMemo(() => state.inventoryMovements.slice()
    .filter((m) => !movFilter || m.type === movFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [state, movFilter])

  const openCreate = () => { setEditing(null); setItemForm(blankItem()); setItemOpen(true) }
  const openEdit = (i) => { setEditing(i); setItemForm(itemFrom(i)); setItemOpen(true) }

  const saveItem = () => {
    if (!itemForm.name.trim()) { toastErr('El nombre es obligatorio'); return }
    const payload = {
      name: itemForm.name.trim(),
      unit: itemForm.unit.trim() || 'pieza',
      stock: Number(itemForm.stock) || 0,
      minStock: Number(itemForm.minStock) || 0,
      cost: Number(itemForm.cost) || 0,
      category: itemForm.category.trim(),
    }
    if (editing) {
      updateInventoryItem(editing.id, payload)
      toastOk('Ingrediente actualizado')
    } else {
      addInventoryItem(payload)
      toastOk('Ingrediente creado')
    }
    setItemOpen(false)
    refresh()
  }

  const openMov = (mode, item) => {
    setMform({ qty: '', cost: mode === 'entrada' ? (item.cost ? String(item.cost) : '') : '', note: '' })
    setMov({ mode, item })
  }

  const submitMove = () => {
    const item = mov.item
    const qty = Number(mform.qty)
    if (mov.mode !== 'ajuste' && (!qty || qty <= 0)) { toastErr('Cantidad inválida'); return }
    if (mov.mode === 'ajuste' && !mform.qty) { toastErr('Indica el nuevo stock'); return }
    addMovement({
      itemId: item.id,
      type: mov.mode,
      qty,
      cost: mov.mode === 'entrada' ? (Number(mform.cost) || item.cost) : item.cost,
      note: mform.note.trim(),
      user,
    })
    setMov(null)
    refresh()
    toastOk(`Movimiento registrado (${MOV_TYPES[mov.mode].label})`)
  }

  const confirmDelete = () => {
    deleteInventoryItem(delTarget.id)
    setDelTarget(null)
    refresh()
    toastOk('Ingrediente eliminado')
  }

  const movQty = (m) => {
    const t = MOV_TYPES[m.type]
    if (m.type === 'ajuste') return `${t.sign} ${fmtNum(m.qty)}`
    return `${t.sign}${fmtNum(m.qty)}`
  }
  const movQtyCls = (m) => (m.type === 'entrada' ? 'text-brand' : m.type === 'ajuste' ? 'text-sky-600' : 'text-danger')

  const actionBtn = (title, cls, onClick, Icon) => (
    <button key={title} title={title} onClick={onClick} className={`p-1.5 rounded-lg text-muted hover:text-white hover:bg-brand transition ${cls}`}>
      <Icon size={14} />
    </button>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        subtitle="Control de ingredientes y movimientos de almacén"
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO INGREDIENTE</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Ingredientes" value={fmtNum(state.inventoryItems.length)} sub="Registrados en almacén" tone="brand" />
        <StatCard icon={AlertTriangle} label="Stock bajo" value={fmtNum(low.length)} sub="Por debajo del mínimo" tone="danger" />
        <StatCard icon={Wallet} label="Valor inventario" value={fmtMoney(invValue)} sub="Stock × costo unitario" tone="gold" />
        <StatCard icon={Flame} label="Mermas del mes" value={fmtMoney(mermaValue)} sub={`${monthMermas.length} movimientos`} tone="amber" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs items={[{ id: 'existencias', label: `Existencias (${state.inventoryItems.length})` }, { id: 'movimientos', label: `Movimientos (${state.inventoryMovements.length})` }]} value={tab} onChange={setTab} />
      </div>

      {tab === 'existencias' ? (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-line">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar ingrediente o categoría…" className="w-full sm:w-72" />
          </div>
          {items.length === 0 ? (
            <EmptyState icon="📦" title="Sin ingredientes" message="Agrega ingredientes para controlar tu almacén." action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO INGREDIENTE</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                    <th className="px-4 py-3">Ingrediente</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Mínimo</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3">Últ. entrada</th>
                    <th className="px-4 py-3">Últ. salida</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const st = itemState(i)
                    return (
                      <tr key={i.id} className={`border-b border-line/60 last:border-0 hover:bg-page/60 ${i.stock <= i.minStock ? 'bg-danger/5' : ''}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-night">{i.name}</div>
                          <div className="text-[11px] text-muted">{i.category || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-night">{fmtNum(i.stock)} <span className="text-[11px] text-muted font-normal">{i.unit}</span></td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted">{fmtNum(i.minStock)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{fmtMoney(i.cost)}</td>
                        <td className="px-4 py-2.5 text-[11px] text-muted">{i.lastIn ? fmtDate(i.lastIn) : '—'}</td>
                        <td className="px-4 py-2.5 text-[11px] text-muted">{i.lastOut ? fmtDate(i.lastOut) : '—'}</td>
                        <td className="px-4 py-2.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-0.5">
                            {actionBtn('Entrada', 'hover:bg-brand', () => openMov('entrada', i), PackagePlus)}
                            {actionBtn('Salida', 'hover:bg-danger', () => openMov('salida', i), PackageMinus)}
                            {actionBtn('Ajustar', 'hover:bg-sky-600', () => openMov('ajuste', i), SlidersHorizontal)}
                            {actionBtn('Merma', 'hover:bg-warning', () => openMov('merma', i), Recycle)}
                            {actionBtn('Historial', 'hover:bg-night', () => setHist(i), History)}
                            {actionBtn('Editar', 'hover:bg-brand-dark', () => openEdit(i), Pencil)}
                            {actionBtn('Eliminar', 'hover:bg-danger', () => setDelTarget(i), Trash2)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-line flex flex-wrap gap-2">
            <Select value={movFilter} onChange={(e) => setMovFilter(e.target.value)} className="w-full sm:w-44">
              <option value="">Todos los tipos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
              <option value="ajuste">Ajustes</option>
              <option value="merma">Mermas</option>
            </Select>
            <span className="text-xs text-muted self-center ml-auto">{movements.length} movimientos</span>
          </div>
          {movements.length === 0 ? (
            <EmptyState icon="🧾" title="Sin movimientos" message="Registra entradas, salidas, ajustes o mermas desde Existencias." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Ingrediente</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const it = itemOf(m.itemId)
                    return (
                      <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-page/60">
                        <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">{fmtDateTime(m.date)}</td>
                        <td className="px-4 py-2.5 font-semibold text-night">{it?.name || 'Eliminado'}</td>
                        <td className="px-4 py-2.5"><Badge tone={MOV_TYPES[m.type]?.tone}>{MOV_TYPES[m.type]?.label || m.type}</Badge></td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${movQtyCls(m)}`}>{movQty(m)} <span className="text-[11px] text-muted font-normal">{it?.unit || ''}</span></td>
                        <td className="px-4 py-2.5 text-right font-mono">{fmtMoney(m.cost)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted">{m.user}</td>
                        <td className="px-4 py-2.5 text-xs text-muted max-w-40 truncate" title={m.note}>{m.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={itemOpen} onClose={() => setItemOpen(false)} title={editing ? `Editar: ${editing.name}` : 'Nuevo ingrediente'}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre *">
              <Input value={itemForm.name} onChange={(e) => setItem('name', e.target.value)} placeholder="Ej. Alitas de pollo" />
            </Field>
            <Field label="Unidad">
              <Input value={itemForm.unit} onChange={(e) => setItem('unit', e.target.value)} placeholder="pieza / kg / ml / g" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock">
              <Input type="number" value={itemForm.stock} onChange={(e) => setItem('stock', e.target.value)} />
            </Field>
            <Field label="Stock mínimo">
              <Input type="number" value={itemForm.minStock} onChange={(e) => setItem('minStock', e.target.value)} />
            </Field>
            <Field label="Costo unitario">
              <Input type="number" value={itemForm.cost} onChange={(e) => setItem('cost', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Categoría">
            <Input value={itemForm.category} onChange={(e) => setItem('category', e.target.value)} placeholder="Ej. Carnes, Verduras…" />
          </Field>
          <div className="flex gap-2 justify-end border-t border-line pt-3">
            <Button variant="ghost" onClick={() => setItemOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem}><Boxes size={16} className="mr-1" /> {editing ? 'Guardar cambios' : 'Crear ingrediente'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!mov} onClose={() => setMov(null)} title={`${MOV_TYPES[mov?.mode]?.label} · ${mov?.item?.name || ''}`}>
        <div className="space-y-3">
          {mov?.mode === 'entrada' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad">
                <Input type="number" value={mform.qty} onChange={(e) => setM('qty', e.target.value)} placeholder="0" autoFocus />
              </Field>
              <Field label="Costo unitario">
                <Input type="number" value={mform.cost} onChange={(e) => setM('cost', e.target.value)} placeholder="0.00" />
              </Field>
            </div>
          )}
          {mov?.mode === 'salida' && (
            <Field label="Cantidad">
              <Input type="number" value={mform.qty} onChange={(e) => setM('qty', e.target.value)} placeholder="0" autoFocus />
            </Field>
          )}
          {mov?.mode === 'merma' && (
            <Field label="Cantidad">
              <Input type="number" value={mform.qty} onChange={(e) => setM('qty', e.target.value)} placeholder="0" autoFocus />
            </Field>
          )}
          {mov?.mode === 'ajuste' && (
            <Field label={`Nuevo stock (actual: ${fmtNum(mov?.item?.stock || 0)} ${mov?.item?.unit || ''})`}>
              <Input type="number" value={mform.qty} onChange={(e) => setM('qty', e.target.value)} placeholder="0" autoFocus />
            </Field>
          )}
          <Field label="Nota (opcional)">
            <Input value={mform.note} onChange={(e) => setM('note', e.target.value)} placeholder="Ej. Compra semanal, merma por caducidad…" />
          </Field>
          <div className="flex gap-2 justify-end border-t border-line pt-3">
            <Button variant="ghost" onClick={() => setMov(null)}>Cancelar</Button>
            <Button onClick={submitMove}><ArrowUpRight size={16} className="mr-1" /> Registrar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!hist} onClose={() => setHist(null)} title={`Historial · ${hist?.name || ''}`} maxW="max-w-xl">
        {hist && (() => {
          const list = state.inventoryMovements.filter((m) => m.itemId === hist.id).sort((a, b) => new Date(b.date) - new Date(a.date))
          if (list.length === 0) return <EmptyState icon="🧾" title="Sin movimientos" message="Este ingrediente no tiene movimientos registrados." />
          return (
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {list.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                  <Badge tone={MOV_TYPES[m.type]?.tone}>{MOV_TYPES[m.type]?.label || m.type}</Badge>
                  <span className={`font-mono font-bold ${movQtyCls(m)}`}>{movQty(m)} {hist.unit}</span>
                  <span className="text-xs text-muted ml-auto font-mono">{fmtMoney(m.cost)}</span>
                  <div className="text-right">
                    <div className="text-[11px] text-muted">{fmtDateTime(m.date)}</div>
                    <div className="text-[11px] text-muted">{m.user}{m.note ? ` · ${m.note}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        danger
        title={`¿Eliminar ${delTarget?.name}?`}
        message="Se eliminará el ingrediente y todo su historial de movimientos. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
