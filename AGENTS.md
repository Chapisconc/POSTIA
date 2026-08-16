# POSTIA — POS Restaurante

> Estado textual corto: `todo.md`. Análisis profundo (arquitectura, reglas de negocio, tokens CSS,
> módulos): `POSTIA-SYSTEM.md` (verificado 2026-08-15). Auditoría UI/UX + seguridad:
> `AUDITORIA-2026-08-15.md` (su hallazgo #1 — sync bug — ya fue corregido; los demás hallazgos
> siguen abiertos: RLS abierto, contraseñas en claro, dark mode contrast, TOCTOU en can_pay_order).
> No busques README/TDD/DESIGN/PRODUCT/futuro: se eliminaron por desactualizados.

Punto de venta para restaurante: React + Vite + JS/JSX + Tailwind 3 + Recharts + lucide-react.
Persistencia principal en `localStorage` (`pdv_state_v2`, `src/lib/storage.js`) con sync best-effort a
Supabase desde `src/lib/supabase-client.js`. No hay backend propio ni API routes. UI en español.

## Comandos

    npm install        # solo npm; package-lock.json (no pnpm/yarn)
    npm run dev        # Vite -> http://localhost:5173
    npm run build      # vite build -> dist/ (verificado: pasa)
    npm run preview    # sirve dist/
    npm run test       # vitest run — 8 tests en 2 archivos (5 storage + 3 theme)
    npm run test:watch # vitest en modo watch
    npx vitest run src/lib/storage.test.js   # test individual

No hay script de lint (`package.json` no define `lint`) ni config ESLint. `npm run clean` usa
`rm -rf dist` (estilo Unix).

## Testing

- Specs: `src/lib/storage.test.js` (5 tests), `src/lib/theme.test.js` (3 tests). Runner: **Vitest** + jsdom
  (`vitest.config.js`). Los tests pasan (verificado 2026-08-16).
- No hay e2e ni config Playwright; no inventes scripts e2e. `jest`/`@testing-library` están en
  devDependencies pero el runner activo es Vitest.
- No existen `data-testid` en el código; no inventes IDs de test.

## Estructura

- `src/App.jsx` — routing por estado (`tab`, default `pedidos`) + login + refresh global + polling
  de 30s + merge remoto + realtime sync. No tiene estado de negocio. En montaje corre `seedIfEmpty()`.
  El tab `configuracion` usa `SettingsPage`.
- `src/MenuPage.jsx` — menú digital standalone cuando la URL trae `?menu=1`.
- `src/components/pos/` — `POS.jsx`, `ProductDetailModal.jsx`, `TableMap.jsx`, `ClientSelect.jsx`,
  `ServiceTabs.jsx`.
- `src/components/orders/` — `Pedidos.jsx`, `OrderDrawer.jsx`, `NuevoPedidoDropdown.jsx`, `PrintMenu.jsx`.
- `src/components/layout/` — `AppShell.jsx`, `Sidebar.jsx`, `Topbar.jsx`, `FilterBar.jsx`,
  `StatusFilter.jsx`, `SegmentedControl.jsx`, `Density.jsx`.
- `src/components/` (otros paneles) — `tables/` (`Mesas.jsx`), `kitchen/` (`Cocina.jsx`), `cash/`
  (`Caja.jsx`, `Gastos.jsx`, `Jornadas.jsx`), `catalog/` (`Categorias.jsx`, `Modificadores.jsx`,
  `ProductEditor.jsx`, `Productos.jsx`), `delivery/` (`Domicilios.jsx`, `Repartidores.jsx`),
  `growth/` (`Automatizaciones.jsx`, `Cupones.jsx`, `Fidelidad.jsx`, `Marketing.jsx`, `MenuDigital.jsx`),
  `inventory/` (`Inventario.jsx`), `clients/` (`Clientes.jsx`), `reports/` (`Reportes.jsx`),
  `dashboard/` (`Dashboard.jsx`), `ventas/` (`HistorialPedidos.jsx`, `OrderDetailModal.jsx`),
  `admin/` (`Apariencia.jsx`, `SettingsPage.jsx`, `Equipo.jsx`, `Auditoria.jsx`, `Impresion.jsx`,
  `NotificacionesCfg.jsx`, `PagosCfg.jsx`).
- `src/components/shared/` — `PaymentDialog.jsx`, `ModifierPicker.jsx`, `ProductPicker.jsx`,
  `StatusBadge.jsx`, `TicketModal.jsx`, `QRCodeModal.jsx`, `QRMenuModal.jsx`, `QRTableModal.jsx`.
  Kit UI base en `src/components/ui.jsx`.
- `src/lib/` — `storage.js` (estado + reglas de negocio), `seed.js` (`seedIfEmpty`), `format.js`,
  `notify.js`, `sound.js`, `theme.js` (paletas), `stats.js`, `cn.js`, `ticket.js`, `supabase-client.js`.

## UI Kit (src/components/ui.jsx)

Base de botones con variantes semánticas. Los botones de **acción principal** deben usar las variantes
`gradient`, `gradientSuccess`, `gradientDanger` — son los que tienen sombra, brillo y hover con escala
para destacar visualmente. Evita `primary`/`success`/`danger` planos en acciones críticas.

Variantes disponibles: `primary`, `gradient`, `gradientSuccess`, `gradientDanger`, `dark`, `ghost`,
`outline`, `dangerOutline`, `outlineBrand`, `danger`, `gold`, `amber`, `blue`, `success`.

## Supabase

- `.env.local` apunta a **Supabase local (Docker)** con `VITE_SUPABASE_URL` (`http://127.0.0.1:54321`),
  `VITE_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_ORG_ID`. `supabase/` contiene el proyecto local
  (`config.toml`); levanta con `npx supabase start`.
- `supabase-client.js` lee `VITE_*` primero, luego `NEXT_PUBLIC_*`, y cae a URL/key cloud hardcodeadas:
  el app corre sin `.env`.
- Esquema y RPCs (`can_pay_order`, `release_order_lock`) en `schema-supabase-fixed.sql` (idempotente).
- **Sync funciona**: `App.jsx` importa `loadStateFromSupabase`, `syncFullStateToSupabase` y
  `startRealtimeSync`. En montaje se verifica conexión, se hace merge por `updatedAt` (cada registro)
  y se inicia realtime en tabla `orders` (INSERT/UPDATE/DELETE).
- **RLS abierto**: `schema-supabase-fixed.sql:397-437` crea política `anon_all FOR ALL USING(true)
  WITH CHECK(true)` en las 14 tablas. Con la anon key embebida, cualquiera puede leer/escribir todo.
- **`can_pay_order` TOCTOU** (schema ~line 467): retorna `TRUE` sin verificar si el UPDATE matcheó
  filas → doble pago posible entre dos máquinas.

## Convenciones

- Estado por panel; los paneles usan `readState()`/`writeState()` y `App.jsx` hace refresh global
  (prop `refresh`). No hay store global reactivo en uso.
- Modales en portal con `createPortal` (`ProductDetailModal`, `OrderDrawer` y `Pedidos.jsx` inline);
  estilos con tokens semánticos `bg-card`, `text-night`, `border-line` (variables `--c-*` en `src/index.css`).
  Probar siempre tema claro y oscuro; nada de fondos `white`/negro duros.
- Errores: `try/catch` + `console.error('Error …:', error)` + `toastErr('mensaje en español')`;
  nunca mostrar `error.message` directo al usuario.
- Toasts: `toast(message, type)`/`toastOk`/`toastErr`/`toastWarn` de `src/lib/notify.js` (evento
  global `postia:toast`), sin provider por panel.
- Formato: `src/lib/format.js` (`fmtMoney`, `fmtDateTime`, `fmtDuration`, `fmtAgo`) con
  `Intl` es-MX/MXN.
- Enums en `src/lib/storage.js` (fuente única):
  órdenes `nuevo|preparando|listo|porcobrar|finalizado|cancelado` (export `ORDER_STATUS`);
  cocina `nuevo|preparando|listo|entregado` (`KITCHEN_STATUS`);
  mesas `libre|ocupada|cuenta|pagada` (`TABLE_STATUS`);
  servicios `mesa|mostrador|domicilio|menudigital` (`SERVICE_TYPES`);
  pagos `efectivo|tarjeta|transferencia|qr` (`PAYMENT_METHODS`).
- Imports relativos sin alias `@/` (0 usos en `src`).
- **Botones de acción crítica** (cobrar, finalizar, aceptar, confirmar) siempre con variantes
  `gradient*` para que destaquen — sombra coloreada, gradiente y hover con escala. Botones secundarios
  usan `outline`/`ghost`/`dangerOutline`.

## Trampas

- **Ruta OneDrive con espacios** (`C:\Users\PC\OneDrive - Universidad de Guadalajara\Desktop\POSTIA`):
  genera ruido en logs/cachés; no lo confundas con errores reales.
- **No hay git inicializado**: `git status` falla (exit 128); no asumas ramas ni commits.
- **Puerto 5173**: si ya está ocupado, no levantes un segundo dev server.
- **Legacy Next.js**: ya no quedan `next.config.js`/`tsconfig.json`/`.eslintrc.json` (se eliminaron);
  solo `.gitignore` conserva entradas `.next/`/`out/`. No añadas config Next.js.
- **Deploy Vercel**: `vercel.json` reescribe todo a `/index.html` (SPA).
- **Login demo**: `login()` compara el **nombre completo** (case-insensitive) contra el catálogo.
  Credenciales reales: `Administrador/1234` (admin), `Cajero/1234` (cajero), `Carlos/4321` (supervisor).
  Escribir "admin"/"supervisor"/"cajero" como nombre NO matchea.
- **Build**: el warning de chunk >500KB (JS ~1.3MB) es esperado, no un error.
- **Stderr en tests**: los mensajes `Supabase sync order error: fetch failed` aparecen porque no hay
  Supabase local corriendo. Son esperados y no fallan los tests.
