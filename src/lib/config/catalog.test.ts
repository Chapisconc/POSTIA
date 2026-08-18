import { describe, expect, it } from 'vitest'
import { MODULES, getActiveModules } from './catalog'

describe('catálogo de módulos', () => {
  it('define el catálogo completo de 13 módulos', () => {
    expect(MODULES).toHaveLength(13)
  })

  it('incluye todos los módulos del sistema', () => {
    const keys = MODULES.map((m) => m.key)
    expect(keys).toEqual([
      'pos',
      'productos',
      'caja',
      'reportes',
      'inventario',
      'cocina',
      'delivery',
      'reservaciones',
      'facturacion',
      'clientes',
      'promociones',
      'puntos',
      'sucursales',
    ])
  })

  it('devuelve solo los módulos activos en el orden del catálogo', () => {
    const active = getActiveModules(['caja', 'pos', 'productos'])
    expect(active.map((m) => m.key)).toEqual(['pos', 'productos', 'caja'])
  })

  it('ignora claves de módulos inexistentes', () => {
    const active = getActiveModules(['pos', 'nave-espacial'])
    expect(active.map((m) => m.key)).toEqual(['pos'])
  })

  it('devuelve lista vacía si no hay módulos activos', () => {
    expect(getActiveModules([])).toEqual([])
  })

  it('cada módulo tiene etiqueta en español y descripción', () => {
    for (const m of MODULES) {
      expect(m.label).toBeTruthy()
      expect(m.description).toBeTruthy()
    }
  })
})
