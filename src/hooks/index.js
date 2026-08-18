// Hooks de infraestructura POS (Fase 1 — Foundation).
// Centralizan patrones que antes se repetían por el código (matchMedia, online,
// debounce, atajos de teclado). La UI consume estos hooks en vez de tocar
// window.innerWidth / navigator.onLine directamente.

import { useEffect, useState, useCallback, useRef } from 'react'

// Breakpoints: mobile < 768, tablet 768–1279, desktop >= 1280.
// Usa matchMedia (no window.innerWidth) para respetar zoom y DPR.
export function useBreakpoint() {
  const get = () => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.matchMedia('(min-width: 1280px)').matches) return 'desktop'
    if (window.matchMedia('(min-width: 768px)').matches) return 'tablet'
    return 'mobile'
  }
  const [bp, setBp] = useState(get)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)')
    const tablet = window.matchMedia('(min-width: 768px)')
    const update = () => setBp(get())
    desktop.addEventListener('change', update)
    tablet.addEventListener('change', update)
    return () => {
      desktop.removeEventListener('change', update)
      tablet.removeEventListener('change', update)
    }
  }, [])
  return bp
}

// Estado de conectividad (online/offline) reactivo.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// Debounce de un valor (p.ej. búsqueda de productos mientras se escribe).
export function useDebounce(value, delay = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// Atajos de teclado globales para POS en PC (F2 buscar, F3 nuevo, F4 cobrar,
// Ctrl+K comando, Esc cerrar, Enter confirmar). handler: (key, e) => void.
export function useKeyboard(handler, deps = []) {
  const ref = useRef(handler)
  ref.current = handler
  const cb = useCallback((e) => {
    // No interferir cuando se escribe en inputs (salvo Escape/Ctrl+K).
    const tag = (e.target?.tagName || '').toLowerCase()
    const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
    if (typing && !(e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'k'))) return
    ref.current(e)
  }, deps)
  useEffect(() => {
    window.addEventListener('keydown', cb)
    return () => window.removeEventListener('keydown', cb)
  }, [cb])
}
