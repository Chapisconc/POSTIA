// Picker unificado de producto: modos búsqueda + selección directa.
import React, { useState, useMemo } from 'react'
import { SearchInput, EmptyState } from '../ui'
import ModifierPicker from './ModifierPicker'
import { fmtMoney } from '../../lib/format'

export default function ProductPicker({ open, products, groups, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [pid, setPid] = useState(null)
  const list = useMemo(() => products.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())), [products, q])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card border border-line shadow-xl overflow-hidden animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h3 className="font-bold text-night">ProductPicker</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-night text-xl leading-none">×</button>
        </div>
        {pid ? (
          <div className="p-4">
            <ModifierPicker product={products.find((p) => p.id === pid)} groups={groups} onCancel={() => { setPid(null); onClose() }} onConfirm={(r) => { onPick(pid, r.qty, r.modifiers, r.note) }} />
          </div>
        ) : (
          <div className="p-4">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar producto…" />
            {list.length === 0 ? (
              <div className="mt-3"><EmptyState icon="🍽️" title="Sin productos" message="No hay productos que coincidan." /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-h-[55vh] overflow-auto">
                {list.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPid(p.id)}
                    className="text-left rounded-xl border border-line p-3 hover:border-brand hover:bg-brand-soft transition">
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="text-sm font-semibold text-night leading-tight mt-1 line-clamp-2">{p.name}</div>
                    <div className="text-xs font-mono text-brand font-semibold mt-0.5">{fmtMoney(p.price)}</div>
                    {p.modGroupIds?.length > 0 && <div className="text-[10px] text-muted mt-0.5">⚙️ Personalizable</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
