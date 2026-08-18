// Editor unificado de producto en drawer (sin modales anidados).
import React, { useState } from 'react'
import {
  Package, Layers,
} from 'lucide-react'
import { Button, Field, Input, Toggle, Modal, ConfirmDialog } from '../ui'
import { cn } from '../../lib/cn'

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
    <Modal open={open} maxW="max-w-xl" zIndex="z-[60]" onClose={onClose} title={product ? `Editar: ${product.name}` : 'Nuevo producto'}>
      <div className="space-y-5">
        <div className="rounded-xl bg-page/60 border border-line p-3.5">
          <p className="type-caption text-muted">
            Define cómo se mostrará y venderá este producto. El <strong className="text-night">precio</strong> es lo que el cliente paga; el <strong className="text-night">costo</strong> es para tus utilidades.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Nombre *">
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej. Alitas 10, Coca-Cola, Tacos al pastor…"
              />
              <p className="type-caption text-muted mt-1">El nombre que verán tus clientes en el POS.</p>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1">Emoji (icono)</label>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => set('emoji', e)}
                  className={cn('w-9 h-9 grid place-items-center rounded-lg text-lg transition', form.emoji === e ? 'bg-brand-soft ring-2 ring-brand' : 'bg-page hover:bg-line')}>
                  {e}
                </button>
              ))}
            </div>
            <p className="type-caption text-muted mt-1">Icono visual del producto.</p>
          </div>
        </div>

        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            maxLength={160}
            placeholder="Breve descripción del producto…"
            className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand"
          />
          <p className="type-caption text-muted mt-1">Texto que aparecerá en el POS y en el menú digital.</p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="Precio (venta) *">
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
              <p className="type-caption text-muted mt-1">Lo que paga el cliente.</p>
            </Field>
          </div>
          <div>
            <Field label="Costo (compra)">
              <Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0.00" />
              <p className="type-caption text-muted mt-1">Precio de adquisición para cálculo de margen.</p>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Código identificador" />
              <p className="type-caption text-muted mt-1">Opcional. Para control de inventario.</p>
            </Field>
          </div>
          <div>
            <Field label="Orden (prioridad en menú)">
              <Input type="number" value={form.order} onChange={(e) => set('order', e.target.value)} />
              <p className="type-caption text-muted mt-1">Orden ascendente en la lista de categorías.</p>
            </Field>
          </div>
        </div>

        <Field label="Categoría">
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand"
          >
            <option value="">General (sin categoría)</option>
            {state.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <p className="type-caption text-muted mt-1">A qué sección del menú pertenece.</p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="Stock (cantidad)">
              <Input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              <p className="type-caption text-muted mt-1">Unidades disponibles. 0 = sin límite si no usas inventario.</p>
            </Field>
          </div>
          <div>
            <Field label="Alerta de bajo stock">
              <Input type="number" min="0" value={form.lowStockAt} onChange={(e) => set('lowStockAt', e.target.value)} />
              <p className="type-caption text-muted mt-1">Notifica cuando quede este número en inventario.</p>
            </Field>
          </div>
        </div>

        <div>
          <Field label="Unidad de medida">
            <Input value={form.unitLabel} onChange={(e) => set('unitLabel', e.target.value)} placeholder="Ej. pieza, kg, litro…" />
            <p className="type-caption text-muted mt-1">Cómo se describe la cantidad de este producto.</p>
          </Field>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-night">
            <Toggle checked={form.available} onChange={(v) => set('available', v)} />
            <span>Disponible</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-night">
            <Toggle checked={form.featured} onChange={(v) => set('featured', v)} />
            <span>Destacado</span>
          </label>
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-2 font-semibold text-night text-sm mb-2">
            <Layers size={15} className="text-brand" /> Modificadores (personalización)
          </div>
          <p className="type-caption text-muted mb-2">Permiten al cliente personalizar: ej. "sin cebolla", "extra queso".</p>
          {state.modGroups.length === 0 ? (
            <p className="text-xs text-muted">No hay grupos de modificadores. Crea grupos en <strong>Automatizaciones → Modificadores</strong>.</p>
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
                    <span className="text-[10px] text-muted whitespace-nowrap">{g.items.length} opciones</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line p-3">
          <label className="flex items-center gap-2 text-sm text-night mb-1">
            <Toggle checked={form.promoOn} onChange={(v) => set('promoOn', v)} />
            <span>Promo bundle (ej. 2×1)</span>
          </label>
          {form.promoOn && (
            <>
              <p className="type-caption text-muted my-1">Ofrece el producto con precio especial al comprar cantidad exacta.</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Field label="Cantidad">
                    <Input type="number" min="2" value={form.bundle} onChange={(e) => set('bundle', e.target.value)} placeholder="2" />
                  </Field>
                </div>
                <div>
                  <Field label="Precio promo">
                    <Input type="number" min="0" step="0.01" value={form.promoPrice} onChange={(e) => set('promoPrice', e.target.value)} placeholder="0.00" />
                  </Field>
                </div>
              </div>
            </>
          )}
          {!form.promoOn && <p className="type-caption text-muted mt-1">Marca aquí para ofrecer "compra N lleva M".</p>}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4 mt-4">
        <div className="flex items-center gap-2">
          {product && (
            <button type="button" onClick={() => setDel(true)} className="text-xs text-danger font-semibold hover:underline">Eliminar producto</button>
          )}
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-night transition">Cancelar</button>
        </div>
        <Button variant="gradient" onClick={save}>
          <Package size={15} className="mr-1.5" /> {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
<ConfirmDialog
        open={del}
        danger
        title={`¿Eliminar ${product?.name}?`}
        message="Se quitará del catálogo y de todas las ventas anteriores. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={remove}
        onCancel={() => setDel(false)}
      />
    </Modal>
  )
}
