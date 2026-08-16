# POSTIA — Documento de Análisis de Sistema

> Este documento describe el funcionamiento completo del POS POSTIA sin necesidad de
> leer el código fuente. Está pensado como referencia para sugerir mejoras estructurales,
> detectar inconsistencias y entender el flujo de datos. Lo que aquí se describe se
> verificó contra el código real (2026-08-15).

---

## 1. Resumen del proyecto

POSTIA es un Punto de Venta (POS) para restaurante, de página única (SPA), que corre
enteramente en el navegador. No hay backend propio: la persistencia principal es
`localStorage` y hay sync opcional a Supabase (PostgreSQL + Realtime) para
multi-dispositivo y respaldo en la nube.

- **Dominio**: Restaurante de alitas, boneless, hamburguesas, bebidas (marca POSTIA).
- **Idioma**: Toda la UI está en español (es-MX). Formato de moneda MXN.
- **Offline-first**: Sin conexión a internet funciona 100% desde localStorage.
- **Multi-máquina**: El sync a Supabase + locks de cobro permiten compartir estado
  entre varios navegadores (POS, cocina, dispositivo de repartidor, menú digital).

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | React 18.3 + Vite 5.4 | SPA, routing por estado (no react-router) |
| Lenguaje | JS/JSX puro | Sin TypeScript (aunque hay `tsconfig.json` legacy de una versión Next.js) |
| Estilos | Tailwind 3.4 + PostCSS | Tokens CSS custom properties (`--c-*`) en `src/index.css` |
| Íconos | lucide-react | |
| Gráficas | recharts | Dashboard, reportes |
| Fuente | @fontsource-variable (6 familias) | Plus Jakarta Sans (default), Inter, Manrope, DM Sans, Geist, IBM Plex Sans |
| Estado | `useState` en App + prop drilling | No hay Redux/Zustand/Context global; `useTheme` usa singleton con listeners |
| Persistencia | localStorage (`pdv_state_v2`) | Fuente principal de verdad |
| Backend (opcional) | Supabase (PostgreSQL) | Sync best-effort, Realtime solo tabla `orders` |
| Sonido | Web Audio API | Sin archivos externos; `beep()` con osciladores |
| Build | `vite build` -> `dist/` | Verificado, pasa |
| Testing | Vitest 4 + jsdom | 8 tests pasando (storage: 5, theme: 3). `npm run test` |

## 3. Arquitectura del sistema

### 3.1 Flujo de estado

```
┌─────────────────────────────────────────────────────────────────┐
│  localStorage (pdv_state_v2)  ← fuente principal de verdad     │
│  ├── meta (businessName, currency, phone, address)              │
│  ├── settings (printer, payments, notifications, appearance)    │
│  ├── roles (admin, supervisor, cajero, mesero, cocinero, rep.)  │
│  ├── users (nombre, role, password)                             │
│  ├── categories (nombre, emoji, order, featured)                │
│  ├── modGroups (sabor, extra, complemento, tamaño...)            │
│  ├── products (nombre, price, cost, categoryId, modGroupIds...) │
│  ├── salons (nombre)                                            │
│  ├── tables (salonId, name, capacity, status, orderId)          │
│  ├── orders (folio, serviceType, items, status, payment...)     │
│  ├── caja.sessions (openedAt, sales[], expenses[], closedAt...) │
│  ├── clients (name, phone, address, notes)                      │
│  ├── coupons (code, type, value, minPurchase, usedCount...)     │
│  ├── campaigns (name, active, start, end)                       │
│  ├── riders (name, status, currentOrderId, deliveriesCount)     │
│  ├── inventoryItems (name, stock, minStock, cost)               │
│  ├── inventoryMovements (itemId, type, qty, cost, date)         │
│  ├── audit (user, action, detail, date)                         │
│  ├── rules (when, then, target, active) — automatizaciones      │
│  └── menuDigital (enabled, mode, services, accent, welcome)     │
└─────────────────────────────────────────────────────────────────┘
         │ writeState()
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  App.jsx — Estado React global (useState)                       │
│  ├── tab (ruta actual: pedidos, pos, cocina...)                 │
│  ├── state (lectura de localStorage)                            │
│  ├── user (sesión actual)                                       │
│  └── showLogin, menuMode                                        │
└─────────────────────────────────────────────────────────────────┘
         │ prop drilling (state, refresh, user)
         ▼
    AppShell > Sidebar > Módulos (POS, Pedidos, Cocina...)
```

### 3.2 Ciclo de vida de una mutación

1. Un componente llama a una función de `storage.js` (ej. `createOrder(...)`).
2. `readState()` carga/parsea `pdv_state_v2` desde `localStorage`.
3. La función muta el objeto JS en memoria.
4. `writeState(s)` serializa y guarda en `localStorage`.
5. Se llama a `logAudit(...)` (también escribe en localStorage).
6. Se llama a `runRules(event, ...)` si la operación lo aplica.
7. Se dispara `syncOrderToSupabase(order)` **en segundo plano** (best-effort, falla silencioso).
8. El componente debe llamar a `refresh()` (prop heredado de App) para que React
   re-renderice con el nuevo estado.

> **Nota crítica**: No hay un store reactivo global. El polling de 30s en App.jsx
> es la única forma de reflejar cambios de otro panel sin intervención manual.
> Si un módulo A crea un pedido y el usuario está en el módulo B, B no se entera
> hasta que `refresh()` se llama (por interacción) o pasan 30s.

### 3.3 Sincronización con Supabase

- **Al montar App.jsx**: intenta `verifyConnection()`, luego `loadStateFromSupabase()`
  y mergea contra el estado local (gana el que tenga más registros por colección).
- **Realtime**: se suscribe a la tabla `orders` (INSERT/UPDATE/DELETE). Cuando llega
  un payload, actualiza el estado local y muestra un toast.
- **Locks de cobro**: `payOrder()` llama a `acquirePayLock()` (RPC `can_pay_order`)
  y `releasePayLock()` (RPC `release_order_lock`). Fallback a update directo si la RPC falla.
- **Tablas sincronizables**: `orders`, `products`, `categories`, `tables`, `clients`,
  `riders`, `settings`, `users`. La sync es un `upsert` por `id` (best-effort).

## 4. Módulos del sistema

### 4.1 Módulo POS (`src/components/pos/POS.jsx`) — Toma de pedidos
- **Flujo**: Elige servicio (mostrador/domicilio/mesa) → Agrega productos →
  Aplica cupón/descuento → Abre `PaymentDialog` → Crea pedido con estado `preparando`.
- **ProductDetailModal**: Variantes, modificadores, cantidad, notas.
- **ClientSelect**: Busca/crea cliente al vuelo.
- **TableMap**: Selecciona mesa (solo libres).
- **HorariosModal**: Define horarios de servicio.
- **Productos libres**: Permite agregar ítems sin catálogo (nombre + precio).
- **Cart summary**: Sticky, con totales, descuentos y redondeo.

### 4.2 Módulo Pedidos (`src/components/orders/Pedidos.jsx`) — Lista de pedidos activos
- **Filtros por servicio**: Mostrador / Domicilio / Mesas.
- **Filtros por estado**: Todo / Pendiente / En curso / PDV-WEB / Aplicaciones.
- **Excluye** finalizados y cancelados (solo visibles en Historial).
- **Acciones**: Ver detalle, editar estado, cobrar (abre `PaymentDialog`),
  imprimir ticket, cancelar.
- **OrdenDrawer**: Panel lateral con detalles del pedido seleccionado.
- **Badges**: Por horario de servicio, por estado, por método de pago.

### 4.3 Módulo Cocina (`src/components/kitchen/Cocina.jsx`) — Kanban de cocina
- **Columnas**: Nuevo / Preparando / Listo (kanban con drag visual).
- **Timer**: Cuenta tiempo transcurrido por pedido.
- **Urgencia**: 15 minutos → badge rojo "URGENTE", borde rojo, sonido.
- **Sonido**: `soundNewOrder()` al llegar pedido nuevo (Web Audio beep).
- **Silenciar**: Toggle para desactivar sonido.
- **Reprint / View**: Reimprimir comanda, ver detalle.

### 4.4 Módulo Caja (`src/components/cash/Caja.jsx`) — Cortes de caja
- **Abrir caja**: Registra monto inicial, crea sesión `abierta`.
- **Venta de sesión**: Cada `payOrder()` agrega a `session.sales`.
- **Gastos / Ingresos extra / Retiros**: Se registran sobre la sesión abierta.
- **Cerrar caja**: Calcula `expectedCash` (opening + ventas efectivo - gastos - retiros),
  registra `cashCounted`, `difference`, `roundingProfit`.
- **CajaSummary**: Totales por método de pago, comisiones, redondeo.

### 4.5 Módulo Mesas (`src/components/tables/Mesas.jsx`) — Mapa de mesas
- **Salones**: Agrupan mesas (Terraza, Interior, Patio...).
- **Estados**: Libre (verde) / Ocupada (dorado) / Cuenta (ámbar) / Pagada (gris).
- **Acciones**: Crear mesa, editar, eliminar, liberar (tras pago), mover pedido
  de una mesa a otra, fusionar cuentas (une items de mesa origen a mesa destino).

### 4.6 Módulo Domicilios (`src/components/delivery/Domicilios.jsx`) — Entregas
- **Lista**: Pedidos con `serviceType` domicilio o menudigital con dirección.
- **Asignar repartidor**: `AssignRiderModal` → `assignRider()`.
- **Estados del repartidor**: disponible / ocupado / encamino.
- **NewDeliveryModal**: Crear pedido de domicilio directo (sin pasar por POS).

### 4.7 Módulo Inventario (`src/components/inventory/Inventario.jsx`) — Stock
- **Items**: Nombre, unidad, stock actual, stock mínimo, costo.
- **Movimientos**: Entrada / Salida / Ajuste / Merma.
- **Alertas**: Stock <= min → `runRules('inventory.bajo')`.
- **Estadísticas**: Valor del inventario, items bajos, agotados.

### 4.8 Módulo Dashboard (`src/components/dashboard/Dashboard.jsx`) — Inicio
- **Stats**: Ventas hoy, pedidos, ticket promedio, productos vendidos.
- **Estado operativo**: Nuevos, en preparación, listos, por cobrar, domicilios, mesas ocupadas.
- **Alertas automáticas**: Productos agotados, inventario bajo, pedidos atrasados (>15min),
  caja sin abrir, diferencias de caja, pedidos por cobrar.
- **Accesos rápidos**: Botones con gradiente para navegar a módulos clave.
- **Gráficas**: Ventas por hora (8h-23h) con Recharts BarChart.

### 4.9 Módulo Reportes (`src/components/reports/Reportes.jsx`)
- **Ventas por hora / día / semana** (Recharts).
- **Productos más vendidos** (top N).
- **Ventas por servicio** (mesa / mostrador / domicilio / menudigital).
- **Rango de fechas**: Selector personalizado.

### 4.10 Módulo Marketing (`src/components/growth/Marketing.jsx`)
- **Campañas**: CRUD de campañas promocionales (nombre, fechas, activo).
- **Cupones**: CRUD (código, tipo percent/fijo, valor, minPurchase, maxUses, usedCount,
  fechas inicio/fin, cliente específico, categorías/productos aplicables).
- **Fidelidad**: Top clientes por gasto (`clientStatsAll`).
- **Menú digital**: Configuración del menú público.

### 4.11 Módulo Historial (`src/components/ventas/HistorialPedidos.jsx`)
- **Solo pedidos finalizados/cancelados**.
- **OrderDetailModal**: Vista readonly de un pedido cerrado.
- **Sin edición ni cobro** — solo consulta.

### 4.12 Menú Digital (`src/MenuPage.jsx`)
- **URL**: `?menu=1` (modo standalone, fondo oscuro).
- **Público**: Cliente ve catálogo, agrega al carrito, elige servicio (llevar/domicilio),
  llena datos, envía pedido.
- **Crea pedido** con `status: 'nuevo'` y `createdBy: { name: 'Menú digital' }`.
- **Modos**: `order` (permite pedir) o `view` (solo consulta).
- **Servicios activos**: Configurables (llevar, domicilio, mesa).

## 5. Reglas de negocio

### 5.1 Estados de pedido

| Status | Transiciones válidas | Significado |
|--------|---------------------|-------------|
| `nuevo` | `preparando`, `cancelado` | Recién creado (solo menú digital y POS directo) |
| `preparando` | `listo`, `porcobrar`, `finalizado`, `cancelado` | En cocina |
| `listo` | `porcobrar`, `finalizado`, `cancelado` | Terminado en cocina (esperando entrega) |
| `porcobrar` | `finalizado`, `cancelado` | Entregado, esperando pago |
| `finalizado` | — (terminal) | Pagado y cerrado |
| `cancelado` | — (terminal) | Cancelado |

> **Regla de cocina**: Cuando `setKitchenStatus(id, 'listo')`:
> - Si es `mostrador` o `mesa` → pasa a `porcobrar` (cobro inmediato).
> - Si es `domicilio` o `menudigital` → se queda en `listo` (espera asignar repartidor).

### 5.2 Flujo de cobro

1. `PaymentDialog` muestra total y método de pago (efectivo / tarjeta / transferencia / qr).
2. Si es tarjeta y hay comisión configurada, muestra desglose (venta + comisión + redondeo = cobro al cliente).
3. Si es efectivo, muestra campo de "recibido" con presets y cálculo de cambio.
4. Al confirmar, llama a `payOrder()`:
   - Adquiere lock (`acquirePayLock()`).
   - Marca `paid = true`, `status = 'finalizado'`.
   - Registra venta en sesión de caja abierta.
   - Si era mesa, libera la mesa.
   - Incrementa `usedCount` del cupón si aplica.
   - Libera lock (`releasePayLock()`).
   - Sincroniza a Supabase.

### 5.3 Cupones

- **Tipos**: `percent` (porcentaje) o `fijo` (monto absoluto).
- **Restricciones**: Fecha inicio/fin, compra mínima, usos máximos, cliente específico,
  categorías/productos aplicables.
- **Aplicación**: `applyCoupon()` se llama en `createOrder()` y `recomputeOrder()`.
- **Recompute**: Si se agregan ítems a un pedido existente, el cupón se recalcula.

### 5.4 Descuentos

- **Dos fuentes**: Cupón (automático) + descuento manual (`discountReason`).
- **Total**: `discount = min(manual + cupon, subtotal)` (nunca negativo).
- **Promociones de producto**: Campo `promo` en producto (`bundle` + `price`).
  Ej. "3x100" → cada 3 unidades, precio promocional.

### 5.5 Roles y permisos

| Rol | Permisos principales |
|-----|---------------------|
| `admin` | `*` (todos) |
| `supervisor` | Todo excepto `users.edit`, `settings.edit` (casi todo) |
| `cajero` | orders.*, caja.*, clients.edit, discounts.apply, reports.view |
| `mesero` | orders.create/edit/pay/view, tables.manage, clients.edit, discounts.apply |
| `cocinero` | orders.view, kitchen.manage |
| `repartidor` | orders.view, delivery.manage |

**Autenticación**: Login por nombre + password (texto plano en localStorage).
Demo: `Administrador/1234`, `Cajero/1234`, `Carlos/4321` (supervisor).

### 5.6 Permisos granulares (lista completa)

```
orders.create, orders.edit, orders.pay, orders.cancel, orders.print, orders.view
inventory.view, inventory.edit
caja.open, caja.close, caja.view
reports.view
products.edit
clients.edit
discounts.apply
delivery.manage
kitchen.manage
settings.view
menu.manage
growth.manage
```

## 6. Sistema de estilos

### 6.1 Tokens CSS (variables `--c-*`)

En `src/index.css`, `:root` define los tokens base. Cada token es un triplet RGB
(espaciado), para poder usar `rgb(var(--c-brand) / 0.5)`.

| Token | RGB por defecto | Uso |
|-------|-----------------|-----|
| `--c-brand` | `37 99 235` (azul) | Acento principal (botones, links, activos) |
| `--c-brandLight` | `14 165 224` | Gradientes claros |
| `--c-brandDark` | `29 78 216` | Hover de botones |
| `--c-brandSoft` | `219 234 254` | Fondos suaves, badges |
| `--c-night` | `15 23 42` | Texto principal (casi negro en claro) |
| `--c-nightLight` | `30 41 59` | Texto secundario |
| `--c-nightLighter` | `51 65 85` | Bordes en oscuro |
| `--c-gold` | `212 160 23` | Mesas ocupadas, acentos secundarios |
| `--c-goldSoft` | `254 243 199` | Fondos de mesa ocupada |
| `--c-danger` | `220 38 38` | Errores, cancelaciones, urgencia |
| `--c-dangerSoft` | `254 226 226` | Fondos de error |
| `--c-dangerDark` | `185 28 28` | Texto de error (accesible) |
| `--c-success` | `5 150 105` | Estados positivos (libre, pagado) |
| `--c-successSoft` | `209 250 229` | Fondos de éxito |
| `--c-successDark` | `6 95 70` | Texto de éxito (accesible) |
| `--c-warning` | `217 119 6` | Alertas (por cobrar, atrasos) |
| `--c-warningSoft` | `254 243 199` | Fondos de alerta |
| `--c-warningDark` | `146 64 14` | Texto de alerta (accesible) |
| `--c-info` | `2 132 199` | Informativo (nuevo pedido) |
| `--c-infoSoft` | `224 242 254` | Fondos informativos |
| `--c-infoDark` | `3 105 161` | Texto informativo (accesible) |
| `--c-page` | `248 250 252` | Fondo de página |
| `--c-card` | `255 255 255` | Fondo de tarjetas |
| `--c-muted` | `148 163 184` | Texto secundario |
| `--c-line` | `226 232 240` | Bordes, divisores |

### 6.2 Tema oscuro

`[data-theme='dark']` remapa los tokens de superficie (page, card, night, line) pero
**conserva los de acento** (brand, danger, success, etc.):

| Token | Valor oscuro |
|-------|-------------|
| `--c-page` | `15 23 42` (slate-900) |
| `--c-card` | `30 41 59` (slate-800) |
| `--c-night` | `226 232 240` (texto claro) |
| `--c-nightLight` | `203 213 225` |
| `--c-line` | `51 65 85` |
| `--c-muted` | `100 116 139` |
| `--c-brandSoft` | `30 58 138` (tinte oscuro por paleta) |

Cada paleta tiene su override de `--c-brandSoft` en oscuro:
`sunset → 67 20 7`, `emerald → 6 78 59`, `berry → 80 7 36`, `slate → 51 65 85`, `midnight → 30 27 75`.

Además, en oscuro se fuerzan `.bg-white` → `var(--c-card)`, `.bg-white/10` → translúcido,
`.border-white/10` → translúcido, `.bg-night` → `rgb(15 23 42)`.

### 6.3 Paletas de acento

Definidas en `src/lib/theme.js` (PALETTE_OPTIONS) y `src/index.css` (`[data-palette]`).

| Paleta | Acento RGB | brandSoft | brandDark | Uso |
|--------|-----------|-----------|-----------|-----|
| `postia` | `37 99 235` (azul) | `219 234 254` | `29 78 216` | Default |
| `sunset` | `234 88 12` (naranja) | `255 237 213` | `194 65 12` | Cálido |
| `emerald` | `5 150 105` (verde) | `209 250 229` | `4 120 87` | Fresco |
| `berry` | `190 24 93` (rosa) | `252 231 243` | `157 23 77` | Vibrante |
| `slate` | `71 85 105` (gris) | `241 245 249` | `51 65 85` | Neutro |
| `midnight` | `99 102 241` (índigo) | `224 231 255` | `79 70 229` | Profundo |

Todas las paletas ajustan: `--c-brand`, `--c-brandSoft`, `--c-brandDark`, `--c-page`,
`--c-card`, `--c-night`, `--c-line`.

### 6.4 Tipografía

6 familias disponibles (variable fonts de `@fontsource-variable/*`):

| ID | Fuente |
|----|--------|
| `plus-jakarta-sans` | Plus Jakarta Sans (default) |
| `inter` | Inter |
| `manrope` | Manrope |
| `dm-sans` | DM Sans |
| `geist` | Geist |
| `ibm-plex-sans` | IBM Plex Sans |

Se aplica vía `data-font="{id}"` en `<html>`. Tailwind usa `var(--font-sans)`.
Monospace: `ui-monospace, 'SFMono-Regular', 'Menlo', 'Consolas'`.

### 6.5 Radio de bordes

Se aplica vía `data-radius="{sm|md|lg}"`.

| Valor | `--radius-sm` | `--radius-md` | `--radius-lg` | `--radius-xl` | `--radius-2xl` | `--radius-3xl` |
|-------|--------------|--------------|--------------|--------------|---------------|---------------|
| `sm` | 0.25rem | 0.375rem | 0.5rem | 0.625rem | 0.75rem | 1rem |
| `md` (default) | 0.5rem | 0.625rem | 0.75rem | 0.875rem | 1rem | 1.5rem |
| `lg` | 0.75rem | 0.875rem | 1rem | 1.125rem | 1.25rem | 1.75rem |

### 6.6 Sombras

Se aplica vía `data-style="{minimal|modern|soft|professional}"`.

| Estilo | `--shadow-card` | `--shadow-float` | `--shadow-pop` |
|--------|----------------|-----------------|---------------|
| `minimal` | none | none | `0 4px 16px rgba(0,0,0,.10)` |
| `modern` (default) | `0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.05)` | `0 4px 10px rgba(15,23,42,.07), 0 2px 4px rgba(15,23,42,.04)` | `0 10px 30px rgba(15,23,42,.14), 0 4px 8px rgba(15,23,42,.08)` |
| `soft` | `0 2px 6px rgba(15,23,42,.05), 0 1px 2px rgba(15,23,42,.03)` | `0 8px 20px rgba(15,23,42,.08)` | `0 16px 40px rgba(15,23,42,.15)` |
| `professional` | `0 1px 3px rgba(15,23,42,.08)` | `0 4px 12px rgba(15,23,42,.10)` | `0 12px 28px rgba(15,23,42,.14)` |

### 6.7 Densidad

Se aplica vía `data-density="{comfortable|normal|compact}"` (definido en `src/lib/Density.jsx`).

| Modo | Uso |
|------|-----|
| `comfortable` | Espaciado amplio, padding generoso |
| `normal` (default) | Estándar |
| `compact` | Reducido para pantallas pequeñas (menos padding, fuentes más chicas) |

### 6.8 Sidebar

Se aplica vía `data-sidebar="{expandido|auto|compacto}"` (gestionado por `AppShell.jsx`).

| Modo | Comportamiento |
|------|---------------|
| `expandido` | Siempre visible con labels (nunca colapsa) |
| `auto` (default) | En laptops (1024-1439px) colapsa a solo íconos; en desktop (>1440px) expandido |
| `compacto` | Siempre colapsado (solo íconos) |

### 6.9 Glassmorphism

Clase `.glass-btn` en `src/index.css:237`:
```css
.glass-btn {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```
En oscuro se invierte: fondo oscuro translúcido, texto claro.

### 6.10 Utilidades responsivas

- `.no-scrollbar`: oculta scrollbar (usado en horizontal scroll de píldoras/categorías).
- `.touch-target`: en móvil/tablet (<1024px) fuerza `min-height: 44px` (estándar UX accesible).
- `.animate-pop`: animación de entrada sutil (usada en modales y StatCards).

### 6.11 Reglas para nuevos componentes

1. **Nunca usar colores fijos** (`bg-white`, `text-gray-500`, `bg-emerald-50`). Siempre tokens (`bg-card`, `text-muted`, `bg-success-soft`).
2. **Siempre probar en claro Y oscuro** — el modo oscuro invierte superficies pero conserva acentos.
3. **Íconos**: lucide-react, tamaño 16-22px. En touch targets mínimo 24px de área táctil.
4. **Bordes**: `border-line` para divisores, `ring-2 ring-brand-soft` para focus.
5. **Botones**: variantes de `Button` (primary, dark, ghost, outline, danger, gold, amber, blue, success).
6. **Badges**: tonos de `Badge` (muted, brand, danger, gold, blue, purple, amber, success, info, warning, night).
7. **Tipografía**: mínimo 11px, body 14px, headings 16-20px. Mono solo para montos y folios.

## 7. Componente UI Kit (`src/components/ui.jsx`)

Componentes base reutilizables:

| Componente | Uso |
|-----------|-----|
| `Card` | Contenedor con fondo, borde, sombra |
| `StatCard` | Tarjeta de estadística con ícono, valor, subtítulo, tono |
| `Button` | Botón con variantes (primary, dark, ghost, outline, danger, gold, amber, blue, success...) |
| `Badge` | Etiqueta pequeña con tono (muted, brand, danger, gold, blue, purple, amber, success, info, warning, night) |
| `Field` | Label + children + hint |
| `Input` / `Textarea` / `Select` | Inputs estilizados con focus ring |
| `Toggle` | Switch on/off |
| `Tabs` | Pestañas con activo/inactivo |
| `Segmented` | Control segmentado (botón único seleccionado) |
| `SearchInput` | Input con ícono de lupa |
| `EmptyState` | Estado vacío con ícono, título, mensaje, acción |
| `PageHeader` | Encabezado de página con título, subtítulo, acciones |
| `QtyStepper` | Stepper de cantidad (+/-) |
| `Modal` | Modal con backdrop blur, cerrable fuera |
| `ConfirmDialog` | Diálogo de confirmación |
| `ToastViewport` | Contenedor de toasts |
| `QtyStepper` | Stepper de cantidad (+/-) |

### 7.1 Modales en portal

Los modales se montan con `createPortal` de React para evitar problemas de `z-index`
y `overflow: hidden` de contenedores padres:
- `ProductDetailModal` (POS)
- `OrderDetailModal` (Ventas)
- `CajasModal` (órdenes)
- `HorariosModal` (órdenes)
- `Pedidos.jsx` (portales inline para EstadoDropdown)

## 8. Sonido y notificaciones

### 8.1 Sonido (`src/lib/sound.js`)

- **Web Audio API**: Osciladores generados en tiempo de ejecución (sin archivos).
- `beep(count, urgent, freq)`: Genera N beeps.
- `soundNewOrder()`: 1 beep, 880Hz (suave).
- `soundUrgent()`: 2 beeps, 440Hz (cuadrado, urgente).
- `soundOk()`: 1 beep, 660Hz.
- `vibrate(ms)`: Vibración móvil si `navigator.vibrate` disponible.
- `browserNotify(title, body)`: Notificación nativa del navegador.
- `setMuted(v)` / `isMuted()`: Toggle de silencio.

### 8.2 Toasts (`src/lib/notify.js`)

- **Evento global**: `window.dispatchEvent(new CustomEvent('postia:toast', { detail: { message, type } }))`.
- **Helpers**: `toast()`, `toastOk()`, `toastErr()`, `toastWarn()`.
- **Render**: `ToastViewport` en `App.jsx` escucha el evento y muestra el toast.
- **Sin provider**: No hay contexto React; es un bus de eventos puro.

### 8.3 Automatizaciones / Reglas (`runRules`)

Cuando ocurre un evento (`order.nuevo`, `order.listo`, `order.paid`, `order.cancelado`,
`inventory.bajo`, `caja.closed`), se evalúan las reglas activas y se dispara un
evento `postia:notify` con los mensajes configurados (`notify`, `sound`, `print`).

## 9. Inventario y automatizaciones

### 9.1 Inventario

- **Items**: `name, unit, stock, minStock, cost, category, lastIn, lastOut`.
- **Movimientos**: `entrada` (+stock), `salida` (-stock), `ajuste` (=stock), `merma` (-stock).
- **Trigger**: Si un movimiento deja el stock <= minStock, se dispara `runRules('inventory.bajo')`.

### 9.2 Reglas / Automatizaciones

- **Modelo**: `{ name, when (evento), then (acción), target, active }`.
- **Eventos soportados**: `order.nuevo`, `order.preparando`, `order.listo`, `order.paid`,
  `order.cancelado`, `inventory.bajo`, `caja.closed`.
- **Acciones**: `notify` (mensaje), `sound` (beep), `print` (comanda).
- **Ejemplo**: "Cuando order.listo → sound" (avisa cocina).

## 10. Menú digital

- **URL**: `?menu=1` (abre `MenuPage` en vez de `App`).
- **Público**: Sin login. Ve catálogo, agrega al carrito, elige servicio, llena datos.
- **Crea pedido**: Con `status: 'nuevo'` y `createdBy: { name: 'Menú digital', role: 'menudigital' }`.
- **Configuración**: `menuDigital` en estado (enabled, mode, services, accent, welcome).
- **Modos**: `order` (permite pedir) o `view` (solo consulta).
- **QR / Preview**: Toasts informativos (aún no generan QR real).

## 11. Auditoría

Cada operación relevante llama a `logAudit(...)`:
- `user`, `action`, `detail`, `orderId`, `amount`, `before`, `after`, `date`.
- Se almacena en `state.audit[]`.
- Se puede limpiar con `clearAudit()`.
- Se muestra en `Auditoria.jsx` (módulo admin).

## 12. Persistencia y claves de localStorage

| Clave | Contenido |
|-------|-----------|
| `pdv_state_v2` | Estado completo del sistema (JSON) |
| `pdv_current_user` | Usuario en sesión (JSON) |
| `postia:theme` | Preferencias de tema (JSON: theme, font, density, radius, style, sidebar, palette) |
| `pdv_theme` | **LEGACY** — Tema antiguo (JSON: key) |

## 13. Testing

### 13.1 Estado actual: VIGENTE

- **Runner**: Vitest 4.1 + jsdom.
- **Specs**: `src/lib/storage.test.js` (5 tests), `src/lib/theme.test.js` (3 tests) = 8 totales.
- **Comando**: `npm run test` (vitest run) o `npm run test:watch` (modo watch).
- **Resultado**: 8/8 pasando (verificado 2026-08-15).
- **Config**: `vitest.config.js` con entorno jsdom.

### 13.2 Cobertura actual

- `storage.test.js`: Transiciones de estado (`setKitchenStatus` → `porcobrar` según servicio).
- `theme.test.js`: Funciones puras (`DEFAULT_PREFS`, `resolveTheme`, `getThemePrefs`).
- **No hay**: tests de componentes, integración, e2e.

### 13.3 Config muerta

- `playwright.config.ts`: Apunta a `tests/e2e/` (inexistente), puerto 3000 (Vite usa 5173),
  `@playwright/test` no instalado. No inventar scripts e2e.

### 13.4 Verificación post-cambio

- **Build**: `npm run build` → verde (7s).
- **Test**: `npm run test` → 8/8 pasando.
- **Dev**: `npm run dev` (levanta en 5173).
- **Test**: `npm run test` (rojo, no confiar en resultado).

## 14. Build y despliegue

| Comando | Resultado |
|---------|-----------|
| `npm install` | Instala deps (solo npm, hay lockfile) |
| `npm run dev` | Vite dev server → http://localhost:5173 |
| `npm run build` | `vite build` → `dist/` (1.2MB JS gzipped 324KB) |
| `npm run preview` | Sirve `dist/` localmente |

**Deploy**: `vercel.json` reescribe todo a `/index.html` (SPA routing).

## 15. Estructura de archivos (árbol resumido)

```
POSTIA/
├── src/
│   ├── App.jsx                    # Routing por estado + login + Supabase init
│   ├── MenuPage.jsx               # Menú digital público (?menu=1)
│   ├── index.css                  # Tokens CSS + tema oscuro + utilidades
│   ├── components/
│   │   ├── ui.jsx                 # Kit UI base (Card, Button, Badge, Modal...)
│   │   ├── layout/                # AppShell, Sidebar, Topbar, FilterBar, StatusFilter, SegmentedControl, Density
│   │   ├── pos/                   # POS, ProductDetailModal, TableMap, ClientSelect, ServiceTabs
│   │   ├── orders/                # Pedidos, OrderDrawer, CajasModal, HorariosModal, NuevoPedidoDropdown, PrintMenu
│   │   ├── kitchen/               # Cocina
│   │   ├── cash/                  # Caja, Jornadas, Gastos
│   │   ├── catalog/               # Productos, Categorias, Modificadores
│   │   ├── delivery/              # Domicilios, Repartidores
│   │   ├── growth/                # Marketing, MenuDigital, Cupones, Fidelidad, Automatizaciones
│   │   ├── inventory/             # Inventario
│   │   ├── clients/               # Clientes
│   │   ├── reports/               # Reportes
│   │   ├── dashboard/             # Dashboard
│   │   ├── ventas/                # HistorialPedidos, OrderDetailModal
│   │   ├── admin/                 # Apariencia, Configuracion, SettingsPage, Equipo, Auditoria, Impresion, NotificacionesCfg, PagosCfg
│   │   └── shared/                # PaymentDialog, ModifierPicker, ProductPicker, StatusBadge, TicketModal
│   └── lib/
│       ├── storage.js             # Estado + reglas de negocio (913 líneas, corazón del sistema)
│       ├── seed.js                # Datos demo (alitas, boneless, hamburguesas)
│       ├── format.js              # fmtMoney, fmtDateTime, fmtDuration, fmtAgo
│       ├── notify.js              # Toasts (evento global)
│       ├── sound.js               # Web Audio beep + vibrate + browser notify
│       ├── theme.js               # useTheme, applyTheme, paletas, tipografía, densidad
│       ├── themes.js              # LEGACY — temas antiguos (ola, cafe, foodtruck, dark)
│       ├── stats.js               # Agregados para Dashboard/Reportes
│       ├── cn.js                  # Utilidad de clases condicionales
│       ├── ticket.js              # buildTicket, ticketHTML, printTicket (58/80mm)
│       └── supabase-client.js     # Cliente Supabase + realtime + locks
├── index.html                     # Entry HTML
├── vite.config.js                 # Config Vite (plugin-react)
├── tailwind.config.js             # Config Tailwind
├── postcss.config.js              # PostCSS
├── jest.config.js                 # Config Jest (roto)
├── vercel.json                    # Deploy SPA
├── schema-supabase.sql            # Esquema SQL + RPCs
├── .env.local                     # Vars Supabase (NEXT_PUBLIC_*)
├── .env.example                   # Plantilla de env
└── todo.md                        # Estado textual del proyecto
```

## 16. Estado del proyecto y cambios recientes

### 16.1 Lo que funciona

- [x] Toma de pedidos (POS) con modificadores y producto libre
- [x] Gestión de pedidos activos (Pedidos) con filtros y estados
- [x] Kanban de cocina con timer y alertas de urgencia
- [x] Cobro con múltiples métodos y redondeo
- [x] Cobro express para mostrador (efectivo exacto en un clic)
- [x] Cortes de caja completos
- [x] Mapa de mesas con salones, mover y fusionar
- [x] Pedidos a domicilio con asignación de repartidor
- [x] Inventario con movimientos y alertas de stock bajo
- [x] Dashboard con estadísticas en tiempo real
- [x] Reportes con gráficas (Recharts)
- [x] Cupones y campañas
- [x] Menú digital público
- [x] Generación real de QR para menú digital y mesas
- [x] Tema claro/oscuro, 6 paletas, 6 tipografías, densidad, radio
- [x] Sincronización Supabase con cola de mutaciones y reintentos exponenciales
- [x] Auditoría de operaciones
- [x] Reglas de automatización (notify, sound, print)
- [x] IndexedDB como capa de persistencia (Dexie.js)
- [x] Almacenamiento asíncrono que no bloquea el UI

### 16.2 Lo que está roto / pendiente

- [ ] **Tests**: 8 tests pasando (Vitest), sin cobertura de componentes.

### 16.3 Deuda técnica identificada

1. **Sin store reactivo global**: El polling de 30s sigue existiendo pero se eliminará migrando a Zustand.
2. **LocalStorage vs IndexedDB**: La migración es parcial. `storage.js` sigue usando localStorage como fuente principal, con IndexedDB como capa adicional.
3. **Login en texto plano**: Passwords en localStorage sin hash. No es seguro para producción.
4. **Sin manejo de errores consistente**: Algunos try/catch, otros no.

### 16.4 Dependencias añadidas (2026-08-15)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `zustand` | 5.x | Store global reactivo (parcialmente implementado) |
| `idb` | 8.x | Wrapper de IndexedDB (no usado activamente aún) |
| `dexie` | 4.x | ORM IndexedDB (`src/lib/db.js`) |
| `qrcode.react` | 4.x | Generación de QR para menú y mesas |
| `vitest` | 4.x | Framework de tests (reemplazó Jest) |

### 16.5 Archivos creados (2026-08-15)

- `src/lib/db.js` — Capa Dexie.js para IndexedDB (cola de sync, estado, auditoría)
- `src/lib/sync-engine.js` — Motor de sincronización con reintentos exponenciales
- `src/store.js` — Store Zustand (no conectado completamente)
- `src/components/shared/QRMenuModal.jsx` — Modal de QR para menú digital
- `src/components/shared/QRTableModal.jsx` — Modal de QR para mesas individuales
- `schema-supabase-fixed.sql` — SQL corregido para Supabase
- `POSTIA-SYSTEM.md` — Este documento

### 16.6 Archivos eliminados (2026-08-15)

- `src/lib/themes.js` — Sistema de temas legacy (duplicaba funcionalidad de `theme.js`)

### 16.7 Componentes corregidos (2026-08-15)

| Archivo | Cambio |
|---------|--------|
| `Pedidos.jsx` | Colores fijos `white/gray-500` → tokens `bg-card/border-line/text-night` |
| `Mesas.jsx` | Colores fijos `emerald-50/amber-400` → tokens `success-soft/gold/warning-soft` |
| `Caja.jsx` | `bg-emerald-50/text-emerald-700` → tokens `success-soft/success-dark` |
| `PaymentDialog.jsx` | `bg-emerald-50/text-emerald-700` → tokens `success-soft/success-dark` |
| `Dashboard.jsx` | `text-sky-600/bg-sky-100/text-amber-600` → tokens `info-dark/info-soft/gold` |
| `SettingsPage.jsx` | Múltiples `text-gray-700/text-gray-500` → tokens `text-night/text-muted` |
| `AppShell.jsx` | Añadida integración de QRMenuModal |
| `Mesas.jsx` | Añadido botón "Cobrar exacto" para mostrador |

### 16.8 Reglas para desarrollo futuro

1. **Usar tokens CSS** (`bg-card`, `text-night`, `bg-brand-soft`, etc.) — NUNCA colores fijos.
2. **Usar Dexie.js** (`db.js`) para nuevas operaciones de persistencia.
3. **Usar `dbEnqueueSync()`** para cualquier operación que deba sincronizarse a Supabase.
4. **No sincronizar contraseñas** a Supabase.
5. **Probar en claro Y oscuro** — el modo oscuro invierte superficies pero conserva acentos.
6. **Build obligatorio**: `npm run build` debe pasar antes de entregar.
7. **Tests**: añadir specs para nueva lógica.
