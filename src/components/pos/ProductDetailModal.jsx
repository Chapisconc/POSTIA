import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus, Plus, Check } from 'lucide-react'
import { fmtMoney } from '../../lib/format'

export default function ProductDetailModal({ open, product, groups, onClose, onAdd }) {
  const [qty, setQty] = useState(1)
  const [sel, setSel] = useState({})
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setQty(1)
    setNote('')
    if (groups && product) {
      const mods = (groups || []).filter((g) => (product.modGroupIds || []).includes(g.id))
      const initial = {}
      for (const g of mods) {
        if (g.defaultValue) {
          const def = g.items.find((x) => x.name === g.defaultValue)
          if (def) initial[g.id] = [def.id]
        } else {
          initial[g.id] = []
        }
      }
      setSel(initial)
    } else {
      setSel({})
    }
  }, [open, product?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !product) return null

  const mods = (groups || []).filter((g) => (product.modGroupIds || []).includes(g.id))

  const pickedMods = []
  for (const g of mods) {
    const selectedIds = sel[g.id] || []
    const freeCount = g.freeCount || 0
    for (let idx = 0; idx < selectedIds.length; idx++) {
      const id = selectedIds[idx]
      const it = g.items.find((x) => x.id === id)
      if (!it) continue
      const isFree = freeCount > 0 && idx < freeCount
      let price = isFree ? 0 : (Number(it.price) || 0)
      if (!isFree && g.surchargeSecond?.enabled) {
        const surchargeIdx = freeCount > 0 ? idx - freeCount : idx
        if (surchargeIdx >= 1) price += Number(g.surchargeSecond.price) || 0
      }
      pickedMods.push({ groupId: g.id, groupName: g.name, id: it.id, name: it.name, price, free: isFree })
    }
  }
  const unit = (Number(product.price) || 0) + pickedMods.reduce((a, m) => a + m.price, 0)
  const total = unit * qty
  const valid = mods.filter((g) => g.required).every((g) => (sel[g.id] || []).length >= Math.max(1, g.min || 1))

  const toggle = (g, item) => {
    setSel((prev) => {
      const cur = prev[g.id] || []
      let next
      if (g.max === 1) next = cur.includes(item.id) ? [] : [item.id]
      else next = cur.includes(item.id) ? cur.filter((x) => x.id !== item.id) : [...cur, item.id]
      if (g.max && next.length > g.max) next = next.slice(0, g.max)
      return { ...prev, [g.id]: next }
    })
  }

  const add = () => {
    if (!valid) return
    onAdd({ product, qty, modifiers: pickedMods, note })
  }

  const portal = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-line rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-line shrink-0">
          <span className="text-4xl">{product.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-night truncate">{product.name}</h3>
            <p className="text-base font-mono font-semibold text-brand dark:text-night">{fmtMoney(product.price)}</p>
          </div>
          <button onClick={onClose} className="touch-icon w-10 h-10 grid place-items-center rounded-xl hover:bg-page transition text-muted">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
          {/* Modifier groups */}
          {mods.map((g) => {
            const isRadio = g.max === 1
            const selected = sel[g.id] || []
            return (
              <div key={g.id} className="rounded-xl border border-line bg-page overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-night">{g.name}</span>
                    {g.required && <span className="px-2 py-0.5 rounded text-xs font-bold bg-warning-soft text-warning-dark uppercase">Req.</span>}
                    {!g.required && <span className="px-2 py-0.5 rounded text-xs font-medium bg-page text-muted">Opc.</span>}
                  </div>
                  <span className="text-xs text-muted">{isRadio ? 'Elige una' : `Hasta ${g.max}`}{g.freeCount > 0 ? ` · ${g.freeCount} gratis` : ''}</span>
                </div>
                <div className="p-3 grid gap-2">
                  {g.items.map((item) => {
                    const active = selected.includes(item.id)
                    const itemIdx = selected.indexOf(item.id)
                    const isFree = g.freeCount > 0 && itemIdx >= 0 && itemIdx < g.freeCount
                    return (
                      <button key={item.id} type="button" onClick={() => toggle(g, item)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition text-sm touch-target ${active ? 'border-brand bg-brand-soft text-brand-dark ring-1 ring-brand' : 'border-line bg-card text-night hover:border-brand/50'}`}>
                        {isRadio ? (
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-brand' : 'border-line'}`}>
                            {active && <span className="w-2.5 h-2.5 rounded-full bg-brand" />}
                          </span>
                        ) : (
                          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${active ? 'border-brand bg-brand' : 'border-line'}`}>
                            {active && <Check size={12} className="text-white" />}
                          </span>
                        )}
                        <span className="flex-1 font-medium">{item.name}</span>
                        {active && isFree && <span className="text-xs font-bold text-success bg-success-soft px-2 py-0.5 rounded">Gratis</span>}
                        {active && !isFree && Number(item.price) > 0 && <span className="text-sm font-mono text-muted">+{fmtMoney(item.price)}</span>}
                        {!active && Number(item.price) > 0 && <span className="text-sm font-mono text-muted">+{fmtMoney(item.price)}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Nota */}
          <div>
            <label className="block text-sm font-semibold text-muted mb-1.5">Nota especial</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sin cebolla, poco hecho..."
              className="w-full px-4 py-2.5 rounded-lg border border-line bg-card text-sm text-night placeholder:text-muted/60 focus:outline-none focus:border-brand" />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line px-5 py-4 shrink-0 space-y-3">
          {/* Qty + total */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="touch-icon w-10 h-10 rounded-xl border border-line bg-card grid place-items-center hover:bg-page transition">
                <Minus size={18} />
              </button>
              <span className="w-10 text-center font-mono font-bold text-night text-xl">{qty}</span>
              <button onClick={() => setQty(qty + 1)}
                className="touch-icon w-10 h-10 rounded-xl border border-line bg-card grid place-items-center hover:bg-page transition">
                <Plus size={18} />
              </button>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted">Total</div>
              <div className="font-mono font-extrabold text-xl text-night">{fmtMoney(total)}</div>
            </div>
          </div>

          {/* Add button */}
          <button onClick={add} disabled={!valid}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark text-white font-bold text-base shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Agregar{qty > 1 ? ` ${qty}` : ''} — {fmtMoney(total)}
          </button>
        </div>
      </div>
    </div>
  )

return createPortal(portal, document.body)
}
