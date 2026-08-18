import React, { useState } from 'react'
import { SlidersHorizontal, Plus, Pencil, Trash2, X, Package, Search, AlertCircle } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog,
  Toggle, EmptyState, PageHeader,
} from '../ui'
import { addModGroup, updateModGroup, deleteModGroup } from '../../lib/storage'
import { fmtMoney } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'

const TYPES = [
  { id: 'sabor', label: 'Sabor', tone: 'brand' },
  { id: 'extra', label: 'Extra', tone: 'gold' },
  { id: 'complemento', label: 'Complemento', tone: 'blue' },
  { id: 'tamano', label: 'Tamaño', tone: 'purple' },
  { id: 'ingrediente', label: 'Ingrediente', tone: 'emerald' },
  { id: 'termino', label: 'Término', tone: 'amber' },
]
const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[0]

const blankForm = () => ({
  name: '', type: 'sabor', required: false, min: '0', max: '4',
  surchargeOn: false, surchargePrice: '',
  defaultValue: '', freeCount: '0',
  items: [{ name: '', price: '', description: '' }],
  category: '',
  description: '',
  hasImage: false,
  image: '',
})

const formFrom = (g) => ({
  name: g.name || '', type: g.type || 'sabor', required: !!g.required,
  min: String(g.min ?? 0), max: String(g.max ?? 4),
  surchargeOn: !!g.surchargeSecond?.enabled, surchargePrice: g.surchargeSecond?.price ? String(g.surchargeSecond.price) : '',
  defaultValue: g.defaultValue || '', freeCount: String(g.freeCount ?? 0),
  items: (g.items || []).map((it) => ({ id: it.id, name: it.name || '', price: it.price ? String(it.price) : '', description: it.description || '' })),
  category: g.category || '',
  description: g.description || '',
  hasImage: !!g.image,
  image: g.image || '',
})

export default function Modificadores({ state, refresh, onNav }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankForm())
  const [delTarget, setDelTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const usersOf = (id) => state.products.filter((p) => (p.modGroupIds || []).includes(id))

  const filteredGroups = state.modGroups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || g.type === filterType
    return matchSearch && matchType
  })

  const openCreate = () => { setEditing(null); setForm(blankForm()); setOpen(true) }
  const openEdit = (g) => { setEditing(g); setForm(formFrom(g)); setOpen(true) }

  const setItem = (i, k, v) => set('items', form.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const addItem = () => set('items', [...form.items, { name: '', price: '', description: '' }])
  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i))

  const save = () => {
    const items = form.items
      .filter((it) => it.name.trim())
      .map((it) => ({ ...(it.id ? { id: it.id } : {}), name: it.name.trim(), price: Number(it.price) || 0, description: it.description?.trim() || '' }))
    if (!form.name.trim()) { toastErr('El nombre es obligatorio'); return }
    if (items.length === 0) { toastErr('Agrega al menos un item'); return }
    const min = Number(form.min) || 0
    const max = Number(form.max) || 0
    if (max > 0 && min > max) { toastErr('El mínimo no puede ser mayor que el máximo'); return }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      required: form.required,
      min, max,
      surchargeSecond: form.surchargeOn ? { enabled: true, price: Number(form.surchargePrice) || 0 } : null,
      defaultValue: form.defaultValue.trim(),
      freeCount: Number(form.freeCount) || 0,
      items,
      category: form.category.trim(),
      description: form.description.trim(),
      image: form.hasImage ? form.image : '',
    }
    try {
      if (editing) {
        updateModGroup(editing.id, payload)
        toastOk('Grupo actualizado')
      } else {
        addModGroup(payload)
        toastOk('Grupo creado')
      }
    } catch (e) { console.error('Error:', e); toastErr('Error') }
    setOpen(false)
    refresh()
  }

  const confirmDelete = () => {
    try {
      deleteModGroup(delTarget.id)
      setDelTarget(null)
      refresh()
      toastOk('Grupo eliminado')
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Modificadores"
        subtitle={`${state.modGroups.length} grupos de opciones configurables`}
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO GRUPO</Button>}
      />

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupo..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-card text-sm text-night focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-page rounded-lg p-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${filterType === 'all' ? 'bg-card text-brand shadow-sm' : 'text-muted hover:text-night'}`}
          >
            Todos
          </button>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${filterType === t.id ? 'bg-card text-brand shadow-sm' : 'text-muted hover:text-night'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon="⚙️"
            title="Sin grupos de modificadores"
            message="Crea sabores, tamaños, extras o complementos para personalizar tus productos."
            action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO GRUPO</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g) => {
            const t = typeOf(g.type)
            const users = usersOf(g.id)
            return (
              <Card key={g.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-night">{g.name}</h3>
                      <Badge tone={t.tone}>{t.label}</Badge>
                      {g.required && <Badge tone="success">Requerido</Badge>}
                      <Badge tone="white">Mín {g.min} · Máx {g.max}</Badge>
                      {g.freeCount > 0 && <Badge tone="blue">{g.freeCount} gratis</Badge>}
                      {g.defaultValue && <Badge tone="muted">Default: {g.defaultValue}</Badge>}
                      {g.surchargeSecond?.enabled && <Badge tone="gold">+{fmtMoney(g.surchargeSecond.price)}/extra</Badge>}
                    </div>
                    {g.description && <p className="text-xs text-muted mt-1">{g.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {g.items.map((it) => (
                        <span key={it.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-page text-xs font-medium text-night border border-line">
                          {it.name}
                          {Number(it.price) > 0 && <span className="font-mono text-muted">+{fmtMoney(it.price)}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(g)} title="Editar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand-soft transition">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDelTarget(g)} title="Eliminar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <button onClick={() => onNav('productos')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                      <Package size={12} /> {users.length} prod.
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de crear/editar */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar: ${editing.name}` : 'Nuevo grupo de modificadores'} maxW="max-w-2xl">
        <div className="space-y-5">
          {/* Nombre y tipo */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre del grupo *">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Elige tu salsa" />
              <p className="type-caption text-muted mt-1">Título que ve el cliente al personalizar. Ej. "¿Extra queso?"</p>
            </Field>
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
              <p className="type-caption text-muted mt-1">Clasificación visual del modificador.</p>
            </Field>
          </div>

          {/* Descripción */}
          <Field label="Descripción (opcional)">
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ej. Selecciona hasta 2 salsas para acompañar" />
            <p className="type-caption text-muted mt-1">Texto informativo que guía al cliente.</p>
          </Field>

          {/* Categoría */}
          <Field label="Categoría (opcional)">
            <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Ej. Salsas, Extras, Bebidas..." />
            <p className="type-caption text-muted mt-1">Agrupa visualmente el modificador. Opcional.</p>
          </Field>

          {/* Requerido y límites */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <Toggle checked={form.required} onChange={(v) => set('required', v)} label="Requerido" />
              <p className="type-caption text-muted mt-1">El cliente debe elegir al menos una opción.</p>
            </div>
            <Field label="Mínimo">
              <Input type="number" min="0" value={form.min} onChange={(e) => set('min', e.target.value)} />
              <p className="type-caption text-muted mt-1">Mínimo de opciones que debe escoger. 0 = sin límite inferior.</p>
            </Field>
            <Field label="Máximo">
              <Input type="number" min="1" value={form.max} onChange={(e) => set('max', e.target.value)} />
              <p className="type-caption text-muted mt-1">Máximo de opciones permitidas.</p>
            </Field>
          </div>

          {/* Valor por defecto y gratis */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Seleccionado por defecto">
              <Select value={form.defaultValue} onChange={(e) => set('defaultValue', e.target.value)}>
                <option value="">Ninguno</option>
                {form.items.filter((it) => it.name.trim()).map((it, i) => (
                  <option key={it.id || i} value={it.name.trim()}>{it.name.trim()}{Number(it.price) > 0 ? ` (+${fmtMoney(Number(it.price))})` : ''}</option>
                ))}
              </Select>
              <p className="type-caption text-muted mt-1">Opción que viene preseleccionada.</p>
            </Field>
            <Field label="Primeras gratis">
              <Input type="number" min="0" value={form.freeCount} onChange={(e) => set('freeCount', e.target.value)} placeholder="0" />
              <p className="type-caption text-muted mt-1">Cuántas opciones no cuestan extra.</p>
            </Field>
          </div>

          {/* Recargo por segundo elemento */}
          <div className="rounded-xl border border-line bg-page p-4 space-y-3">
            <div className="flex flex-col">
              <Toggle checked={form.surchargeOn} onChange={(v) => set('surchargeOn', v)} label="Recargo por selecciones adicionales" />
              <p className="type-caption text-muted mt-1">Aplica un cargo extra al elegir más allá de las primeras gratis.</p>
            </div>
            {form.surchargeOn && (
              <Field label="Precio del recargo">
                <Input type="number" min="0" step="0.01" value={form.surchargePrice} onChange={(e) => set('surchargePrice', e.target.value)} placeholder="0.00" />
                <p className="type-caption text-muted mt-1">Cargo en pesos por cada opción adicional.</p>
              </Field>
            )}
          </div>

          {/* Items del modificador */}
          <div className="rounded-xl border border-line bg-page p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-night text-sm">Opciones ({form.items.length})</span>
              <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={addItem}>
                <Plus size={14} className="mr-1" /> Agregar opción
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex items-start gap-2 bg-card p-3 rounded-xl border border-line">
                  <div className="flex-1 space-y-2">
                    <Field label="Nombre de la opción *">
                      <Input value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} placeholder="Ej. BBQ, Picante, Sin jitomate..." className="!py-2 !text-sm" />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Precio extra">
                        <Input type="number" min="0" step="0.01" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} placeholder="0.00" className="!py-2 !text-sm" />
                        <p className="type-caption text-muted mt-1">0 si es gratis.</p>
                      </Field>
                      <Field label="Descripción (opcional)">
                        <Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Detalle..." className="!py-2 !text-sm" />
                      </Field>
                    </div>
                  </div>
                  <button onClick={() => removeItem(i)} title="Quitar" className="touch-icon p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {form.items.length === 0 && (
              <div className="text-center py-6 text-muted text-sm">
                <AlertCircle size={24} className="mx-auto mb-2" />
                Agrega al menos una opción para este grupo
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}><SlidersHorizontal size={16} className="mr-1" /> {editing ? 'Guardar cambios' : 'Crear grupo'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        danger
        title={`¿Eliminar ${delTarget?.name}?`}
        message={`Se quitará de ${usersOf(delTarget?.id).length || 0} producto${usersOf(delTarget?.id).length === 1 ? '' : 's'} que lo usan.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
