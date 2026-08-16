// Editor unificado de producto en drawer (sin modales anidados).
import React, { useState } from 'react'
import {
  Package, Plus, Trash2, Layers, Star,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { fmtMoney } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import { addProduct, updateProduct, deleteProduct } from '../../lib/storage'

const EMOJIS = [
  '🍗', '🍖', '🍔', '🍕', '🥗', '🍟', '🌮', '🌯', '🍜', '🍝', '🦐', '🥩',
  '🥤', '🍺', '🍋', '💧', '🍰', '🍫', '🌽', '🧅', '🔥', '🥑', '🍦', '🥞',
  '🍳', '🥟', '🍩', '☕', '🧃', '🍎',
]

const blank = () => ({
  name: '', description: '', emoji: '🍽️', price: '', cost: '', categoryId: '',
  sku: '', order: '0', available: true, featured: false,
  stock: '0', lowStockAt: '5', unitLabel: 'pieza',
  modGroupIds: [], promoOn: false, bundle: '2', promoPrice: '',
})

export default function ProductEditor({ open, product, state, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(blank())
  const [del, setDel] = useState(false)

  if (!open) return null
  if (product && !form.name) setForm({
    name: product.name || '', description: product.description || '', emoji: product.emoji || '🍽️',
    price: product.price ? String(product.price) : '', cost: product.cost ? String(product.cost) : '', categoryId: product.categoryId || '',
    sku: product.sku || '', order: String(product.order ?? 0), available: product.available !== false, featured: !!product.featured,
    stock: String(product.stock ?? 0), lowStockAt: String(product.lowStockAt ?? 5), unitLabel: product.unitLabel || 'pieza',
    modGroupIds: [...(product.modGroupIds || [])],
    promoOn: !!product.promo, bundle: product.promo?.bundle ? String(product.promo.bundle) : '2', promoPrice: product.promo?.price ? String(product.promo.price) : '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      emoji: form.emoji,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      categoryId: form.categoryId,
      sku: form.sku.trim(),
      order: Number(form.order) || 0,
      available: form.available,
      featured: form.featured,
      stock: Number(form.stock) || 0,
      unitLabel: form.unitLabel.trim() || 'pieza',
      lowStockAt: Number(form.lowStockAt) || 0,
      modGroupIds: form.modGroupIds,
      promo: form.promoOn ? { bundle: Number(form.bundle) || 0, price: Number(form.promoPrice) || 0 } : null,
    }
    if (!payload.name) { toastErr('El nombre es obligatorio'); return }
    if (product) updateProduct(product.id, payload)
    else addProduct(payload)
    toastOk(product ? 'Producto actualizado' : 'Producto creado')
    onSave()
    onClose()
  }

  const remove = () => {
    if (!product) return
    deleteProduct(product.id)
    toastOk('Producto eliminado')
    onDelete()
    onClose()
  }

  const toggleMod = (id) => set('modGroupIds', form.modGroupIds.includes(id) ? form.modGroupIds.filter((x) => x !== id) : [...form.modGroupIds, id])

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-night/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative flex flex-col w-full max-w-lg bg-card shadow-xl animate-pop')}
        style={{ maxHeight: '90vh', minHeight: 0 }}>
        <div className="flex items-center justify-between p-4 border-b border-line shrink-0">
          <h3 className="font-bold text-night">{product ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-night text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">Nombre *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Alitas 10"
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1">Emoji</label>
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => set('emoji', e)}
                    className={cn('w-9 h-9 grid place-items-center rounded-lg text-lg transition', form.emoji === e ? 'bg-brand-soft ring-2 ring-brand' : 'bg-page hover:bg-line')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="block text-xs font-semibold text-muted mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Breve descripción…"
            className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Precio</label>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Costo</label>
              <input type="number" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">SKU</label>
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Opcional"
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Orden</label>
              <input type="number" value={form.order} onChange={(e) => set('order', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Categoría</label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand">
              <option value="">General</option>
              {state.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Bajo stock en</label>
              <input type="number" value={form.lowStockAt} onChange={(e) => set('lowStockAt', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Unidad</label>
              <input value={form.unitLabel} onChange={(e) => set('unitLabel', e.target.value)} placeholder="pieza"
                className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-night">
              <input type="checkbox" checked={form.available} onChange={(e) => set('available', e.target.checked)}
                className="w-4 h-4 rounded border-line bg-card" />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm text-night">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)}
                className="w-4 h-4 rounded border-line bg-card" />
              Destacado
            </label>
          </div>

          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2 font-semibold text-night text-sm mb-2">
              <Layers size={15} className="text-brand" /> Modificadores
            </div>
            {state.modGroups.length === 0 ? (
              <p className="text-xs text-muted">No hay grupos de modificadores.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-1.5">
                {state.modGroups.map((g) => {
                  const on = form.modGroupIds.includes(g.id)
                  return (
                    <button key={g.id} type="button" onClick={() => toggleMod(g.id)}
                      className={cn('text-left px-3 py-2 rounded-xl border text-sm transition flex items-center gap-2',
                        on ? 'border-brand bg-brand-soft text-brand-dark font-semibold' : 'border-line bg-card text-night hover:bg-page')}>
                      <span className={cn('w-4 h-4 shrink-0 grid place-items-center rounded border', on ? 'bg-brand border-brand' : 'border-line')}>
                        {on && <span className="text-white text-[10px] leading-none">✓</span>}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      <span className="text-[10px] text-muted whitespace-nowrap">{g.items.length} items</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line p-3">
            <label className="flex items-center gap-2 text-sm text-night">
              <input type="checkbox" checked={form.promoOn} onChange={(e) => set('promoOn', e.target.checked)}
                className="w-4 h-4 rounded border-line bg-card" />
              Promo bundle (ej. 2×1)
            </label>
            {form.promoOn && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Cantidad (bundle)</label>
                  <input type="number" value={form.bundle} onChange={(e) => set('bundle', e.target.value)} placeholder="2"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Precio promo</label>
                  <input type="number" value={form.promoPrice} onChange={(e) => set('promoPrice', e.target.value)} placeholder="100.00"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
                </div>
              </div>
            )}
            {form.promoOn && <p className="text-[11px] text-muted mt-1">El cliente paga el precio promo por el bundle completo.</p>}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line p-4 shrink-0">
          <div className="flex items-center gap-2">
            {product && (
              <button type="button" onClick={() => setDel(true)} className="text-xs text-danger font-semibold hover:underline">Eliminar</button>
            )}
            <button type="button" onClick={onClose} className="text-sm text-muted hover:text-night transition">Cancelar</button>
          </div>
          <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm transition">
            <Package size={15} className="mr-1.5" /> {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
      {del && product && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-night/50 backdrop-blur-sm" onClick={onClose}>
          <div className="w-full max-w-sm bg-card border border-line shadow-xl rounded-2xl p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-night">¿Eliminar {product.name}?</h3>
            <p className="text-sm text-muted mt-1.5">Se quitará del catálogo y de todas las ventas anteriores.</p>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-xl border border-line bg-card text-night text-sm font-semibold hover:bg-page transition">Cancelar</button>
              <button type="button" onClick={remove} className="flex-1 px-3 py-2 rounded-xl bg-danger hover:opacity-90 text-white text-sm font-semibold transition">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
