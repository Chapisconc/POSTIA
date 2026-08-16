import React, { useState, useEffect } from 'react'

const TONES = {
  brand: { pill: 'brand', dot: 'tone-dot brand', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-brand))]', glowActive: 'shadow-[0_0_14px_2px_rgb(var(--c-brand))]' },
  info: { pill: 'info', dot: 'tone-dot info', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-info))]', glowActive: 'shadow-[0_0_14px_2px_rgb(var(--c-info))]' },
  success: { pill: 'success', dot: 'tone-dot success', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-success))]', glowActive: 'shadow-[0_0_14px_2px_rgb(var(--c-success))]' },
  warning: { pill: 'warning', dot: 'tone-dot warning', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-warning))]', glowActive: 'shadow-[0_0_14px_2px_rgb(var(--c-warning))]' },
  neutral: { pill: 'muted', dot: 'tone-dot muted', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-muted))]', glowActive: 'shadow-[0_0_14px_2px_rgb(100 116 139)]' },
  danger: { pill: 'danger', dot: 'tone-dot danger', glow: 'shadow-[0_0_8px_1px_rgb(var(--c-danger))]', glowActive: 'shadow-[0_0_14px_2px_rgb(var(--c-danger))]' },
}

// Filtro de estados modular con dos modos:
//  - Completo (>= 600px, incluye la vista intermedia de tablet / media
//    pantalla): píldoras de vidrio (glass-pill) que SOLO se rellenan de color
//    al seleccionarlas; el punto interior lleva el color del estado con un
//    brillo suave. Las píldoras bajan de línea (flex-wrap) cuando el ancho no
//    alcanza, en lugar de comprimirse o superponerse.
//  - Compacto (< 600px, móvil): botoncitos de ancho fijo con el punto de
//    color y una micro-etiqueta encima; las filas que se envuelven quedan
//    centradas. La activa se rellena y emite su halo.
export default function StatusFilter({ options, value, onChange, className = '' }) {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 599px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 599px)')
    const onChangeMode = (e) => setCompact(e.matches)
    mq.addEventListener('change', onChangeMode)
    return () => mq.removeEventListener('change', onChangeMode)
  }, [])

  const toneOf = (o) => TONES[o.tone] || TONES.neutral

  if (compact) {
    return (
      <div className={`min-w-0 ${className}`}>
        <div className="flex flex-wrap items-start justify-center gap-x-1 gap-y-2 px-0.5 py-1">
          {options.map((o) => {
            const active = value === o.id
            const tone = toneOf(o)
            return (
              <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={active}
                title={o.label} className="w-11 flex flex-col items-center gap-1.5 touch-target group">
                  <span className="text-[10px] leading-none font-semibold text-night truncate max-w-full group-hover:text-brand">
                    {o.label}
                  </span>
                {active ? (
                  <span className={`grid place-items-center rounded-full status-pill ${tone.pill} w-8 h-8 ${tone.glowActive} transition`} />
                ) : (
                  <span className="grid place-items-center rounded-full glass-pill w-8 h-8 transition group-hover:opacity-90">
                    <span className={`w-2 h-2 rounded-full ${tone.dot} ${tone.glow}`} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 px-1 py-1">
        {options.map((o) => {
          const active = value === o.id
          const tone = toneOf(o)
          return (
            <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap shrink-0 touch-target ${active ? `status-pill ${tone.pill} ${tone.glowActive}` : 'glass-pill hover:opacity-90 text-night'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-page shadow-[0_0_6px_2px_rgba(255,255,255,0.45)]' : `${tone.dot} ${tone.glow}`}`} />
              <span className="truncate max-w-full">{o.label}</span>
              {o.count != null && o.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-page/25' : 'pill-count'}`}>{o.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
