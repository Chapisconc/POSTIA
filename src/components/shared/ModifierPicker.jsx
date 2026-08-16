import React, { useState } from 'react'
import { Button, Field } from '../ui'
import { fmtMoney } from '../../lib/format'

// Selector de modificadores para un producto.
// props: product, groups (modGroups del estado), onConfirm({qty, modifiers, note}), onCancel, initial (linea previa)
export default function ModifierPicker({ product, groups, onConfirm, onCancel, initial = null }) {
  const [qty, setQty] = useState(initial?.qty || 1)
  const [sel, setSel] = useState(() => {
    const m = {}
    for (const it of initial?.modifiers || []) {
      m[it.groupId] = m[it.groupId] || []
      m[it.groupId].push(it.id)
    }
    return m
  })
  const [note, setNote] = useState(initial?.note || '')

  const mods = (groups || []).filter((g) => (product.modGroupIds || []).includes(g.id))
  const pickedMods = []
  for (const g of mods) {
    for (const id of sel[g.id] || []) {
      const it = g.items.find((x) => x.id === id)
      if (!it) continue
      let price = Number(it.price) || 0
      if (g.surchargeSecond && g.surchargeSecond.enabled) {
        const idx = (sel[g.id] || []).indexOf(id)
        if (idx >= 1) price += Number(g.surchargeSecond.price) || 0
      }
      pickedMods.push({ groupId: g.id, groupName: g.name, id: it.id, name: it.name, price })
    }
  }
  const extraPrice = pickedMods.reduce((a, m) => a + m.price, 0)
  const unit = (Number(product.price) || 0) + extraPrice

  const toggle = (g, item) => {
    setSel((prev) => {
      const cur = prev[g.id] || []
      let next
      if (g.max === 1) next = cur.includes(item.id) ? [] : [item.id]
      else next = cur.includes(item.id) ? cur.filter((x) => x !== item.id) : [...cur, item.id]
      if (g.max && next.length > g.max) next = next.slice(0, g.max)
      return { ...prev, [g.id]: next }
    })
  }

  const valid = mods.filter((g) => g.required).every((g) => (sel[g.id] || []).length >= Math.max(1, g.min || 1))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{product.emoji}</span>
        <div>
          <div className="font-bold text-night">{product.name}</div>
          <div className="text-sm text-muted">{product.description}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-night">Cantidad</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="touch-icon w-9 h-9 rounded-xl border border-line bg-card text-night hover:bg-line text-lg">−</button>
          <span className="w-10 text-center font-mono font-bold text-xl text-night">{qty}</span>
          <button type="button" onClick={() => setQty(qty + 1)} className="touch-icon w-9 h-9 rounded-xl border border-line bg-card text-brand hover:bg-brand-soft text-lg">+</button>
        </div>
      </div>

      {mods.map((g) => (
        <div key={g.id} className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-night text-sm">{g.name}</span>
            <span className="text-[11px] text-muted">
              {g.max > 1 ? `Máx ${g.max}` : g.required ? 'Obligatorio' : 'Opcional'}
              {g.surchargeSecond?.enabled ? ' · 2º con recargo' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {g.items.map((it) => {
              const active = (sel[g.id] || []).includes(it.id)
              const idx = (sel[g.id] || []).indexOf(it.id)
              const price = Number(it.price) || 0
              const label = idx >= 1 && g.surchargeSecond?.enabled ? price + (Number(g.surchargeSecond.price) || 0) : price
              return (
                <button key={it.id} type="button" onClick={() => toggle(g, it)}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition flex items-center gap-1 touch-target ${active ? 'border-brand bg-brand-soft text-brand-dark font-semibold ring-1 ring-brand' : 'border-line bg-card text-night hover:bg-page'}`}>
                  <span className={`w-4 h-4 shrink-0 grid place-items-center rounded ${g.max === 1 ? 'rounded-full' : 'rounded'} border ${active ? 'bg-brand border-brand' : 'border-line'}`}>
                    {active && <span className="text-white text-[10px] leading-none">✓</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  {label > 0 && <span className="text-[11px] font-mono text-muted whitespace-nowrap">+{fmtMoney(label)}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <Field label="Comentarios (opcional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Sin cebolla, extra picante…"
          className="w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand" />
      </Field>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <div>
          <div className="text-xs text-muted">{qty} × {fmtMoney(unit)}</div>
          <div className="font-extrabold text-night font-mono text-lg">{fmtMoney(qty * unit)}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => onConfirm({ qty, modifiers: pickedMods, note })}>
            Agregar · {fmtMoney(qty * unit)}
          </Button>
        </div>
      </div>
    </div>
  )
}
