import React, { useState } from 'react'
import { Settings, QrCode, ShoppingCart, Truck, Users, CreditCard, Clock, ArrowRight, Eye, Store, Package, Heart } from 'lucide-react'
import { Button, Field, Input, Toggle, PageHeader } from '../ui'
import { fmtMoney } from '../../lib/format'

// Estado local (no persistido aún)
const DEFAULT = {
  acceptOrders: true,
  channel: 'olapluswhatsapp', // 'olapluswhatsapp' | 'ola'
  whatsapp: '+52 3336740771',
  incomingState: 'pendiente', // 'pendiente' | 'preparando'
  ridersOwn: false,
  deliveryApps: false,
  manualRider: true,
  delivery: { active: false, entranceState: 'pendiente' },
  takeaway: { active: false, advancedOpen: false },
  local: { active: false, qrMode: 'generic', qrSpecific: false },
  table: { active: false, servicePrice: 0, acceptTips: false },
  tips: { active: false },
  menuQr: false,
  qrSpecific: false,
  qrMenu: false,
  upsellCart: true,
  suggestLastOrders: true,
}

export default function SettingsPage({ onNav }) {
  const [s, setS] = useState(DEFAULT)

  const set = (path, value) => setS((prev) => {
    const next = { ...prev }
    const parts = path.split('.')
    let cur = next
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = { ...cur[parts[i]] }
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
    return next
  })

  const toggle = (path) => set(path, !s[path])
  const toggleBoolPath = (key) => set(key, !s[key])

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Header */}
        <PageHeader title="Configuración de pedidos" subtitle="Canales de entrada, repartidores, tipos de servicio, menú digital y estrategias de venta" />

        {/* ====== SECCIÓN 1: Aceptar pedidos ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
                <Store size={20} className="text-brand-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">Aceptar pedidos</h3>
                <p className="text-xs text-muted mt-0.5">Tus clientes acceden a tu menú digital (código QR o enlace) para realizar pedidos.</p>
              </div>
            </div>
            <Toggle checked={s.acceptOrders} onChange={() => toggleBoolPath('acceptOrders')} />
          </div>

          {s.acceptOrders && (
            <div className="space-y-4 pt-2">
              {/* Canal */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="channel" value="olapluswhatsapp" checked={s.channel === 'olapluswhatsapp'} onChange={() => set('channel', 'olapluswhatsapp')} className="accent-brand" />
                  <span className="text-sm text-night font-medium">OlaClick + WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="channel" value="ola" checked={s.channel === 'ola'} onChange={() => set('channel', 'ola')} className="accent-brand" />
                  <span className="text-sm text-night font-medium">OlaClick</span>
                </label>
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-3">
                <FlagIcon code="mx" className="!w-8 !h-5" />
                <Input
                  value={s.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  placeholder="+52 3336740771"
                  className="flex-1"
                />
                <span className="text-xs text-muted">WhatsApp para pedidos</span>
              </div>

              {/* Estado de ingreso */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="incomingState" value="pendiente" checked={s.incomingState === 'pendiente'} onChange={() => set('incomingState', 'pendiente')} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">Los pedidos ingresan al PDV en estado "Pendiente"</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="incomingState" value="preparando" checked={s.incomingState === 'preparando'} onChange={() => set('incomingState', 'preparando')} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">Los pedidos ingresan al PDV en estado "En preparación"</span>
                </label>
              </div>

              {/* Botón configurar envío */}
              <Button variant="outline" onClick={() => onNav('delivery')} className="w-full justify-start border-line text-info hover:bg-info-soft">
                <Truck size={14} className="mr-1.5" /> Configurar precios y cobertura de envío
              </Button>
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 2: A domicilio ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Truck size={20} className="text-info" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">A domicilio</h3>
              </div>
            </div>
            <Toggle checked={s.delivery.active} onChange={() => toggle('delivery.active')} />
          </div>

          {s.delivery.active && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted">Configurar precios y cobertura de envío.</p>
              <Button variant="outline" onClick={() => onNav('delivery')} className="w-full justify-start border-line text-info hover:bg-info-soft">
                <Truck size={14} className="mr-1.5" /> Editar configuración de envío
              </Button>

              <p className="text-sm text-muted mt-4">Configura tus repartidores propios.</p>
              <Button variant="outline" onClick={() => onNav('riders')} className="w-full justify-start border-line text-info hover:bg-info-soft">
                <Users size={14} className="mr-1.5" /> Editar configuración de repartidores
              </Button>

              <p className="text-sm text-muted mt-4">Configura repartidores de aplicaciones de entrega.</p>
              <Button variant="outline" onClick={() => onNav('deliveryApps')} className="w-full justify-start border-line text-info hover:bg-info-soft">
                <CreditCard size={14} className="mr-1.5" /> Editar proveedores
              </Button>

              <p className="text-sm text-muted mt-4">Configura cómo solicitar repartidores.</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="manualRider" value="manual" checked={s.manualRider} onChange={() => set('manualRider', true)} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">Solicitar manualmente</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="manualRider" value="auto" checked={!s.manualRider} onChange={() => set('manualRider', false)} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">Solicitar automáticamente</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 3: Para llevar ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
                <Package size={20} className="text-success-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">Para llevar</h3>
              </div>
            </div>
            <Toggle checked={s.takeaway.active} onChange={() => toggle('takeaway.active')} />
          </div>

          {s.takeaway.active && (
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => set('takeaway.advancedOpen', !s.takeaway.advancedOpen)}
                className="flex items-center gap-2 text-sm text-muted hover:text-night transition w-full justify-between px-3 py-2 rounded-lg border border-line hover:border-brand bg-page"
              >
                <span className="font-medium">Opciones avanzadas</span>
                <ArrowRight size={14} className={`transition transform ${s.takeaway.advancedOpen ? 'rotate-90' : ''}`} />
              </button>

              {s.takeaway.advancedOpen && (
                <div className="space-y-3 pl-3 border-l border-line">
                  <Toggle
                    label="Solicita información adicional"
                    checked={s.takeaway.infoAdicional}
                    onChange={() => set('takeaway.infoAdicional', !s.takeaway.infoAdicional)}
                  />
                  <Field label="Precio de servicio">
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.takeaway.servicePrice || 0}
                        onChange={(e) => set('takeaway.servicePrice', Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </Field>
                  <Field label="Precio de embalaje">
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.takeaway.packagingPrice || 0}
                        onChange={(e) => set('takeaway.packagingPrice', Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </Field>
                  <Toggle
                    label="Permite pedidos programados"
                    checked={s.takeaway.scheduled}
                    onChange={() => set('takeaway.scheduled', !s.takeaway.scheduled)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 4: En el local ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-soft flex items-center justify-center">
                <Heart size={20} className="text-gold-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">En el local</h3>
              </div>
            </div>
            <Toggle checked={s.local.active} onChange={() => toggle('local.active')} />
          </div>

          {s.local.active && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted">Ideal para servicios rápidos... Funciona con códigos QR genéricos o únicos.</p>

              <p className="text-sm text-muted">Habilitar pedidos con...</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="qrMode" value="generic" checked={s.local.qrMode === 'generic'} onChange={() => set('local.qrMode', 'generic')} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">QR genérico</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="qrMode" value="specific" checked={s.local.qrMode === 'specific'} onChange={() => set('local.qrMode', 'specific')} className="accent-brand" />
                  <span className="text-sm text-night-light font-medium">QR's específicos (Mesa/Habitaciones/tienda)</span>
                </label>
              </div>

              <Button variant="outline" onClick={() => onNav('qrConfig')} className="w-full justify-start border-info/30 text-info hover:bg-info-soft">
                <QrCode size={14} className="mr-1.5" /> Configurar QRs
              </Button>
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 5: En mesa (solo PDV) ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
                <Store size={20} className="text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">En mesa (solo PDV)</h3>
              </div>
            </div>
            <Toggle checked={s.table.active} onChange={() => toggle('table.active')} />
          </div>

          {s.table.active && (
            <div className="space-y-4 pt-2">
              <Field label="Precio por servicio">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={s.table.servicePrice || 0}
                    onChange={(e) => set('table.servicePrice', Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              </Field>

              <Toggle
                label="Aceptar propinas"
                checked={s.table.acceptTips}
                onChange={() => set('table.acceptTips', !s.table.acceptTips)}
              />
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 6: Propinas ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-soft flex items-center justify-center">
                <Heart size={20} className="text-gold-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">Propinas</h3>
              </div>
            </div>
            <Toggle checked={s.tips.active} onChange={() => toggle('tips.active')} />
          </div>

          {s.tips.active && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted">Activar funcionalidad de propinas en pedidos.</p>
            </div>
          )}
        </div>

        {/* ====== SECCIÓN 7: Enlaces y código QR de tu Menú ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <h3 className="text-lg font-bold text-night mb-4">Enlaces y código QR de tu Menú</h3>
          <Button variant="outline" onClick={() => onNav('menuQr')} className="w-full justify-start border-info/30 text-info hover:bg-info-soft">
            <QrCode size={14} className="mr-1.5" /> Ir a enlaces y código QR
          </Button>
        </div>

        {/* ====== SECCIÓN 8: Incrementa el carrito de tus clientes ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
                <ShoppingCart size={20} className="text-brand-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">Incrementa el carrito de tus clientes</h3>
              </div>
            </div>
            <Toggle checked={s.upsellCart} onChange={() => toggle('upsellCart')} />
          </div>

          <Button variant="outline" onClick={() => toastOk('Más información sobre Incrementa el carrito (próximamente)')} className="w-full justify-start mt-2 border-info/30 text-info hover:bg-info-soft">
            <Eye size={14} className="mr-1.5" /> Más información
          </Button>
        </div>

        {/* ====== SECCIÓN 9: Sugiere a tus clientes lo último que pidieron ====== */}
        <div className="bg-card rounded-xl border border-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-soft flex items-center justify-center">
                <Users size={20} className="text-gold-dark" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-night">Sugiere a tus clientes lo último que pidieron</h3>
                <p className="text-xs text-muted mt-0.5">(solo menú digital)</p>
              </div>
            </div>
            <Toggle checked={s.suggestLastOrders} onChange={() => toggle('suggestLastOrders')} />
          </div>

          <Button variant="outline" onClick={() => toastOk('Más información sobre Sugiere últimos pedidos (próximamente)')} className="w-full justify-start mt-2 border-info/30 text-info hover:bg-info-soft">
            <Eye size={14} className="mr-1.5" /> Más información
          </Button>
        </div>
      </div>
    </div>
  )
}

// Componente auxiliar para el icono de bandera
function FlagIcon({ code }) {
  const flagMap = {
    mx: '🇲🇽',
    us: '🇺🇸',
    ca: '🇨🇦',
    es: '🇪🇸',
    ar: '🇦🇷',
  }
  return (
    <span className="!w-8 !h-5">{flagMap[code] || '🏳️'}</span>
  )
}
