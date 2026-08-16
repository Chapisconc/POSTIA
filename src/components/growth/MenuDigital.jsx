import React, { useEffect, useState } from 'react'
import { QrCode, ExternalLink, Smartphone } from 'lucide-react'
import {
  Card, Button, Badge, Field, Input, Select, Textarea, Toggle, PageHeader, StatCard,
} from '../ui'
import { getMenuDigital, updateMenuDigital } from '../../lib/storage'
import { toastOk } from '../../lib/notify'

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

  useEffect(() => {
    const m = state.menuDigital || getMenuDigital()
    setForm({
      enabled: m.enabled !== false,
      mode: m.mode === 'menu' || m.mode === 'view' ? 'menu' : 'order',
      services: {
        llevar: m.services?.llevar !== false,
        domicilio: m.services?.domicilio !== false,
        mesa: m.services?.mesa !== false,
      },
      accent: m.accent || '#16A34A',
      welcome: m.welcome || 'Bienvenido a POSTIA',
    })
  }, [state.menuDigital])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setSvc = (k, v) => setForm((f) => ({ ...f, services: { ...f.services, [k]: v } }))

  const save = () => {
    updateMenuDigital({
      enabled: form.enabled,
      mode: form.mode === 'menu' ? 'menu' : 'order',
      services: { ...form.services },
      accent: form.accent,
      welcome: form.welcome.trim() || 'Bienvenido a POSTIA',
    })
    refresh()
    toastOk('Menú digital guardado')
  }

  const openPublic = () => {
    const url = `${window.location.origin}${window.location.pathname}?menu=1`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const svcCount = [form.services.llevar, form.services.domicilio, form.services.mesa].filter(Boolean).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Menú digital"
        subtitle="Configura el menú público para clientes"
        actions={
          <>
            <Button variant="outline" onClick={openPublic} disabled={!form.enabled}>
              <ExternalLink size={16} className="mr-1" /> Abrir menú
            </Button>
            <Button onClick={save}>Guardar</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={QrCode}
          label="Estado"
          value={form.enabled ? 'Activo' : 'Inactivo'}
          sub={form.enabled ? 'Visible con ?menu=1' : 'Deshabilitado'}
          tone={form.enabled ? 'brand' : 'danger'}
        />
        <StatCard
          icon={Smartphone}
          label="Modo"
          value={form.mode === 'order' ? 'Pedidos' : 'Solo menú'}
          sub={form.mode === 'order' ? 'Clientes pueden ordenar' : 'Solo consulta'}
          tone="blue"
        />
        <StatCard
          icon={ExternalLink}
          label="Servicios"
          value={svcCount}
          sub="Canales habilitados"
          tone="gold"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-night">Configuración</h3>
          <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} label="Menú digital habilitado" />
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
          <Button className="w-full" onClick={save}>Guardar cambios</Button>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-night mb-3">Vista previa</h3>
          <div className="rounded-2xl overflow-hidden border border-line shadow-sm">
            <div className="bg-night text-white px-5 py-6 text-center" style={{ borderBottom: `3px solid ${form.accent}` }}>
              <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center text-2xl mb-2" style={{ background: form.accent }}>🌿</div>
              <div className="font-extrabold text-lg">{state.meta?.businessName || 'POSTIA'}</div>
              <p className="text-white/60 text-sm mt-1">{form.welcome || 'Bienvenido'}</p>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {form.enabled ? <Badge tone="success">Habilitado</Badge> : <Badge tone="danger">Deshabilitado</Badge>}
                <Badge tone="white">{form.mode === 'order' ? 'Pedidos' : 'Solo menú'}</Badge>
              </div>
            </div>
            <div className="bg-card p-4 space-y-2">
              <div className="text-xs font-semibold text-muted uppercase">Servicios activos</div>
              <div className="flex flex-wrap gap-2">
                {form.services.llevar && <Badge tone="brand">🥡 Llevar</Badge>}
                {form.services.domicilio && <Badge tone="blue">🚗 Domicilio</Badge>}
                {form.services.mesa && <Badge tone="gold">🍽️ Mesa</Badge>}
                {!svcCount && <span className="text-sm text-muted">Ningún servicio activo</span>}
              </div>
              <p className="text-xs text-muted pt-2">URL pública: <code className="font-mono bg-page px-1.5 py-0.5 rounded">/?menu=1</code></p>
              <Button variant="outline" className="w-full mt-2" onClick={openPublic} disabled={!form.enabled}>
                <ExternalLink size={14} className="mr-1" /> Abrir en nueva pestaña
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
