import React, { useMemo, useState } from 'react'
import { TicketPercent, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog,
  Toggle, SearchInput, EmptyState, PageHeader, StatCard,
} from '../ui'
import { addCoupon, updateCoupon, deleteCoupon } from '../../lib/storage'
import { fmtMoney, fmtDate } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'

const blank = () => ({
  code: '', name: '', type: 'percent', value: '', minPurchase: '0',
  start: '', end: '', maxUses: '0', clientId: '', categoryIds: [], productIds: [], active: true,
})

const fromCoupon = (c) => ({
  code: c.code || '',
  name: c.name || '',
  type: c.type || 'percent',
  value: c.value != null ? String(c.value) : '',
  minPurchase: c.minPurchase != null ? String(c.minPurchase) : '0',
  start: c.start ? String(c.start).slice(0, 10) : '',
  end: c.end ? String(c.end).slice(0, 10) : '',
  maxUses: c.maxUses != null ? String(c.maxUses) : '0',
  clientId: c.clientId || '',
  categoryIds: [...(c.categoryIds || [])],
  productIds: [...(c.productIds || [])],
  active: c.active !== false,
})

export default function Cupones({ state, refresh }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [del, setDel] = useState(null)

  const coupons = state.coupons || []
  const clients = state.clients || []
  const categories = state.categories || []
  const products = state.products || []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return coupons
    return coupons.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q))
  }, [coupons, query])

  const activeCount = coupons.filter((c) => c.active).length
  const usedTotal = coupons.reduce((a, c) => a + (c.usedCount || 0), 0)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(blank()); setOpen(true) }
  const openEdit = (c) => { setEditing(c); setForm(fromCoupon(c)); setOpen(true) }

  const toggleCat = (id) => set('categoryIds', form.categoryIds.includes(id) ? form.categoryIds.filter((x) => x !== id) : [...form.categoryIds, id])
  const toggleProd = (id) => set('productIds', form.productIds.includes(id) ? form.productIds.filter((x) => x !== id) : [...form.productIds, id])

  const save = () => {
    const code = form.code.trim().toUpperCase()
    const name = form.name.trim()
    if (!code) { toastErr('El código es obligatorio'); return }
    if (!name) { toastErr('El nombre es obligatorio'); return }
    const value = Number(form.value)
    if (!(value > 0)) { toastErr('El valor debe ser mayor a 0'); return }
    if (form.type === 'percent' && value > 100) { toastErr('El porcentaje no puede superar 100'); return }
    const payload = {
      code,
      name,
      type: form.type,
      value,
      minPurchase: Number(form.minPurchase) || 0,
      start: form.start || null,
      end: form.end || null,
      maxUses: Number(form.maxUses) || 0,
      clientId: form.clientId || null,
      categoryIds: form.categoryIds,
      productIds: form.productIds,
      active: form.active,
    }
    if (editing) {
      updateCoupon(editing.id, payload)
      toastOk('Cupón actualizado')
    } else {
      const dup = coupons.some((c) => c.code === code)
      if (dup) { toastErr('Ya existe un cupón con ese código'); return }
      addCoupon(payload)
      toastOk('Cupón creado')
    }
    setOpen(false)
    refresh()
  }

  const confirmDel = () => {
    deleteCoupon(del.id)
    setDel(null)
    refresh()
    toastOk('Cupón eliminado')
  }

  const usagePct = (c) => {
    if (!c.maxUses || c.maxUses <= 0) return 0
    return Math.min(100, Math.round(((c.usedCount || 0) / c.maxUses) * 100))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cupones"
        subtitle={`${coupons.length} cupones · ${activeCount} activos`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar cupón…" className="w-56" />
            <Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nuevo cupón</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={TicketPercent} label="Cupones" value={coupons.length} sub={`${activeCount} activos`} tone="brand" />
        <StatCard icon={TicketPercent} label="Usos totales" value={usedTotal} sub="Canjes registrados" tone="gold" />
        <StatCard icon={TicketPercent} label="Inactivos" value={coupons.length - activeCount} sub="Deshabilitados" tone="night" />
      </div>

      {coupons.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon="🎟️"
            title="Sin cupones"
            message="Crea códigos de descuento para tus clientes."
            action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nuevo cupón</Button>}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon="🔍" title="Sin resultados" message={`Nada coincide con «${query}».`} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold text-right">Mín.</th>
                  <th className="px-4 py-3 font-semibold min-w-[120px]">Usos</th>
                  <th className="px-4 py-3 font-semibold">Vigencia</th>
                  <th className="px-4 py-3 font-semibold text-center">Activo</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const pct = usagePct(c)
                  return (
                    <tr key={c.id} className="border-b border-line/50 last:border-0 hover:bg-page transition">
                      <td className="px-4 py-3">
                        <code className="font-mono text-xs font-bold bg-night text-white px-2 py-1 rounded-lg">{c.code}</code>
                      </td>
                      <td className="px-4 py-3 font-semibold text-night">{c.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={c.type === 'percent' ? 'purple' : 'blue'}>{c.type === 'percent' ? '%' : '$'}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-right text-night">
                        {c.type === 'percent' ? `${c.value}%` : fmtMoney(c.value)}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted text-right">{c.minPurchase ? fmtMoney(c.minPurchase) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted mb-1">
                          {c.usedCount || 0}{c.maxUses > 0 ? ` / ${c.maxUses}` : ' / ∞'}
                        </div>
                        {c.maxUses > 0 && (
                          <div className="h-1.5 bg-line rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 90 ? 'bg-danger' : pct >= 60 ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${Math.max(4, pct)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {c.start || c.end ? `${fmtDate(c.start)} → ${fmtDate(c.end)}` : 'Sin límite'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Toggle checked={!!c.active} onChange={(v) => { updateCoupon(c.id, { active: v }); refresh() }} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-gold transition" title="Editar"><Pencil size={15} /></button>
                          <button onClick={() => setDel(c)} className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-danger transition" title="Eliminar"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar cupón' : 'Nuevo cupón'} maxW="max-w-xl">
        <div className="space-y-4">
          <div className="rounded-xl bg-page/60 border border-line p-3.5">
            <p className="type-caption text-muted">
              Un <strong className="text-night">cupón</strong> es un código de descuento. Ej. <code className="px-1.5 py-0.5 rounded bg-night text-white">BIENVENIDA10</code>
              que quite el 10% o un monto fijo al momento de pagar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código *">
              <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="BIENVENIDA10" className="font-mono uppercase" />
              <p className="type-caption text-muted mt-1">Código que el cliente escribe al pagar.</p>
            </Field>
            <Field label="Nombre interno *">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Bienvenida 10%" />
              <p className="type-caption text-muted mt-1">Nombre para identificarlo en tu lista de cupones.</p>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo de descuento">
              <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="percent">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
              </Select>
            </Field>
            <Field label={form.type === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}>
              <Input type="number" min="0" step={form.type === 'percent' ? '1' : '0.01'} value={form.value} onChange={(e) => set('value', e.target.value)} />
              <p className="type-caption text-muted mt-1">{form.type === 'percent' ? 'Ej. 10 = 10% de descuento' : 'Ej. 50 = $50 de descuento'}</p>
            </Field>
            <Field label="Compra mínima">
              <Input type="number" min="0" step="any" value={form.minPurchase} onChange={(e) => set('minPurchase', e.target.value)} />
              <p className="type-caption text-muted mt-1">Monto mínimo para que aplique. 0 = sin mínimo.</p>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha de inicio">
              <Input type="date" value={form.start} onChange={(e) => set('start', e.target.value)} />
              <p className="type-caption text-muted mt-1">Desde cuándo es válido (opcional).</p>
            </Field>
            <Field label="Fecha de fin">
              <Input type="date" value={form.end} onChange={(e) => set('end', e.target.value)} />
              <p className="type-caption text-muted mt-1">Hasta cuándo es válido (opcional).</p>
            </Field>
            <Field label="Máximo de usos" hint="0 = ilimitado">
              <Input type="number" min="0" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} />
              <p className="type-caption text-muted mt-1">¿Cuántas personas pueden usarlo? 0 = ilimitado.</p>
            </Field>
          </div>

          <Field label="Cliente exclusivo (opcional)">
            <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              <option value="">Todos los clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <p className="type-caption text-muted mt-1">Si seleccionas un cliente, solo él podrá usar este cupón.</p>
          </Field>

          {categories.length > 0 && (
            <Field label="Categorías (vacío = todas)">
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                {categories.map((cat) => {
                  const on = form.categoryIds.includes(cat.id)
                  return (
                    <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${on ? 'bg-brand text-white border-brand' : 'bg-card text-muted border-line hover:border-brand'}`}>
                      {cat.emoji} {cat.name}
                    </button>
                  )
                })}
              </div>
              <p className="type-caption text-muted mt-1">Selecciona categorías para limitar el descuento.</p>
            </Field>
          )}

          {products.length > 0 && (
            <Field label="Productos (vacío = todos)">
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-auto">
                {products.map((p) => {
                  const on = form.productIds.includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProd(p.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${on ? 'bg-gold text-white border-gold' : 'bg-card text-muted border-line hover:border-gold'}`}>
                      {p.emoji} {p.name}
                    </button>
                  )
                })}
              </div>
              <p className="type-caption text-muted mt-1">Selecciona productos específicos para el descuento.</p>
            </Field>
          )}

          <div className="flex items-center gap-2">
            <Toggle checked={form.active} onChange={(v) => set('active', v)} />
            <span className="text-sm text-night">Este cupón está activo</span>
          </div>
          <p className="type-caption text-muted">Desactívalo si ya no quieres que se aplique, pero conserva el historial.</p>

          <div className="flex gap-2 pt-2 border-t border-line">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editing ? 'Guardar' : 'Crear cupón'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Eliminar cupón"
        message={del ? `¿Eliminar el cupón ${del.code}?` : ''}
        danger
        confirmLabel="Eliminar"
        onConfirm={confirmDel}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}
