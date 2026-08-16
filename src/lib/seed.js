// Datos iniciales del restaurante POSTIA (alitas, boneless, hamburguesas…).
import { readState, writeState, uid, nowISO } from './storage'

export function seedIfEmpty() {
  const s = readState()
  if (s.products.length > 0 || s.orders.length > 0 || s.categories.length > 0) return s

  const now = nowISO()

  // ---- Categorías ----
  const cat = (name, emoji, featured = false) => {
    const c = { id: uid(), name, emoji, order: s.categories.length, featured }
    s.categories.push(c)
    return c.id
  }
  const cBest = cat('Más vendidos', '🔥', true)
  const cAlitas = cat('Alitas', '🍗')
  const cBoneless = cat('Boneless', '🍖')
  const cBurger = cat('Hamburguesas', '🍔')
  const cVeg = cat('Vegetales', '🥕')
  const cEnt = cat('Entradas', '🍟')
  const cBeb = cat('Bebidas', '🥤')
  const cPost = cat('Postres', '🍰')

  // ---- Grupos de modificadores ----
  const gSabor = { id: uid(), name: 'Sabor', type: 'sabor', required: true, min: 1, max: 2, surchargeSecond: { enabled: true, price: 7 }, items: ['BBQ', 'Buffalo', 'Mango Habanero', 'Adobada', 'Chipotle', 'Miel Mostaza'].map((n) => ({ id: uid(), name: n, price: 0 })) }
  const gExtras = { id: uid(), name: 'Extras', type: 'extra', required: false, min: 0, max: 4, surchargeSecond: null, items: [{ id: uid(), name: 'Ranch', price: 10 }, { id: uid(), name: 'Queso extra', price: 10 }, { id: uid(), name: 'Apio', price: 0 }, { id: uid(), name: 'Aderezo extra', price: 8 }, { id: uid(), name: 'Tocino', price: 15 }] }
  const gComp = { id: uid(), name: 'Complementos', type: 'complemento', required: false, min: 0, max: 2, surchargeSecond: null, items: [{ id: uid(), name: 'Sin cebolla', price: 0 }, { id: uid(), name: 'Sin queso', price: 0 }, { id: uid(), name: 'Extra picante', price: 0 }] }
  const gCoccion = { id: uid(), name: 'Cocción', type: 'complemento', required: false, min: 0, max: 1, surchargeSecond: null, items: [{ id: uid(), name: 'Término medio', price: 0 }, { id: uid(), name: 'Tres cuartos', price: 0 }, { id: uid(), name: 'Bien cocida', price: 0 }] }
  const gTamanio = { id: uid(), name: 'Tamaño', type: 'tamano', required: true, min: 1, max: 1, surchargeSecond: null, items: [{ id: uid(), name: 'Chico', price: 0 }, { id: uid(), name: 'Grande', price: 25 }] }
  s.modGroups = [gSabor, gExtras, gComp, gCoccion, gTamanio]

  // ---- Productos ----
  const prod = (name, price, categoryId, emoji, extra = {}) => {
    const p = {
      id: uid(), name, description: '', emoji, price, cost: Math.round(price * 0.45),
      categoryId, sku: '', available: true, featured: false, order: s.products.length,
      stock: 0, unitLabel: 'pieza', lowStockAt: 5, modGroupIds: [], promo: null,
      ...extra,
    }
    s.products.push(p)
    return p
  }
  const alitas10 = prod('Alitas 10', 180, cAlitas, '🍗', { description: '10 piezas con aderezo', featured: true, modGroupIds: [gSabor.id, gExtras.id, gComp.id] })
  prod('Alitas 15', 250, cAlitas, '🍗', { modGroupIds: [gSabor.id, gExtras.id, gComp.id] })
  prod('Alitas 20', 320, cAlitas, '🍗', { modGroupIds: [gSabor.id, gExtras.id, gComp.id] })
  const bonelessG = prod('Boneless grande', 160, cBoneless, '🍖', { description: '10 piezas boneless', featured: true, modGroupIds: [gSabor.id, gExtras.id, gComp.id] })
  prod('Boneless mediano', 110, cBoneless, '🍖', { modGroupIds: [gSabor.id, gExtras.id, gComp.id] })
  prod('Hamburguesa clásica', 95, cBurger, '🍔', { modGroupIds: [gComp.id, gCoccion.id] })
  const hambEspecial = prod('Hamburguesa especial', 120, cBurger, '🍔', { description: 'Con tocino y queso', featured: true, modGroupIds: [gComp.id, gCoccion.id] })
  prod('Hamburguesa doble', 150, cBurger, '🍔', { modGroupIds: [gComp.id, gCoccion.id] })
  prod('Hamburguesa de pollo', 105, cBurger, '🍔', { modGroupIds: [gComp.id, gCoccion.id] })
  prod('Ensalada César', 80, cVeg, '🥗', { modGroupIds: [gExtras.id] })
  prod('Papas a la francesa', 60, cVeg, '🍟', { modGroupIds: [gExtras.id, gTamanio.id] })
  prod('Aros de cebolla', 55, cEnt, '🧅')
  prod('Elote con queso', 40, cEnt, '🌽')
  prod('Refresco', 35, cBeb, '🥤', { featured: true })
  prod('Agua natural', 25, cBeb, '💧')
  prod('Limonada', 45, cBeb, '🍋')
  prod('Cerveza', 55, cBeb, '🍺')
  prod('Malteada', 70, cBeb, '🥤')
  prod('Cheesecake', 60, cPost, '🍰')
  prod('Brownie', 55, cPost, '🍫')
  const alas = [alitas10, bonelessG, hambEspecial]
  for (const p of alas) p.featured = true

  // ---- Salones y mesas ----
  const s1 = uid(), s2 = uid()
  s.salons = [{ id: s1, name: 'Salón principal' }, { id: s2, name: 'Terraza' }]
  s.tables = []
  for (const sid of [s1, s2]) {
    for (let i = 1; i <= 6; i++) {
      s.tables.push({ id: uid(), salonId: sid, name: `Mesa ${sid === s1 ? i : i + 6}`, capacity: 4, status: 'libre', orderId: null })
    }
  }

  // ---- Clientes, repartidores ----
  s.clients = [
    { id: uid(), name: 'Cristopher', phone: '3312345678', address: 'Av. Chapalita 123', notes: 'Cliente frecuente de alitas', createdAt: now },
    { id: uid(), name: 'María', phone: '3387654321', address: 'Col. Providencia 45', notes: '', createdAt: now },
  ]
  s.riders = [
    { id: uid(), name: 'Carlos', phone: '3311112222', status: 'disponible', currentOrderId: null, deliveriesCount: 0, active: true },
    { id: uid(), name: 'Diego', phone: '3333334444', status: 'disponible', currentOrderId: null, deliveriesCount: 0, active: true },
  ]

  // ---- Usuarios ----
  s.users = [
    { id: uid(), name: 'Administrador', role: 'admin', password: '1234', active: true },
    { id: uid(), name: 'Carlos', role: 'supervisor', password: '4321', active: true },
    { id: uid(), name: 'Cajero', role: 'cajero', password: '1234', active: true },
  ]

  // ---- Cupones y campañas ----
  s.coupons = [
    { id: uid(), code: 'BIENVENIDO10', name: 'Bienvenida 10%', type: 'percent', value: 10, minPurchase: 0, start: null, end: null, maxUses: 100, usedCount: 0, clientId: null, categoryIds: [], productIds: [], active: true },
    { id: uid(), code: 'ENVIOGRATIS', name: 'Envío gratis', type: 'fixed', value: 30, minPurchase: 200, start: null, end: null, maxUses: 50, usedCount: 0, clientId: null, categoryIds: [], productIds: [], active: true },
  ]
  s.campaigns = [
    { id: uid(), name: 'Promo Martes', description: 'Alitas 10 con 20% de descuento los martes', active: true, start: null, end: null, createdAt: now },
    { id: uid(), name: 'Happy hour', description: 'Cerveza 2x1 de 5 a 7pm', active: false, start: null, end: null, createdAt: now },
  ]

  // ---- Inventario por ingrediente ----
  const inv = (name, stock, minStock, unit, cost) => s.inventoryItems.push({ id: uid(), name, unit, stock, minStock, cost, category: '', lastIn: null, lastOut: null })
  inv('Alitas de pollo', 2000, 400, 'pieza', 4.5)
  inv('Salsa BBQ', 3000, 500, 'ml', 0.08)
  inv('Salsa Buffalo', 3000, 500, 'ml', 0.09)
  inv('Aderezo Ranch', 2500, 400, 'ml', 0.12)
  inv('Papas', 15000, 3000, 'g', 0.05)
  inv('Pan brioche', 40, 10, 'pieza', 6)
  inv('Carne de res', 5000, 1200, 'g', 0.09)
  inv('Queso', 3000, 800, 'g', 0.12)
  inv('Tocino', 1500, 400, 'g', 0.18)
  inv('Refrescos', 48, 12, 'pieza', 14)
  inv('Cerveza', 36, 12, 'pieza', 20)

  // ---- Automatizaciones de ejemplo ----
  s.rules = [
    { id: uid(), name: 'Avisar cocina de pedido nuevo', when: 'order.nuevo', then: 'notify', target: 'Cocina', active: true },
    { id: uid(), name: 'Avisar mostrador cuando está listo', when: 'order.listo', then: 'notify', target: 'Mostrador', active: true },
    { id: uid(), name: 'Sonido en pedido pagado', when: 'order.paid', then: 'sound', target: '', active: true },
  ]

  s.menuDigital = { enabled: true, mode: 'order', services: { llevar: true, domicilio: true, mesa: true }, accent: '#16A34A', welcome: 'Bienvenido a POSTIA' }
  s.meta = { businessName: 'POSTIA', currency: 'MXN', phone: '3311110000', address: 'Av. Chapultepec 555, Guadalajara' }

  writeState(s)
  return s
}
