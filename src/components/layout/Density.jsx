import React from 'react'
import { DENSITY_OPTIONS } from '../../lib/theme'

export function DensityToggle({ value, onChange, className = '' }) {
  return (
    <div className={`hidden lg:flex items-center gap-0.5 bg-white/15 p-0.5 rounded-lg ${className}`} title="Densidad de pantalla">
      {DENSITY_OPTIONS.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${value === o.id ? 'bg-white text-night shadow-sm' : 'text-white/70 hover:text-white'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
