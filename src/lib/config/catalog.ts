export interface Module {
  key: string
  label: string
  description: string
}

export const MODULES: Module[] = [
  {
    key: 'pos',
    label: 'POS',
    description: 'Punto de venta: crear pedidos, cobrar e imprimir tickets',
  },
  {
    key: 'productos',
    label: 'Productos',
    description: 'Catálogo de productos, categorías y modificadores',
  },
  {
    key: 'caja',
    label: 'Caja',
    description: 'Apertura y cierre de caja, cortes, fondo y arqueos',
  },
  {
    key: 'reportes',
    label: 'Reportes',
    description: 'Reportes de ventas, productos y movimientos',
  },
  {
    key: 'inventario',
    label: 'Inventario',
    description: 'Recetas, ingredientes, compras, proveedores, merma y conteos',
  },
  {
    key: 'cocina',
    label: 'Cocina',
    description: 'Pantalla de cocina (Kitchen Display) y estados de preparación',
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Repartidores, mapa, GPS y estados de entrega',
  },
  {
    key: 'reservaciones',
    label: 'Reservaciones',
    description: 'Reservas de mesas y clientes',
  },
  {
    key: 'facturacion',
    label: 'Facturación',
    description: 'Facturas, CFDI y configuración fiscal',
  },
  {
    key: 'clientes',
    label: 'Clientes',
    description: 'Registro y administración de clientes',
  },
  {
    key: 'promociones',
    label: 'Promociones',
    description: 'Descuentos, ofertas y campañas',
  },
  {
    key: 'puntos',
    label: 'Programa de puntos',
    description: 'Puntos y recompensas para clientes',
  },
  {
    key: 'sucursales',
    label: 'Sucursales',
    description: 'Administración de múltiples sucursales',
  },
]

export function getActiveModules(enabledKeys: string[]): Module[] {
  const enabled = new Set(enabledKeys)
  return MODULES.filter((m) => enabled.has(m.key))
}
