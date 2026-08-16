import React, { useEffect, useState } from 'react'
import { Bell, Volume2, Vibrate, Eye } from 'lucide-react'
import {
  Card, Button, Toggle, PageHeader, StatCard, Badge,
} from '../ui'
import { toastOk, toast } from '../../lib/notify'
import { updateSettings, getSettings } from '../../lib/storage'
import { soundOk, vibrate, browserNotify } from '../../lib/sound'

export default function NotificacionesCfg({ state, refresh }) {
  const settings = state.settings || getSettings()
  const n = settings.notifications || {}
  const [local, setLocal] = useState({
    sound: n.sound !== false,
    vibration: n.vibration !== false,
    visual: n.visual !== false,
  })
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPerm(Notification.permission)
  }, [])

  const patch = (partial) => {
    const next = { ...local, ...partial }
    setLocal(next)
    updateSettings({ notifications: next })
    toastOk('Notificaciones actualizadas')
    refresh()
  }

  const requestPerm = async () => {
    if (!('Notification' in window)) {
      toast('Este navegador no soporta notificaciones', 'warning')
      return
    }
    try {
      const p = await Notification.requestPermission()
      setPerm(p)
      if (p === 'granted') toastOk('Permiso concedido')
      else toast('Permiso denegado o pendiente', 'warning')
    } catch {
      toast('No se pudo solicitar permiso', 'error')
    }
  }

  const probar = () => {
    toast('Notificación de prueba POSTIA', 'success')
    if (local.sound) soundOk()
    if (local.vibration) vibrate(200)
    if (local.visual) browserNotify('POSTIA', 'Notificación de prueba del sistema')
    toastOk('Prueba enviada')
  }

  const permTone = perm === 'granted' ? 'success' : perm === 'denied' ? 'danger' : 'amber'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notificaciones"
        subtitle="Sonido, vibración y alertas del navegador"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={requestPerm}>Pedir permiso</Button>
            <Button onClick={probar}><span className="inline-flex items-center gap-1.5"><Bell size={16} /> Probar</span></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Volume2} label="Sonido" value={local.sound ? 'ON' : 'OFF'} tone="brand" />
        <StatCard icon={Vibrate} label="Vibración" value={local.vibration ? 'ON' : 'OFF'} tone="gold" />
        <StatCard icon={Eye} label="Visual" value={local.visual ? 'ON' : 'OFF'} tone="blue" />
        <StatCard icon={Bell} label="Permiso" value={perm === 'granted' ? 'OK' : perm === 'denied' ? 'No' : '…'} sub={perm} tone="purple" />
      </div>

      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-night">Permiso del navegador</div>
            <div className="text-xs text-muted mt-0.5">Necesario para alertas fuera de la pestaña</div>
          </div>
          <Badge tone={permTone}>{perm}</Badge>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-dark grid place-items-center"><Volume2 size={18} /></div>
            <div>
              <div className="text-sm font-medium text-night">Sonido</div>
              <div className="text-xs text-muted">Beep al recibir pedidos o alertas</div>
            </div>
          </div>
          <Toggle checked={local.sound} onChange={(v) => patch({ sound: v })} />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold grid place-items-center"><Vibrate size={18} /></div>
            <div>
              <div className="text-sm font-medium text-night">Vibración</div>
              <div className="text-xs text-muted">Vibra en dispositivos compatibles</div>
            </div>
          </div>
          <Toggle checked={local.vibration} onChange={(v) => patch({ vibration: v })} />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 grid place-items-center"><Eye size={18} /></div>
            <div>
              <div className="text-sm font-medium text-night">Notificación visual</div>
              <div className="text-xs text-muted">Toast y Notification API del sistema</div>
            </div>
          </div>
          <Toggle checked={local.visual} onChange={(v) => patch({ visual: v })} />
        </div>

        <Button className="w-full" variant="outline" onClick={probar}>
          Probar notificación (toast + sonido + vibrar + browser)
        </Button>
      </Card>
    </div>
  )
}
