import React, { useState, useEffect } from 'react'

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`bg-card rounded-2xl border border-line shadow-sm ${className}`} {...rest}>
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
    purple: 'bg-purple-100 text-purple-700',
    pink: 'bg-pink-100 text-pink-700',
    success: 'bg-success-soft text-success-dark',
  }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`${onClick ? 'text-left hover:shadow-md cursor-pointer transition' : ''} bg-card rounded-2xl border border-line shadow-sm p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-pop`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl grid place-items-center shrink-0 ${tones[tone] || tones.brand}`}>
        <Icon size={20} className="sm:hidden" />
        <Icon size={22} className="hidden sm:block" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wide truncate">{label}</div>
        <div className="text-lg sm:text-xl font-extrabold text-night font-mono leading-tight truncate">{value}</div>
        {sub && <div className="text-[11px] sm:text-xs text-muted truncate">{sub}</div>}
      </div>
    </Comp>
  )
}

const buttonVariants = {
  primary: 'bg-brand hover:bg-brand-dark text-white shadow-sm',
  gradient: 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 active:scale-[0.98] active:brightness-95 transition-all duration-200',
  gradientSuccess: 'bg-gradient-to-r from-success to-success-dark text-white shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/40 active:scale-[0.98] active:brightness-95 transition-all duration-200',
  gradientDanger: 'bg-gradient-to-r from-danger to-danger-dark text-white shadow-md shadow-danger/25 hover:shadow-lg hover:shadow-danger/40 active:scale-[0.98] active:brightness-95 transition-all duration-200',
  dark: 'bg-night hover:bg-night-light text-white',
  ghost: 'bg-transparent hover:bg-line text-night',
  outline: 'border border-line hover:bg-page text-night bg-card',
  dangerOutline: 'border border-danger text-danger hover:bg-danger-soft bg-card',
  outlineBrand: 'border border-brand text-brand hover:bg-brand-soft bg-card',
  danger: 'bg-danger hover:opacity-90 text-white',
  gold: 'bg-gold hover:opacity-90 text-white',
  amber: 'bg-warning hover:opacity-90 text-white',
  blue: 'bg-info hover:bg-info-dark text-white',
  success: 'bg-success hover:bg-success-dark text-white shadow-sm',
}
export function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled, title }) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${buttonVariants[variant] || buttonVariants.primary} ${className}`}
    >
      {children}
    </button>
  )
}

const badgeTones = {
  muted: 'bg-line text-muted',
  brand: 'bg-brand-soft text-brand-dark',
  danger: 'bg-danger-soft text-danger-dark',
  gold: 'bg-gold-soft text-gold-dark',
  blue: 'bg-info-soft text-info-dark',
  purple: 'bg-purple-100 text-purple-700',
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
      <span className="block text-xs font-semibold text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-0.5">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full px-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition'
export function Input(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} />
}
export function Textarea(props) {
  return <textarea {...props} className={`${inputBase} ${props.className || ''}`} />
}
export function Select(props) {
  return (
    <select {...props} className={`${inputBase} ${props.className || ''}`}>
      {props.children}
    </select>
  )
}

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
        const activeCls = activeClassName || 'bg-card shadow-sm text-brand-dark'
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
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-card text-night text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition"
      />
    </div>
  )
}

export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="font-bold text-night">{title}</div>
      {message && <p className="text-sm text-muted mt-1">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-night">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function QtyStepper({ value, onChange, min = 0, max = 999, size = 'md' }) {
  const btn = size === 'lg' ? 'w-10 h-10 text-xl' : 'w-8 h-8'
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        disabled={value <= min}
        className={`${btn} grid place-items-center rounded-xl border border-line bg-card text-night hover:bg-line disabled:opacity-30 transition`}
      >
        −
      </button>
      <span className={`text-center font-mono font-bold text-night ${size === 'lg' ? 'w-12 text-xl' : 'w-8'}`}>{value || 0}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, (value || 0) + 1))}
        disabled={value >= max}
        className={`${btn} grid place-items-center rounded-xl border border-line bg-card text-brand hover:bg-brand-soft disabled:opacity-30 transition`}
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
      <Card className={`w-full ${maxW} p-5 animate-pop max-h-[90vh] overflow-auto`}>
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-night">{title}</h3>
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
      <Card className="w-full max-w-sm p-5 animate-pop">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-night">{title}</h3>
          {message && <p className="text-sm text-muted mt-1.5">{message}</p>}
          <div className="flex gap-2 mt-5">
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
          className={`bg-card border border-line border-l-4 ${tones[t.type] || tones.info} rounded-xl shadow-lg p-3 animate-pop`}
        >
          {t.messages.map((m, i) => (
            <div key={i} className="text-sm text-night font-medium">
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
