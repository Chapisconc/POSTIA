export default function SegmentedControl({ options, value, onChange, allowDeselect = false, className = '' }) {
  return (
    <div className={`flex w-full sm:w-auto items-center gap-3 bg-page p-1.5 rounded-xl border border-line ${className}`}>
      {options.map((o) => {
        const Icon = o.icon
        const active = value === o.id
        const count = o.count
        return (
          <button key={o.id} type="button" onClick={() => onChange(allowDeselect && active ? null : o.id)} aria-pressed={active} title={o.label}
            className={`flex flex-1 sm:flex-none flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap min-w-0 touch-target ${
              active ? 'bg-brand text-white shadow-sm' : 'glass-btn text-night hover:text-brand'
            }`}>
            {Icon && <Icon size={18} className="shrink-0" />}
            <span className="truncate max-w-full">{o.label}{count != null && count > 0 ? ` (${count})` : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
