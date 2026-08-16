import React, { useState, useMemo } from 'react'
import { Tags, Plus, Pencil, Trash2, Star, Package } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Modal, ConfirmDialog,
  Toggle, EmptyState, PageHeader,
} from '../ui'
import { addCategory, updateCategory, deleteCategory } from '../../lib/storage'
import { toast, toastOk, toastErr } from '../../lib/notify'

const EMOJIS = [
  '🔥', '🍗', '🍖', '🍔', '🍕', '🥗', '🍟', '🌮', '🌯', '🍜', '🍝', '🦐',
  '🥤', '🍺', '🍋', '💧', '🍰', '🍫', '🌽', '🧅', '🍎', '🥑', '🥩', '☕',
]

const blankForm = () => ({ name: '', emoji: '🍽️', featured: false })

const formFrom = (c) => ({ name: c.name || '', emoji: c.emoji || '🍽️', featured: !!c.featured })

export default function Categorias({ state, refresh, onNav }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankForm())
  const [delTarget, setDelTarget] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const categories = useMemo(() => state.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0)), [state])
  const countOf = (id) => state.products.filter((p) => p.categoryId === id).length

  const openCreate = () => { setEditing(null); setForm(blankForm()); setOpen(true) }
  const openEdit = (c) => { setEditing(c); setForm(formFrom(c)); setOpen(true) }

  const save = () => {
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'error'); return }
    const payload = { name: form.name.trim(), emoji: form.emoji, featured: form.featured }
    try {
      if (editing) {
        updateCategory(editing.id, payload)
        toastOk('Categoría actualizada')
      } else {
        addCategory(payload)
        toastOk('Categoría creada')
      }
    } catch (e) { console.error('Error:', e); toastErr('Error') }
    setOpen(false)
    refresh()
  }

  const toggleFeat = (c) => {
    try {
      updateCategory(c.id, { featured: !c.featured })
      refresh()
      toastOk(c.featured ? `${c.name} ya no es destacada` : `${c.name} destacada`)
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const confirmDelete = () => {
    try {
      deleteCategory(delTarget.id)
      setDelTarget(null)
      refresh()
      toastOk('Categoría eliminada')
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías"
        subtitle={`${categories.length} categorías en el menú`}
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVA CATEGORÍA</Button>}
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState icon="🏷️" title="Sin categorías" message="Agrupa tus productos para tener un menú más ordenado." action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVA CATEGORÍA</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Card key={c.id} className="p-4 flex items-center gap-3">
              <span className="w-11 h-11 shrink-0 grid place-items-center rounded-xl bg-page text-2xl">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-night truncate flex items-center gap-1.5">
                  {c.name}
                  {c.featured && <Star size={13} className="text-gold shrink-0" fill="currentColor" />}
                </div>
                <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <Package size={11} /> {countOf(c.id)} productos
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Toggle checked={c.featured} onChange={() => toggleFeat(c)} />
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} title="Editar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand-soft transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDelTarget(c)} title="Eliminar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar: ${editing.name}` : 'Nueva categoría'}>
        <div className="space-y-4">
          <Field label="Nombre *">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Alitas" />
          </Field>
          <Field label="Emoji">
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => set('emoji', e)}
                  className={`w-8 h-8 grid place-items-center rounded-lg text-lg transition ${form.emoji === e ? 'bg-brand-soft ring-2 ring-brand' : 'bg-page hover:bg-line'}`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Toggle checked={form.featured} onChange={(v) => set('featured', v)} label="Categoría destacada (aparece primero en el menú)" />
          <div className="flex gap-2 justify-end border-t border-line pt-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}><Tags size={16} className="mr-1" /> {editing ? 'Guardar cambios' : 'Crear categoría'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        danger
        title={`¿Eliminar ${delTarget?.name}?`}
        message={`${countOf(delTarget?.id) || 0} productos de esta categoría pasarán a "General". No se borrarán.`}
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
