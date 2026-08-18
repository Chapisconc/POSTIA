import React, { useMemo, useState } from 'react'
import {
  Megaphone, TicketPercent, Users, Plus, Pencil, Trash2, Trophy, Tag,
} from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Textarea, Modal, ConfirmDialog,
  Toggle, EmptyState, PageHeader, StatCard,
} from '../ui'
import { addCampaign, updateCampaign, deleteCampaign } from '../../lib/storage'
import { fmtMoney, fmtDate } from '../../lib/format'
import { toastOk, toastErr } from '../../lib/notify'
import { clientStatsAll } from '../../lib/stats'

const blank = () => ({ name: '', description: '', active: true, start: '', end: '' })

export default function Marketing({ state, refresh, onNav }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [del, setDel] = useState(null)

  const campaigns = state.campaigns || []
  const coupons = state.coupons || []
  const clients = state.clients || []

  const activeCampaigns = campaigns.filter((c) => c.active).length
  const activeCoupons = coupons.filter((c) => c.active).length
  const topClients = useMemo(() => clientStatsAll(state).slice(0, 5), [state])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(blank()); setOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name || '',
      description: c.description || '',
      active: c.active !== false,
      start: c.start ? String(c.start).slice(0, 10) : '',
      end: c.end ? String(c.end).slice(0, 10) : '',
    })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim()) { toastErr('El nombre es obligatorio'); return }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
      start: form.start || null,
      end: form.end || null,
    }
    if (editing) {
      updateCampaign(editing.id, payload)
      toastOk('Campaña actualizada')
    } else {
      addCampaign(payload)
      toastOk('Campaña creada')
    }
    setOpen(false)
    refresh()
  }

  const confirmDel = () => {
    deleteCampaign(del.id)
    setDel(null)
    refresh()
    toastOk('Campaña eliminada')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marketing"
        subtitle="Campañas, cupones y clientes fidelizados"
        actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nueva campaña</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Megaphone} label="Campañas activas" value={activeCampaigns} sub={`${campaigns.length} en total`} tone="brand" onClick={() => {}} />
        <StatCard icon={TicketPercent} label="Cupones activos" value={activeCoupons} sub={`${coupons.length} en total`} tone="gold" onClick={() => onNav?.('cupones')} />
        <StatCard icon={Users} label="Clientes" value={clients.length} sub="Base registrada" tone="blue" onClick={() => onNav?.('clientes')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-night flex items-center gap-2"><Megaphone size={16} className="text-brand" /> Campañas</h3>
            <Button variant="outline" className="!text-xs !py-1" onClick={openCreate}><Plus size={14} className="mr-1" /> Nueva</Button>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState icon="📣" title="Sin campañas" message="Crea tu primera campaña promocional." action={<Button onClick={openCreate}>Crear campaña</Button>} />
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-page border border-line/60">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-night">{c.name}</span>
                      <Badge tone={c.active ? 'success' : 'muted'}>{c.active ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                    {c.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{c.description}</p>}
                    <div className="text-[11px] text-muted mt-1">
                      {c.start || c.end ? `${fmtDate(c.start)} → ${fmtDate(c.end)}` : 'Sin vigencia'}
                      {c.createdAt ? ` · creada ${fmtDate(c.createdAt)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Toggle checked={!!c.active} onChange={(v) => { updateCampaign(c.id, { active: v }); refresh() }} />
                    <button onClick={() => openEdit(c)} className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-gold transition"><Pencil size={15} /></button>
                    <button onClick={() => setDel(c)} className="touch-icon p-2 rounded-lg hover:bg-line text-muted hover:text-danger transition"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-night flex items-center gap-2"><Tag size={16} className="text-gold" /> Cupones</h3>
              <button onClick={() => onNav?.('cupones')} className="text-xs font-semibold text-brand hover:underline">Ver todos</button>
            </div>
            {coupons.length === 0 ? (
              <EmptyState icon="🎟️" title="Sin cupones" message="Administra cupones en el módulo Cupones." />
            ) : (
              <div className="space-y-2">
                {coupons.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-page border border-line/60">
                    <code className="font-mono text-xs font-bold bg-night text-white px-2 py-1 rounded-lg">{c.code}</code>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-night truncate">{c.name}</div>
                      <div className="text-[11px] text-muted">
                        {c.type === 'percent' ? `${c.value}%` : fmtMoney(c.value)}
                        {c.minPurchase > 0 ? ` · min ${fmtMoney(c.minPurchase)}` : ''}
                      </div>
                    </div>
                    <Badge tone={c.active ? 'brand' : 'muted'}>{c.active ? 'Activo' : 'Off'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-night flex items-center gap-2"><Trophy size={16} className="text-gold" /> Top clientes</h3>
              <button onClick={() => onNav?.('fidelidad')} className="text-xs font-semibold text-brand hover:underline">Fidelidad</button>
            </div>
            {topClients.length === 0 ? (
              <EmptyState icon="🏆" title="Sin datos" message="Cuando haya compras aparecerá el ranking." />
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-page transition">
                    <span className={`w-7 h-7 grid place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold-soft text-gold' : i === 1 ? 'bg-line text-muted' : i === 2 ? 'bg-warning-soft text-warning-dark' : 'bg-page text-muted'}`}>
                      {['🥇', '🥈', '🥉'][i] || i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-night text-sm truncate">{c.name}</div>
                      <div className="text-[11px] text-muted">{c.ordersCount} pedidos</div>
                    </div>
                    <span className="font-mono text-sm font-bold text-brand">{fmtMoney(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar campaña' : 'Nueva campaña'} maxW="max-w-lg">
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Promo del mes" />
          </Field>
          <Field label="Descripción">
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalle de la promoción…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio">
              <Input type="date" value={form.start} onChange={(e) => set('start', e.target.value)} />
            </Field>
            <Field label="Fin">
              <Input type="date" value={form.end} onChange={(e) => set('end', e.target.value)} />
            </Field>
          </div>
          <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Campaña activa" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Eliminar campaña"
        message={del ? `¿Eliminar «${del.name}»?` : ''}
        danger
        confirmLabel="Eliminar"
        onConfirm={confirmDel}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}
