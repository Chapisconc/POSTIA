import React, { useState } from 'react'
import { Zap, Plus, Pencil, Trash2, Play } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Modal, ConfirmDialog,
  Toggle, EmptyState, PageHeader, StatCard,
} from '../ui'
import { addRule, updateRule, deleteRule, runRules } from '../../lib/storage'
import { toast, toastOk, toastErr } from '../../lib/notify'

const WHEN_OPTS = [
  { id: 'order.nuevo', label: 'Pedido nuevo' },
  { id: 'order.paid', label: 'Pedido pagado' },
  { id: 'order.listo', label: 'Pedido listo' },
  { id: 'order.cancelado', label: 'Pedido cancelado' },
  { id: 'inventory.bajo', label: 'Inventario bajo' },
  { id: 'caja.closed', label: 'Cierre de caja' },
]

const THEN_OPTS = [
  { id: 'notify', label: 'Notificar' },
  { id: 'sound', label: 'Sonido' },
  { id: 'print', label: 'Imprimir' },
  { id: 'discount', label: 'Descuento' },
]

const whenLabel = (id) => WHEN_OPTS.find((x) => x.id === id)?.label || id
const thenLabel = (id) => THEN_OPTS.find((x) => x.id === id)?.label || id

const phrase = (r) => {
  const t = r.target ? ` → ${r.target}` : ''
  return `SI ${whenLabel(r.when)} ENTONCES ${thenLabel(r.then)}${t}`
}

const blank = () => ({
  name: '',
  when: 'order.nuevo',
  then: 'notify',
  target: '',
  active: true,
})

export default function Automatizaciones({ state, refresh }) {
  const rules = state.rules || []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [del, setDel] = useState(null)

  const activeCount = rules.filter((r) => r.active).length
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(blank()); setOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      name: r.name || '',
      when: r.when || 'order.nuevo',
      then: r.then || 'notify',
      target: r.target || '',
      active: r.active !== false,
    })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim()) { toastErr('El nombre es obligatorio'); return }
    if (!form.when || !form.then) { toastErr('Completa SI y ENTONCES'); return }
    const payload = {
      name: form.name.trim(),
      when: form.when,
      then: form.then,
      target: form.target.trim(),
      active: form.active,
    }
    if (editing) {
      updateRule(editing.id, payload)
      toastOk('Regla actualizada')
    } else {
      addRule(payload)
      toastOk('Regla creada')
    }
    setOpen(false)
    refresh()
  }

  const confirmDel = () => {
    deleteRule(del.id)
    setDel(null)
    refresh()
    toastOk('Regla eliminada')
  }

  const testRule = (r) => {
    const paid = [...(state.orders || [])]
      .filter((o) => o.paid)
      .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0]
    if (!paid && String(r.when).startsWith('order.')) {
      toast('No hay pedido pagado para probar', 'warning')
      return
    }
    const msgs = runRules(r.when, { order: paid, state })
    if (msgs?.length) {
      toast(msgs.join(' · '), 'success')
    } else if (!r.active) {
      toast('La regla está inactiva', 'warning')
    } else {
      toast(`Probada: ${phrase(r)}`, 'info')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automatizaciones"
        subtitle="Reglas SI → ENTONCES para el flujo del restaurante"
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nueva regla</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Zap} label="Reglas" value={rules.length} sub={`${activeCount} activas`} tone="brand" />
        <StatCard icon={Zap} label="Activas" value={activeCount} sub="En ejecución" tone="gold" />
        <StatCard icon={Zap} label="Inactivas" value={rules.length - activeCount} sub="Pausadas" tone="night" />
      </div>

      <Card className="p-4 bg-page border-dashed">
        <div className="text-xs font-semibold text-muted uppercase mb-2">Constructor</div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-night">
          <span className="px-2 py-1 rounded-lg bg-brand-soft text-brand-dark">SI</span>
          <span className="text-muted">[evento]</span>
          <span className="px-2 py-1 rounded-lg bg-gold-soft text-gold">ENTONCES</span>
          <span className="text-muted">[acción]</span>
          <span className="text-muted">→</span>
          <span className="text-muted">[destino]</span>
        </div>
      </Card>

      {rules.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon="⚡"
            title="Sin automatizaciones"
            message="Crea reglas para notificar, sonar o imprimir ante eventos."
            action={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nueva regla</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0">
                  <Zap size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-night">{r.name}</span>
                    <Badge tone={r.active ? 'success' : 'muted'}>{r.active ? 'Activa' : 'Inactiva'}</Badge>
                    <Badge tone="blue">{whenLabel(r.when)}</Badge>
                    <Badge tone="gold">{thenLabel(r.then)}</Badge>
                  </div>
                  <p className="text-sm text-muted mt-1 font-medium">{phrase(r)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Toggle checked={!!r.active} onChange={(v) => { updateRule(r.id, { active: v }); refresh() }} />
                  <button onClick={() => testRule(r)} title="Probar" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-brand transition"><Play size={15} /></button>
                  <button onClick={() => openEdit(r)} title="Editar" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-gold transition"><Pencil size={15} /></button>
                  <button onClick={() => setDel(r)} title="Eliminar" className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-danger transition"><Trash2 size={15} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar regla' : 'Nueva regla'} maxW="max-w-lg">
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Avisar cocina" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SI (cuando)">
              <Select value={form.when} onChange={(e) => set('when', e.target.value)}>
                {WHEN_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="ENTONCES (acción)">
              <Select value={form.then} onChange={(e) => set('then', e.target.value)}>
                {THEN_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Destino / target" hint="Ej. Cocina, Mostrador, ticket">
            <Input value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="Cocina" />
          </Field>
          <div className="bg-page rounded-xl px-3 py-2 text-sm text-muted">
            Vista previa: <span className="font-semibold text-night">{phrase(form)}</span>
          </div>
          <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Regla activa" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editing ? 'Guardar' : 'Crear regla'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Eliminar regla"
        message={del ? `¿Eliminar «${del.name}»?` : ''}
        danger
        confirmLabel="Eliminar"
        onConfirm={confirmDel}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}
