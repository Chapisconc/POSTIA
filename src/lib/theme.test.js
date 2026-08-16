// Tests de funciones pura de theme (sin React)
// No requiere mockear React; testea DEFAULT_PREFS, resolveTheme y getThemePrefs
import { describe, expect, test, vi } from 'vitest'

const store = {}
const localStorageMock = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
globalThis.localStorage = localStorageMock
globalThis.window = {
  localStorage: localStorageMock,
  matchMedia: () => ({
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
}
globalThis.document = {
  documentElement: {
    dataset: {},
    classList: { remove: vi.fn(), add: vi.fn() },
    style: { setProperty: vi.fn() },
  },
}

// Import dinámico después de mockear globals
const theme = await import('./theme.js')

describe('theme', () => {
  test('DEFAULT_PREFS defaults correctos', () => {
    expect(theme.DEFAULT_PREFS).toEqual({
      theme: 'auto',
      font: 'plus-jakarta-sans',
      density: 'normal',
      radius: 'md',
      style: 'modern',
      sidebar: 'auto',
      palette: 'postia',
    })
  })

  test('resolveTheme devuelve light/dark/auto', () => {
    expect(theme.resolveTheme('light')).toBe('light')
    expect(theme.resolveTheme('dark')).toBe('dark')
    expect(theme.resolveTheme('auto')).toBe('light')
  })

  test('getThemePrefs normaliza prefs guardados', () => {
    localStorageMock.setItem('postia:theme', JSON.stringify({ theme: 'dark', palette: 'sunset', font: 'inter' }))
    const prefs = theme.getThemePrefs()
    expect(prefs.theme).toBe('dark')
    expect(prefs.palette).toBe('sunset')
    expect(prefs.font).toBe('inter')
    expect(prefs.density).toBe('normal')
    expect(prefs.radius).toBe('md')
  })
})
