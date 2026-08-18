import React, { useState, useEffect, forwardRef } from 'react'

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`bg-card rounded-xl border border-line shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'brand', onClick }) {
  const tones = {
    brand: 'bg-brand-soft text-brand-dark',
    gold: 'bg-gold-soft text-gold',
    danger: 'bg-danger-soft text-danger',
    night: 'bg-night text-white',
    amber: 'bg-warning-soft text-warning-dark',
    blue: 'bg-info-soft text-info-dark',
    purple: 'bg-brand-soft text-brand-dark',
    pink: 'bg-gold-soft text-gold-dark',
    success: 'bg-success-soft text-success-dark',
  }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`${onClick ? 'text-left hover:shadow-md cursor-pointer transition' : ''} bg-card rounded-xl border border-line shadow-sm p-4 flex items-center gap-3 animate-pop`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl grid place-items-center shrink-0 ${tones[tone] || tones.brand}`}>
        <Icon size={20} className="sm:hidden" />
        <Icon size={22} className="hidden sm:block" />
      </div>
      <div className="min-w-0">
        <div className="type-label text-muted truncate">{label}</div>
        <div className="text-lg sm:text-xl font-extrabold text-night font-mono leading-tight truncate">{value}</div>
        {sub && <div className="type-caption text-muted truncate">{sub}</div>}
      </div>
    </Comp>
  )
}

const buttonVariants = {
  primary: 'bg-brand hover:bg-brand-dark text-white shadow-sm',
  gradient: 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98] active:brightness-95 transition-all duration-200 dark:from-brand-soft dark:to-brand-dark',
  gradientSuccess: 'bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/30 active:scale-[0.98] active:brightness-95 transition-all duration-200 dark:from-success-soft dark:to-success-dark',
  gradientDanger: 'bg-gradient-to-r from-danger to-danger-dark text-white shadow-md shadow-danger/20 hover:shadow-lg hover:shadow-danger/30 active:scale-[0.98] active:brightness-95 transition-all duration-200 dark:from-danger-soft dark:to-danger-dark',
  dark: 'bg-night hover:bg-night-light text-white',
  ghost: 'bg-transparent hover:bg-line/60 text-night',
  outline: 'border border-line hover:bg-page/80 text-night bg-card',
  dangerOutline: 'border border-danger text-danger hover:bg-danger-soft bg-card',
  outlineBrand: 'border border-brand text-brand hover:bg-brand-soft bg-card',
  danger: 'bg-danger hover:opacity-90 text-white dark:bg-danger-soft',
  gold: 'bg-gold hover:opacity-90 text-white dark:bg-gold-soft',
  amber: 'bg-warning hover:opacity-90 text-white dark:bg-warning-soft',
  blue: 'bg-info hover:opacity-90 text-white dark:bg-info-soft',
  success: 'bg-success hover:opacity-90 text-white shadow-sm dark:bg-success-soft',
}
export function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled, title }) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] px-4 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${buttonVariants[variant] || buttonVariants.primary} ${className}`}
    >
      {children}
    </button>
  )
}

// Botón con estados vivos (idle → loading → success → error) para evitar el
// doble-toque en acciones críticas (cobrar, cancelar). Anti doble-toque:
// mientras está en loading no acepta otro clic. Feedback inmediato = percepción
// de velocidad (Informe Analítico §2.3).
export function AsyncButton({ children, onClick, variant = 'primary', className = '', type = 'button', disabled, labels, loadingText = 'Procesando…', successText = '¡Listo!', errorText = 'Error — reintentar' }) {
  const [status, setStatus] = React.useState('idle')
  const handle = async () => {
    if (status !== 'idle' || disabled) return
    setStatus('loading')
    try {
      await onClick()
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 1600)
    }
  }
  const content = {
    idle: children,
    loading: <>{loadingText}</>,
    success: <>{successText}</>,
    error: <>{errorText}</>,
  }
  const statusClass = status === 'success' ? 'bg-success hover:opacity-90' : status === 'error' ? 'bg-danger hover:opacity-90 animate-pulse' : ''
  return (
    <button
      type={type}
      onClick={handle}
      disabled={disabled || status === 'loading'}
      aria-live="polite"
      data-status={status}
      className={`min-h-[44px] px-4 py-2 rounded-lg font-semibold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${buttonVariants[variant] || buttonVariants.primary} ${statusClass} ${className}`}
    >
      {content[status]}
    </button>
  )
}

// Confirmación por mantener presionado (hold-to-confirm) para acciones destructivas
// (anular comanda). Reemplaza el diálogo "¿Estás seguro?" que los meseros ignoran.
export function HoldToConfirm({ onConfirm, label = 'Mantén para confirmar', holdMs = 1200, className = '', danger = true }) {
  const [progress, setProgress] = React.useState(0)
  const [done, setDone] = React.useState(false)
  const timer = React.useRef(null)
  const raf = React.useRef(null)
  const start = () => {
    if (done) return
    const t0 = Date.now()
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / holdMs)
      setProgress(p)
      if (p >= 1) {
        setDone(true)
        onConfirm()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    timer.current = setTimeout(() => cancel(), holdMs + 50)
  }
  const cancel = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    if (timer.current) clearTimeout(timer.current)
    setProgress(0)
  }
  React.useEffect(() => () => cancel(), [])
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      className={`relative w-full min-h-[44px] overflow-hidden rounded-xl border-2 font-semibold select-none transition ${danger ? 'border-danger text-danger' : 'border-brand text-brand'} ${className}`}
    >
      <span
        className={`absolute inset-0 origin-left ${danger ? 'bg-danger/20' : 'bg-brand/20'}`}
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="relative">{done ? 'Confirmado' : label}</span>
    </button>
  )
}

const badgeTones = {
  muted: 'bg-line text-muted',
  brand: 'bg-brand-soft text-brand-dark',
  danger: 'bg-danger-soft text-danger-dark',
  gold: 'bg-gold-soft text-gold-dark',
  blue: 'bg-info-soft text-info-dark',
  purple: 'bg-brand-soft text-brand-dark',
  amber: 'bg-warning-soft text-warning-dark',
  success: 'bg-success-soft text-success-dark',
  info: 'bg-info-soft text-info-dark',
  warning: 'bg-warning-soft text-warning-dark',
  night: 'bg-night text-white',
  white: 'bg-card text-night border border-line',
}
export function Badge({ children, tone = 'muted', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeTones[tone] || badgeTones.muted} ${className}`}>
      {children}
    </span>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block type-caption text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-0.5">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full px-3 py-2 rounded-lg border border-line bg-card text-night text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition'
export const Input = forwardRef((props, ref) => (
  <input ref={ref} {...props} className={`${inputBase} ${props.className || ''}`} />
))
export const Textarea = forwardRef((props, ref) => (
  <textarea ref={ref} {...props} className={`${inputBase} ${props.className || ''}`} />
))
export const Select = forwardRef((props, ref) => (
  <select ref={ref} {...props} className={`${inputBase} ${props.className || ''}`}>
    {props.children}
  </select>
))

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 group">
      <span className={`relative w-10 h-6 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`} />
      </span>
      {label && <span className="text-sm text-night font-medium">{label}</span>}
    </button>
  )
}

export function Tabs({ items, value, onChange, className = '', activeClassName, inactiveClassName }) {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-semibold transition'
  return (
    <div className={`flex flex-wrap gap-1 bg-page rounded-xl p-1 ${className}`}>
      {items.map((it) => {
        const active = value === it.id
        const activeCls = activeClassName || 'bg-brand text-white shadow-sm'
        const inactiveCls = inactiveClassName || 'text-muted hover:text-night'
        return (
          <button key={it.id} onClick={() => onChange(it.id)} className={`${base} ${active ? activeCls : inactiveCls}`}>
            {it.icon && <span className="mr-1">{it.icon}</span>}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 bg-page rounded-xl p-1 ${className}`}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-1 ${active ? 'bg-brand text-white shadow-sm' : 'text-night hover:bg-line hover:text-brand'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-card text-night text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
      />
    </div>
  )
}

export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="type-h3 text-night">{title}</div>
      {message && <p className="type-body text-muted mt-2 max-w-xs mx-auto">{message}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="type-h2 text-night">{title}</h2>
        {subtitle && <p className="type-body text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function QtyStepper({ value, onChange, min = 0, max = 999, size = 'md' }) {
  const btn = size === 'lg' ? 'w-10 h-10 text-xl' : 'w-8 h-8'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        disabled={value <= min}
        className={`${btn} grid place-items-center rounded-lg border border-line bg-card text-night hover:bg-line disabled:opacity-30 transition`}
      >
        −
      </button>
      <span className={`text-center font-mono font-bold text-night ${size === 'lg' ? 'w-12 text-xl' : 'w-8'}`}>{value || 0}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, (value || 0) + 1))}
        disabled={value >= max}
        className={`${btn} grid place-items-center rounded-lg border border-line bg-card text-brand hover:bg-brand-soft disabled:opacity-30 transition`}
      >
        +
      </button>
    </div>
  )
}

export function Modal({ open, onClose, title, children, maxW = 'max-w-md', zIndex = 'z-50' }) {
  if (!open) return null
  return (
    <div className={`fixed inset-0 ${zIndex} grid place-items-center p-4 bg-night/40 backdrop-blur-sm`} onClick={onClose}>
      <Card className={`w-full ${maxW} p-6 animate-pop max-h-[90vh] overflow-auto`}>
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="type-h3 text-night">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger hover:bg-danger-soft text-xl leading-none transition close-glow">
              ×
            </button>
          </div>
          {children}
        </div>
      </Card>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-night/50 backdrop-blur-sm" onClick={onCancel}>
      <Card className="w-full max-w-sm p-6 animate-pop">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="type-h3 text-night">{title}</h3>
          {message && <p className="type-body text-muted mt-2">{message}</p>}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'gradientDanger' : 'gradient'} className="flex-1" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

let toastId = 0
export function ToastViewport() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const onToast = (e) => {
      const detail = e.detail || {}
      const messages = Array.isArray(detail.messages) ? detail.messages : [detail.message]
      const type = detail.type || 'info'
      if (!messages.length) return
      const id = ++toastId
      setToasts((t) => [...t, { id, messages, type }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
    }
    const onNotify = (e) => onToast(e)
    window.addEventListener('postia:toast', onToast)
    window.addEventListener('postia:notify', onNotify)
    return () => {
      window.removeEventListener('postia:toast', onToast)
      window.removeEventListener('postia:notify', onNotify)
    }
  }, [])
  const tones = {
    info: 'border-l-sky-500',
    success: 'border-l-brand',
    error: 'border-l-danger',
    warning: 'border-l-gold',
  }
  return (
    <div className="fixed top-4 left-4 z-[100] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-card border border-line border-l-4 ${tones[t.type] || tones.info} rounded-xl shadow-lg p-4 animate-pop`}
        >
          {t.messages.map((m, i) => (
            <div key={i} className="type-body text-night font-medium">
              {m}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function StatusPill({ children, tone = 'muted', className = '' }) {
  const cls = badgeTones[tone] || badgeTones.muted
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}>
      {children}
    </span>
  )
}
