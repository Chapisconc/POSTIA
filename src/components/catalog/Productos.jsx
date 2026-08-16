import React, { useState, useMemo } from 'react'
import {
  Package, Plus, Pencil, Trash2, Star, Layers, BadgePercent,
} from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Textarea, Modal, ConfirmDialog,
  Toggle, SearchInput, EmptyState, PageHeader,
} from '../ui'
import { addProduct, updateProduct, deleteProduct, categoryName } from '../../lib/storage'
import { fmtMoney } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import ProductEditor from './ProductEditor'

const EMOJIS = [
  '🍗', '🍖', '🍔', '🍕', '🥗', '🍟', '🌮', '🌯', '🍜', '🍝', '🦐', '🥩',
  '🥤', '🍺', '🍋', '💧', '🍰', '🍫', '🌽', '🧅', '🔥', '🥑', '🍦', '🥞',
  '🍳', '🥟', '🍩', '☕', '🧃', '🍎',
]

const marginTone = (m) => (m > 0 ? 'success' : m < 0 ? 'danger' : 'muted')

export default function Productos({ state, refresh, onNav }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const categories = useMemo(() => state.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0)), [state])
  const products = useMemo(() => {
    const q = search.trim().toLowerCase()
    return state.products.slice()
      .filter((p) => !catFilter || p.categoryId === catFilter)
      .filter((p) => !q || `${p.name} ${p.description} ${p.sku} ${categoryName(state, p.categoryId)}`.toLowerCase().includes(q))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
  }, [state, search, catFilter])

  const openCreate = () => { setEditing(null); setOpen(true) }
  const openEdit = (p) => { setEditing(p); setOpen(true) }

  const toggleAvail = (p, v) => { try { updateProduct(p.id, { available: v }); refresh(); toastOk(v ? `${p.name} disponible` : `${p.name} marcado agotado`) } catch (e) { console.error('Error:', e); toastErr('Error') } }
  const toggleFeat = (p) => { try { updateProduct(p.id, { featured: !p.featured }); refresh(); toastOk(p.featured ? `${p.name} ya no es destacado` : `${p.name} destacado`) } catch (e) { console.error('Error:', e); toastErr('Error') } }

  const confirmDelete = () => {
    try {
      deleteProduct(delTarget.id)
      setDelTarget(null)
      refresh()
      toastOk('Producto eliminado')
    } catch (e) { console.error('Error:', e); toastErr('Error') }
  }

  const toggleMod = (id) => set('modGroupIds', form.modGroupIds.includes(id) ? form.modGroupIds.filter((x) => x !== id) : [...form.modGroupIds, id])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Productos"
        subtitle={`${products.length} de ${state.products.length} productos en el catálogo`}
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO PRODUCTO</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, descripción o SKU…" className="w-full sm:w-72" />
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Select>
      </div>

      {products.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🍽️" title="Sin productos" message="Agrega tu primer producto para empezar a vender." action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> NUEVO PRODUCTO</Button>} />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">Margen</th>
                    <th className="px-4 py-3">Disponible</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Destacado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const margin = (Number(p.price) || 0) - (Number(p.cost) || 0)
                    return (
                      <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-page/60">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-page text-xl">{p.emoji}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-night truncate flex items-center gap-1.5">
                                {p.name}
                                {p.promo && <Badge tone="gold" className="!text-[10px]">{p.promo.bundle}×${p.promo.price}</Badge>}
                              </div>
                              {p.sku && <div className="text-[11px] text-muted">SKU {p.sku}</div>}
                            </div>
                            <span className="text-[10px] text-muted font-medium ml-auto">i</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone="muted">{categoryName(state, p.categoryId)}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-night">{fmtMoney(p.price)}</td>
                        <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                          <Badge tone={marginTone(margin)}>
                            <BadgePercent size={12} /> {margin >= 0 ? '+' : ''}{fmtMoney(margin)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Toggle checked={p.available} onChange={(v) => toggleAvail(p, v)} />
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <button onClick={() => toggleFeat(p)} title="Destacado"
                            className={`touch-icon p-1.5 rounded-lg transition ${p.featured ? 'text-gold bg-gold-soft' : 'text-muted hover:bg-page'}`}>
                            <Star size={18} fill={p.featured ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(p)} title="Editar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand-soft transition">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setDelTarget(p)} title="Eliminar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Vista de tarjetas en móvil: info esencial visible sin scroll horizontal */}
          <div className="md:hidden grid sm:grid-cols-2 gap-2.5">
            {products.map((p) => (
              <div key={p.id} className="min-w-0 max-w-full rounded-xl border border-line bg-card shadow-sm p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-page text-xl">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-night truncate text-sm flex items-center gap-1.5">
                      {p.name}
                      {p.promo && <Badge tone="gold" className="!text-[10px]">{p.promo.bundle}×${p.promo.price}</Badge>}
                      <span className="text-[10px] text-muted font-medium ml-auto">i</span>
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5">{categoryName(state, p.categoryId)}{p.sku ? ` · SKU ${p.sku}` : ''}</div>
                  </div>
                  <button onClick={() => toggleFeat(p)} title="Destacado"
                    className={`touch-icon p-1.5 rounded-lg shrink-0 transition ${p.featured ? 'text-gold bg-gold-soft' : 'text-muted hover:bg-page'}`}>
                    <Star size={16} fill={p.featured ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                  <span className="font-mono font-bold text-brand text-base tabular-nums">{fmtMoney(p.price)}</span>
                  <div className="flex items-center gap-2">
                    <Toggle checked={p.available} onChange={(v) => toggleAvail(p, v)} label="Disponible" />
                    <button onClick={() => openEdit(p)} title="Editar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-brand hover:bg-brand-soft transition">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDelTarget(p)} title="Eliminar" className="touch-icon p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProductEditor
        open={open}
        product={editing}
        state={state}
        onClose={() => setOpen(false)}
        onSave={() => refresh()}
        onDelete={() => refresh()}
      />

      <ConfirmDialog
        open={!!delTarget}
        danger
        title={`¿Eliminar ${delTarget?.name}?`}
        message="Se quitará del catálogo y de todas las ventas anteriores. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
