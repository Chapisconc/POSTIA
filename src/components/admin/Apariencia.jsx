import React from 'react'
import {
  FONT_OPTIONS, THEME_OPTIONS, DENSITY_OPTIONS, RADIUS_OPTIONS, SIDEBAR_OPTIONS, STYLE_OPTIONS,
  PALETTE_OPTIONS,
  useTheme, DEFAULT_PREFS,
} from '../../lib/theme'
import { Card, Button, PageHeader, Badge } from '../ui'
import { toastOk } from '../../lib/notify'

function OptionGroup({ label, options, value, onChange, cols = 2, colorKey }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>
      <div className={`grid gap-1.5 ${cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {options.map((o) => {
          const active = value === o.id
          return (
            <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={active}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition whitespace-nowrap flex items-center justify-between ${
                active ? 'border-brand bg-brand-soft text-brand-dark shadow-sm' : 'border-line bg-card text-night hover:bg-page'
              }`}>
              <span>{o.label}</span>
              {colorKey && (
                <span className="ml-2 h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: `rgb(${o[colorKey]})` }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Preview({ prefs }) {
  const isDark = prefs.theme === 'dark' || (prefs.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <div className="bg-card rounded-2xl border border-line shadow-sm overflow-hidden transition">
      <div className="px-4 py-3 flex items-center gap-2.5 bg-brand text-white">
        <span className="text-xl">🌿</span>
        <div className="min-w-0">
          <div className="font-extrabold text-sm leading-tight">POSTIA</div>
          <div className="text-[10px] text-white/60">Punto de venta</div>
        </div>
        <Badge tone="success" className="ml-auto">En línea</Badge>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted text-xs">Pedido #1042 · Mesa 3</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-warning-soft text-warning-dark px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" /> En cocina
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>🍗 Alitas 10 BBQ <span className="text-muted text-xs">×2</span></span>
          <span className="font-mono font-semibold tabular-nums">$360.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>🥤 Refresco <span className="text-muted text-xs">×2</span></span>
          <span className="font-mono font-semibold tabular-nums">$70.00</span>
        </div>
        <div className="flex justify-between font-bold pt-2 border-t border-line">
          <span>Total</span>
          <span className="font-mono text-brand tabular-nums">$430.00</span>
        </div>
        <button type="button" className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition shadow-sm">
          Cobrar ahora
        </button>
      </div>
      <div className="px-4 py-2.5 border-t border-line flex items-center justify-between text-[11px] text-muted">
        <span className="font-semibold uppercase tracking-wide">Vista previa</span>
        <span>{isDark ? 'Tema oscuro' : 'Tema claro'}</span>
      </div>
    </div>
  )
}

export default function Apariencia() {
  const [prefs, setPrefs] = useTheme()
  const set = (key) => (value) => setPrefs((p) => ({ ...p, [key]: value }))

  return (
    <div className="space-y-5">
      <PageHeader title="Apariencia" subtitle="Personaliza el sistema visual de POSTIA en tiempo real" />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5 space-y-4">
            <OptionGroup label="Tema" options={THEME_OPTIONS} value={prefs.theme} onChange={set('theme')} cols={3} />
          </Card>

          <Card className="p-4 sm:p-5 space-y-4">
            <OptionGroup label="Paleta de color" options={PALETTE_OPTIONS} value={prefs.palette} onChange={set('palette')} cols={3} colorKey="accent" />
          </Card>

          <Card className="p-4 sm:p-5 space-y-4">
            <OptionGroup label="Tipografía" options={FONT_OPTIONS} value={prefs.font} onChange={set('font')} cols={3} />
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5 space-y-4">
              <OptionGroup label="Densidad" options={DENSITY_OPTIONS} value={prefs.density} onChange={set('density')} cols={3} />
            </Card>
            <Card className="p-4 sm:p-5 space-y-4">
              <OptionGroup label="Bordes" options={RADIUS_OPTIONS} value={prefs.radius} onChange={set('radius')} cols={3} />
            </Card>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5 space-y-4">
              <OptionGroup label="Estilo visual" options={STYLE_OPTIONS} value={prefs.style} onChange={set('style')} cols={2} />
            </Card>
            <Card className="p-4 sm:p-5 space-y-4">
              <OptionGroup label="Menú lateral" options={SIDEBAR_OPTIONS} value={prefs.sidebar} onChange={set('sidebar')} cols={3} />
            </Card>
          </div>

          <Card className="p-4 sm:p-5 space-y-4">
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setPrefs({ ...DEFAULT_PREFS }); toastOk('Apariencia restablecida') }}>
                Restablecer
              </Button>
            </div>
          </Card>
        </div>

        <Preview prefs={prefs} />
      </div>
    </div>
  )
}
