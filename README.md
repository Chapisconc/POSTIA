# POSTIA — Punto de venta (POS) configurable para restaurantes

Sistema de punto de venta para restaurantes donde el comportamiento del negocio
(módulos activos, estados de pedido, tipos de pedido, métodos de pago, impuestos)
se configura desde la base de datos, sin tocar código.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) + **React 19** + **Tailwind CSS 4**
- **Supabase** (PostgreSQL, Auth, RLS) — free tier
- **Vitest** + **React Testing Library** (tests unitarios) y **Playwright** (E2E)
- UI en español, TDD estricto (rojo → verde)

## Arquitectura

Cada negocio (`organizations`) es un tenant. `profiles` vincula al usuario con su
organización y el RLS aísla los datos entre negocios.

- `modules` / `org_modules` — módulos activos por negocio (pos, productos, caja, cocina…)
- `order_statuses` — flujo de estados (con `position`, `permite_cobro`, `notify_kitchen`, `color`)
- `order_types` — tipo de pedido (mesa, para llevar, a domicilio)
- `payment_methods` — métodos de pago por negocio
- `org_settings` — configuración (moneda, impuestos) con merge sobre defaults
- `categories` / `products` — catálogo por negocio (con `stock` para inventario)
- `orders` — pedidos con items en snapshot y totales calculados en el servidor
- `reports` — reporte de ventas (agrupa pedidos cobrados por método de pago)
- `cash_registers` — apertura/cierre de caja
- `inventory_movements` — entradas y salidas de inventario
- `branches` — sucursales por negocio
- `deliveries` — entregas a domicilio (asignado → en camino → entregado)
- `reservations` — reservas de mesas
- `invoices` — facturas CFDI (pedidos cobrados)
- `promotions` — descuentos porcentaje/fijo
- `loyalty_entries` — puntos de lealtad por cliente

### Capas

```
src/lib/config      catálogo de módulos y lectura de configuración por org
src/lib/products    servicio de productos
src/lib/orders      servicio de pedidos (totales, cobro, avance de estado)
src/lib/reports     reporte de ventas por método de pago
src/lib/*           servicios por módulo (caja, cocina, inventario, sucursales, …)
src/lib/api         handlers HTTP testeables (cliente inyectado)
src/app/api/*       rutas API (auth + requireOrgId + handler)
src/app/(app)/*     páginas autenticadas con shell (sidebar) + componentes cliente
```

## Setup local

```bash
npm install
npx supabase start        # levanta Supabase local (docker)
npm run dev               # http://localhost:3000
```

Credenciales locales: `supabase/.env.local` (URL `http://127.0.0.1:54321`, anon key).

Las migraciones viven en `supabase/migrations/` y se aplican a la base local vía
psql del contenedor (o `npx supabase db reset`).

## Tests

```bash
npm run test              # vitest (unitarios)
npx playwright test       # E2E (requiere el dev server o usa reuseExistingServer)
npm run lint
npx tsc --noEmit
```

## Flujo de alta

1. `/register` — crea la cuenta (Supabase Auth)
2. `/onboarding` — `rpc create_organization` crea el negocio con módulos,
   estados, tipos y métodos por defecto
3. `/dashboard` — muestra los módulos activos del negocio
4. `/dashboard/productos` — catálogo
5. `/pos` — registrar pedidos y cobrar
6. `/pedidos` — avanzar el estado de cada pedido
7. `/reportes` — ventas totales y por método de pago (también `GET /api/reports/sales`)
8. `/caja` — apertura/cierre de caja
9. `/cocina` — Kitchen Display (pedidos con `notify_kitchen`)
10. `/inventario`, `/sucursales`, `/delivery`, `/reservaciones`, `/facturacion`,
    `/promociones`, `/puntos` — módulos por negocio (on/off desde la BD)

Toda la navegación autenticada vive en un shell con sidebar (`src/app/(app)`).

## Proyecto remoto

- Ref: `anruvmeypudkrdvymsns` (https://anruvmeypudkrdvymsns.supabase.co)
- Las migraciones se promueven con la Management API
  (`POST /v1/projects/{ref}/database/query`) porque `supabase db push` cuelga con
  este proyecto.
- Para apuntar la app al remoto, cambia las variables en `.env.local` (URL del
  proyecto + anon key).

## Despliegue en Vercel

El proyecto es Next.js estándar: se despliega en Vercel importando el repo de
GitHub. La base remota ya está migrada.

1. Sube el repo a GitHub y conéctalo en Vercel (`vercel.com/new`, importar repo).
2. Configura estas variables de entorno en el proyecto de Vercel (Settings →
   Environment Variables):

   | Variable | Valor | Secreto |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://anruvmeypudkrdvymsns.supabase.co` | No |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ver `.env.local.example` | No |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ver `.env.local.example` | No |
   | `SUPABASE_SERVICE_ROLE_KEY` | consola de Supabase → API Keys (no commitear) | Sí |

3. Las rutas autenticadas son dinámicas (server-rendered); no requieren prerender
   en build. Verifica localmente con `npm run build` usando `.env.production`
   (archivo gitignored con los valores del remoto).
4. Crea la primera cuenta con `/register` y completa el onboarding (`/onboarding`).

Nota: `SUPABASE_SERVICE_ROLE_KEY` permite operaciones administrativas; solo
configúrala en Vercel, nunca en código.
