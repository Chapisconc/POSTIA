import React, { useEffect, useState, useMemo } from 'react'
import { QrCode, ExternalLink, Smartphone, Plus, Pencil, Trash2, X, Save, Eye, Image } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Textarea, Toggle, PageHeader, StatCard,
} from '../ui'
import {
  getMenuDigital, updateMenuDigital, readState, addCategory, updateCategory, deleteCategory,
  addProduct, updateProduct, deleteProduct,
} from '../../lib/storage'
import { fmtMoney } from '../../lib/format'
import { toast, toastOk } from '../../lib/notify'

function CategoryChip({ cat, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${active ? 'bg-brand text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
      {cat.emoji} {cat.name}
    </button>
  )
}

function ProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="bg-card rounded-xl border border-line p-3 relative group">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-page grid place-items-center text-2xl shrink-0">{product.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-night text-sm leading-tight truncate">{product.name}</div>
          <div className="text-xs text-muted line-clamp-1">{product.description}</div>
          <div className="font-mono font-extrabold text-brand text-sm mt-0.5">{fmtMoney(product.price)}</div>
          {product.categoryId && (
            <div className="text-[10px] text-muted mt-0.5">
              {readState().categories.find(c => c.id === product.categoryId)?.name || 'Sin categoría'}
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(product) }} className="p-1.5 rounded-lg bg-brand-soft text-brand hover:bg-brand/20 transition">
            <Pencil size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(product.id) }} className="p-1.5 rounded-lg bg-danger-soft text-danger hover:bg-danger/20 transition">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        {product.available === false && <Badge tone="danger" className="!text-[9px] !px-1.5 !py-0.5">Oculto</Badge>}
      </div>
    </div>
  )
}

function ProductEditor({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    emoji: product?.emoji || '🍽️',
    price: product?.price || '',
    cost: product?.cost || '',
    categoryId: product?.categoryId || '',
    available: product?.available !== false,
    featured: product?.featured || false,
  })
  const set = (k, v) => setF(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-brand-soft/30 border border-brand/20 rounded-xl p-4 space-y-3 animate-pop">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-night">{product ? 'Editar producto' : 'Nuevo producto'}</span>
        <button onClick={onCancel} className="text-muted hover:text-night p-1"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex items-center gap-2">
          <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} className="w-12 h-10 text-center text-xl rounded-lg border border-line bg-card" placeholder="Emoji" />
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre *" className="flex-1 px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand" />
        </div>
        <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descripción" className="col-span-2 px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand" />
        <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Precio *" className="px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand" />
        <input type="number" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="Costo" className="px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand" />
        <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand">
          <option value="">Sin categoría</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <div className="flex items-center gap-3 px-2">
          <label className="flex items-center gap-1.5 text-xs text-night">
            <input type="checkbox" checked={form.available} onChange={(e) => set('available', e.target.checked)} className="accent-brand" /> Disponible
          </label>
          <label className="flex items-center gap-1.5 text-xs text-night">
            <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-brand" /> Destacado
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={() => {
          if (!form.name.trim()) { toast('Nombre requerido', 'warning'); return }
          if (!form.price || Number(form.price) <= 0) { toast('Precio requerido', 'warning'); return }
          onSave(form)
        }}><Save size={14} className="mr-1" /> Guardar</Button>
      </div>
    </div>
  )
}

function CategoryEditor({ category, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '')
  const [emoji, setEmoji] = useState(category?.emoji || '🍽️')

  return (
    <div className="bg-brand-soft/30 border border-brand/20 rounded-xl p-3 space-y-2 animate-pop">
      <div className="flex items-center justify-between">
        <span className="font-bold text-xs text-night">{category ? 'Editar categoría' : 'Nueva categoría'}</span>
        <button onClick={onCancel} className="text-muted hover:text-night p-1"><X size={12} /></button>
      </div>
      <div className="flex gap-2">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-10 h-9 text-center text-lg rounded-lg border border-line bg-card" placeholder="Emoji" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" className="flex-1 px-3 py-2 rounded-lg border border-line bg-card text-sm outline-none focus:border-brand" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 !py-1.5 !text-xs" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1 !py-1.5 !text-xs" onClick={() => {
          if (!name.trim()) { toast('Nombre requerido', 'warning'); return }
          onSave({ name: name.trim(), emoji: emoji.trim() || '🍽️' })
        }}><Save size={12} className="mr-1" /> Guardar</Button>
      </div>
    </div>
  )
}

export default function MenuDigital({ state, refresh }) {
  const md = state.menuDigital || getMenuDigital()
  const [form, setForm] = useState({
    enabled: md.enabled !== false,
    mode: md.mode === 'menu' || md.mode === 'view' ? 'menu' : 'order',
    services: {
      llevar: md.services?.llevar !== false,
      domicilio: md.services?.domicilio !== false,
      mesa: md.services?.mesa !== false,
    },
    accent: md.accent || '#16A34A',
    welcome: md.welcome || 'Bienvenido a POSTIA',
  })
  const [activeTab, setActiveTab] = useState('preview')
  const [catFilter, setCatFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState(null)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [editingMdConfig, setEditingMdConfig] = useState(false)

  const categories = useMemo(() => state.categories || [], [state.categories])
  const products = useMemo(() => {
    const list = state.products || []
    if (catFilter === 'all') return list
    return list.filter(p => p.categoryId === catFilter)
  }, [state.products, catFilter])

  useEffect(() => {
    const m = state.menuDigital || getMenuDigital()
    setForm({
      enabled: m.enabled !== false,
      mode: m.mode === 'menu' || m.mode === 'view' ? 'menu' : 'order',
      services: { llevar: m.services?.llevar !== false, domicilio: m.services?.domicilio !== false, mesa: m.services?.mesa !== false },
      accent: m.accent || '#16A34A',
      welcome: m.welcome || 'Bienvenido a POSTIA',
    })
  }, [state.menuDigital])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setSvc = (k, v) => setForm(f => ({ ...f, services: { ...f.services, [k]: v } }))

  const saveConfig = () => {
    updateMenuDigital({
      enabled: form.enabled, mode: form.mode,
      services: { ...form.services }, accent: form.accent,
      welcome: form.welcome.trim() || 'Bienvenido a POSTIA',
    })
    refresh()
    toastOk('Configuración guardada')
  }

  const saveProduct = (data) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: data.name, description: data.description, emoji: data.emoji,
        price: Number(data.price), cost: Number(data.cost) || 0,
        categoryId: data.categoryId, available: data.available, featured: data.featured,
      })
    } else {
      addProduct({
        name: data.name, description: data.description, emoji: data.emoji,
        price: Number(data.price), cost: Number(data.cost) || 0,
        categoryId: data.categoryId, available: data.available, featured: data.featured,
      })
    }
    setEditingProduct(null); setShowNewProduct(false); refresh()
    toastOk(editingProduct ? 'Producto actualizado' : 'Producto creado')
  }

  const saveCategory = (data) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, data)
    } else {
      addCategory(data)
    }
    setEditingCategory(null); setShowNewCategory(false); refresh()
    toastOk(editingCategory ? 'Categoría actualizada' : 'Categoría creada')
  }

  const openPublic = () => {
    const url = `${window.location.origin}${window.location.pathname}?menu=1`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const svcCount = [form.services.llevar, form.services.domicilio, form.services.mesa].filter(Boolean).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Menú digital"
        subtitle="Vista previa y editor del catálogo"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openPublic} disabled={!form.enabled}>
              <ExternalLink size={16} className="mr-1" /> Abrir menú
            </Button>
            <Button onClick={saveConfig} className="gradient">
              <Save size={16} className="mr-1" /> Guardar
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-page rounded-xl p-1">
        <button onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'preview' ? 'bg-card shadow text-night' : 'text-muted hover:text-night'}`}>
          <Eye size={16} /> Vista previa
        </button>
        <button onClick={() => setActiveTab('edit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'edit' ? 'bg-card shadow text-night' : 'text-muted hover:text-night'}`}>
          <Pencil size={16} /> Editar catálogo
        </button>
        <button onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'config' ? 'bg-card shadow text-night' : 'text-muted hover:text-night'}`}>
          <Smartphone size={16} /> Configuración
        </button>
      </div>

      {/* ─── TAB: Vista previa ─── */}
      {activeTab === 'preview' && (
        <div className="flex justify-center">
          <div className="w-full max-w-sm rounded-[2rem] border-4 border-night/80 bg-night overflow-hidden shadow-2xl">
            {/* Notch */}
            <div className="h-7 bg-night flex items-center justify-center">
              <div className="w-24 h-5 bg-black rounded-full" />
            </div>
            {/* Header */}
            <div className="bg-night text-white text-center px-4 pb-4" style={{ borderBottom: `3px solid ${form.accent}` }}>
              <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center text-2xl mb-1" style={{ background: form.accent }}>🌿</div>
              <div className="font-extrabold text-base">{state.meta?.businessName || 'POSTIA'}</div>
              <p className="text-white/50 text-xs mt-0.5">{form.welcome || 'Bienvenido'}</p>
              <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                {form.services.llevar && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">🥡 Llevar</span>}
                {form.services.domicilio && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">🚗 Domicilio</span>}
                {form.services.mesa && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">🍽️ Mesa</span>}
              </div>
            </div>
            {/* Categories */}
            <div className="px-3 pt-3 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
              <button onClick={() => setCatFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition ${catFilter === 'all' ? 'text-white' : 'text-white/60'}`}
                style={{ background: catFilter === 'all' ? form.accent : 'rgba(255,255,255,0.08)' }}>
                ✨ Todo
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition ${catFilter === c.id ? 'text-white' : 'text-white/60'}`}
                  style={{ background: catFilter === c.id ? form.accent : 'rgba(255,255,255,0.08)' }}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
            {/* Products */}
            <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto bg-card">
              {products.length === 0 && (
                <div className="text-center py-8 text-muted text-xs">No hay productos en esta categoría</div>
              )}
              {products.filter(p => p.available !== false).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-page border border-line">
                  <div className="w-10 h-10 rounded-lg bg-card grid place-items-center text-xl shrink-0">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-night text-xs leading-tight truncate">{p.name}</div>
                    {p.description && <div className="text-[10px] text-muted truncate">{p.description}</div>}
                    <div className="font-mono font-extrabold text-xs mt-0.5" style={{ color: form.accent }}>{fmtMoney(p.price)}</div>
                  </div>
                </div>
              ))}
              {products.some(p => p.available === false) && (
                <div className="text-[10px] text-muted text-center pt-1 border-t border-line">
                  +{products.filter(p => p.available === false).length} productos ocultos
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Editar catálogo ─── */}
      {activeTab === 'edit' && (
        <div className="space-y-4">
          {/* Categorías */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-night text-sm">Categorías ({categories.length})</h3>
              <Button variant="outline" className="!py-1 !text-xs" onClick={() => setShowNewCategory(true)}>
                <Plus size={14} className="mr-1" /> Nueva
              </Button>
            </div>
            {showNewCategory && (
              <CategoryEditor onSave={saveCategory} onCancel={() => setShowNewCategory(false)} />
            )}
            {editingCategory && (
              <CategoryEditor category={editingCategory} onSave={saveCategory} onCancel={() => setEditingCategory(null)} />
            )}
            <div className="space-y-1.5">
              {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-page hover:bg-brand-soft/30 transition group">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="flex-1 text-sm font-semibold text-night">{cat.name}</span>
                  <span className="text-[10px] text-muted">{(state.products || []).filter(p => p.categoryId === cat.id).length} prod.</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setEditingCategory(cat)} className="p-1 rounded bg-card text-muted hover:text-brand transition"><Pencil size={11} /></button>
                    <button onClick={() => { if (confirm('¿Eliminar categoría?')) { deleteCategory(cat.id); refresh() } }} className="p-1 rounded bg-card text-muted hover:text-danger transition"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-xs text-muted text-center py-3">Sin categorías. Crea una para organizar tu catálogo.</div>}
            </div>
          </Card>

          {/* Productos */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-night text-sm">Productos ({(state.products || []).length})</h3>
              <Button variant="outline" className="!py-1 !text-xs" onClick={() => setShowNewProduct(true)}>
                <Plus size={14} className="mr-1" /> Nuevo
              </Button>
            </div>
            {showNewProduct && (
              <ProductEditor categories={categories} onSave={saveProduct} onCancel={() => setShowNewProduct(false)} />
            )}
            {editingProduct && (
              <ProductEditor product={editingProduct} categories={categories} onSave={saveProduct} onCancel={() => setEditingProduct(null)} />
            )}
            {/* Filtro por categoría */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              <button onClick={() => setCatFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${catFilter === 'all' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:border-brand'}`}>
                Todos ({(state.products || []).length})
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${catFilter === c.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:border-brand'}`}>
                  {c.emoji} {c.name} ({(state.products || []).filter(p => p.categoryId === c.id).length})
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onEdit={(prod) => setEditingProduct(prod)} onDelete={(id) => { if (confirm('¿Eliminar producto?')) { deleteProduct(id); refresh() } }} />
              ))}
            </div>
            {products.length === 0 && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm text-muted">No hay productos{catFilter !== 'all' ? ' en esta categoría' : ''}</div>
                <Button variant="outline" className="mt-3" onClick={() => setShowNewProduct(true)}><Plus size={14} className="mr-1" /> Agregar producto</Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB: Configuración ─── */}
      {activeTab === 'config' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-night">Menú digital</h3>
            <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} label="Habilitado" />
            <Field label="Modo" hint="order = recibir pedidos · menu = solo catálogo">
              <Select value={form.mode} onChange={(e) => set('mode', e.target.value)}>
                <option value="order">Recibir pedidos (order)</option>
                <option value="menu">Solo menú (menu)</option>
              </Select>
            </Field>
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-muted">Servicios</span>
              <Toggle checked={form.services.llevar} onChange={(v) => setSvc('llevar', v)} label="Para llevar" />
              <Toggle checked={form.services.domicilio} onChange={(v) => setSvc('domicilio', v)} label="Domicilio" />
              <Toggle checked={form.services.mesa} onChange={(v) => setSvc('mesa', v)} label="Mesa" />
            </div>
            <Field label="Color de acento">
              <div className="flex items-center gap-3">
                <input type="color" value={form.accent} onChange={(e) => set('accent', e.target.value)} className="w-12 h-10 rounded-lg border border-line cursor-pointer bg-card" />
                <Input value={form.accent} onChange={(e) => set('accent', e.target.value)} className="font-mono" />
              </div>
            </Field>
            <Field label="Mensaje de bienvenida">
              <Textarea rows={2} value={form.welcome} onChange={(e) => set('welcome', e.target.value)} placeholder="Bienvenido a POSTIA" />
            </Field>
            <Button className="w-full" onClick={saveConfig}>Guardar configuración</Button>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-night">Resumen</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={Smartphone} label="Estado" value={form.enabled ? 'Activo' : 'Inactivo'} tone={form.enabled ? 'brand' : 'danger'} />
              <StatCard icon={QrCode} label="Modo" value={form.mode === 'order' ? 'Pedidos' : 'Solo menú'} tone="blue" />
              <StatCard icon={ExternalLink} label="Servicios" value={svcCount} tone="gold" />
              <StatCard icon={Image} label="Productos" value={(state.products || []).length} tone="success" />
            </div>
            <div className="bg-page rounded-xl p-3 space-y-2">
              <div className="text-xs font-semibold text-muted">URL pública</div>
              <code className="block text-xs font-mono bg-card px-3 py-2 rounded-lg border border-line break-all">{window.location.origin}{window.location.pathname}?menu=1</code>
              <Button variant="outline" className="w-full !text-xs" onClick={openPublic} disabled={!form.enabled}>
                <ExternalLink size={14} className="mr-1" /> Abrir en nueva pestaña
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
