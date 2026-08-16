import React from 'react'

export const FONT_OPTIONS = [
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans' },
  { id: 'inter', label: 'Inter' },
  { id: 'manrope', label: 'Manrope' },
  { id: 'dm-sans', label: 'DM Sans' },
  { id: 'geist', label: 'Geist' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans' },
]

export const DENSITY_OPTIONS = [
  { id: 'comfortable', label: 'Cómoda' },
  { id: 'normal', label: 'Normal' },
  { id: 'compact', label: 'Compacta' },
]

export const RADIUS_OPTIONS = [
  { id: 'sm', label: 'Pequeños' },
  { id: 'md', label: 'Medios' },
  { id: 'lg', label: 'Grandes' },
]

export const SIDEBAR_OPTIONS = [
  { id: 'expandido', label: 'Expandido' },
  { id: 'auto', label: 'Automático' },
  { id: 'compacto', label: 'Compacto' },
]

export const STYLE_OPTIONS = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'modern', label: 'Modern' },
  { id: 'soft', label: 'Soft' },
  { id: 'professional', label: 'Professional' },
]

export const PALETTE_OPTIONS = [
  { id: 'postia', label: 'POSTIA', accent: '37 99 235', soft: '219 234 254', dark: '29 78 216', bg: '248 250 252', card: '255 255 255', night: '15 23 42', line: '226 232 240' },
  { id: 'sunset', label: 'Sunset', accent: '234 118 46', soft: '255 237 213', dark: '194 88 12', bg: '255 247 237', card: '255 255 255', night: '67 20 7', line: '254 215 170' },
  { id: 'emerald', label: 'Emerald', accent: '5 150 105', soft: '209 250 229', dark: '4 120 87', bg: '236 253 245', card: '255 255 255', night: '2 44 34', line: '167 243 208' },
  { id: 'berry', label: 'Berry', accent: '190 24 93', soft: '252 231 243', dark: '157 23 77', bg: '253 242 248', card: '255 255 255', night: '80 7 36', line: '251 207 232' },
  { id: 'slate', label: 'Slate', accent: '71 85 105', soft: '241 245 249', dark: '51 65 85', bg: '248 250 252', card: '255 255 255', night: '15 23 42', line: '226 232 240' },
  { id: 'midnight', label: 'Midnight', accent: '99 102 241', soft: '224 231 255', dark: '79 70 229', bg: '238 242 255', card: '255 255 255', night: '30 27 75', line: '199 210 254' },
]

export const THEME_OPTIONS = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'auto', label: 'Automático' },
]

const STORAGE_KEY = 'postia:theme'
const DEFAULT_PREFS_RAW = {
  theme: 'auto',
  font: 'plus-jakarta-sans',
  density: 'normal',
  radius: 'md',
  style: 'modern',
  sidebar: 'auto',
  palette: 'postia',
}

const THEME_KEYS = new Set(['theme', 'font', 'density', 'radius', 'style', 'sidebar', 'palette'])

function normalizePrefs(prefs) {
  const source = typeof prefs === 'object' && prefs !== null ? prefs : {}
  const out = { ...DEFAULT_PREFS_RAW }
  for (const key of Object.keys(source)) {
    if (THEME_KEYS.has(key)) {
      out[key] = source[key]
    }
  }
  return out
}

export const DEFAULT_PREFS = normalizePrefs(DEFAULT_PREFS_RAW)

export function getThemePrefs() {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return normalizePrefs(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function saveThemePrefs(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* sin storage */ }
}

export function resolveTheme(theme) {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function applyTheme(prefs) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const resolved = resolveTheme(prefs.theme)
  root.dataset.theme = resolved
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  const attrs = {
    font: prefs.font,
    density: prefs.density,
    radius: prefs.radius,
    style: prefs.style,
    sidebar: prefs.sidebar,
    palette: prefs.palette,
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (value) root.dataset[key] = value
    else delete root.dataset[key]
  }
}

// ---- Store singleton: todas las instancias de useTheme comparten estado ----
let prefs = getThemePrefs()
const listeners = new Set()

export function setThemePrefs(next) {
  const merged = normalizePrefs(typeof next === 'function' ? next(prefs) : { ...prefs, ...next })
  prefs = merged
  saveThemePrefs(merged)
  applyTheme(merged)
  listeners.forEach((l) => l(merged))
}

// Aplica el tema guardado apenas se carga el módulo (evita parpadeo).
if (typeof window !== 'undefined') applyTheme(prefs)

// Sigue el cambio de preferencia del sistema cuando el tema es "auto".
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (prefs.theme === 'auto') applyTheme(prefs)
  })
}

export function useTheme() {
  const [value, setValue] = React.useState(prefs)

  React.useEffect(() => {
    listeners.add(setValue)
    setValue(prefs)
    return () => listeners.delete(setValue)
  }, [])

  return [value, setThemePrefs]
}
