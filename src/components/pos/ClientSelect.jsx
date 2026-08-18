import { useState, useRef, useEffect, useMemo } from 'react'
import { User, X } from 'lucide-react'


export default function ClientSelect({ value, phone, onNameChange, onPhoneChange, clients, onSelect, onNewClient }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 20)
    return clients
      .filter((c) => (c.name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q))
      .slice(0, 20)
  }, [clients, query])

  useEffect(() => {
    const on = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [])

  const handleSelect = (c) => {
    onNameChange(c.name || '')
    onPhoneChange(c.phone || '')
    if (onSelect) onSelect(c)
    setOpen(false)
    setQuery('')
  }

  const handleNew = () => {
    if (query.trim()) onNameChange(query.trim())
    if (onNewClient) onNewClient(query.trim())
    setOpen(false)
    setQuery('')
  }

  const handleClear = () => {
    onNameChange('')
    onPhoneChange('')
    setQuery('')
  }

  const displayName = value || ''
  const displayPhone = phone || ''

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <User size={16} className="text-muted shrink-0" />
        <input
          autoComplete="off"
          value={displayName || displayPhone || query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!displayName && !displayPhone) {
              onPhoneChange(e.target.value)
            } else {
              onNameChange(e.target.value)
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..."
          className="flex-1 bg-transparent text-night text-sm outline-none min-w-0"
        />
        {(displayName || displayPhone) && !query && (
          <button onClick={handleClear} className="touch-icon shrink-0 w-5 h-5 grid place-items-center rounded-full hover:bg-page transition">
            <X size={13} className="text-muted" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-full min-w-[220px] max-h-56 overflow-auto rounded-xl border border-line bg-card shadow-lg">
          {matches.length > 0 && (
            <ul className="py-1">
              {matches.map((c) => (
                <li key={c.id || c.name + c.phone} onClick={() => handleSelect(c)}
                  className="cursor-pointer px-3 py-2 text-sm text-night hover:bg-page transition flex items-center gap-2">
                  <User size={14} className="text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.name}</div>
                    {c.phone && <div className="text-[11px] text-muted font-mono truncate">{c.phone}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={handleNew}
            className="w-full px-3 py-2 text-sm text-brand font-semibold hover:bg-page transition border-t border-line flex items-center gap-2">
            <span className="w-5 h-5 grid place-items-center rounded-full bg-brand/10 text-brand text-xs font-bold">+</span>
            Nuevo cliente{query.trim() ? ` "${query.trim()}"` : ''}
          </button>
        </div>
      )}
    </div>
  )
}
