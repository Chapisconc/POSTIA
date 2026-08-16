# Auditoría POSTIA — 2026-08-15

> Alcance: Frontend (estado, UI/UX, deuda técnica), Backend/Sync (Supabase) y Seguridad.
> Método: inspección de código fuente, `schema-supabase-fixed.sql`, medidas en vivo
> (navegador, Chrome DevTools) con tema **oscuro**, viewport desktop 1440×900 y móvil 375×667.
> **No se modificó código** (se eligió "auditar y entregar reporte").
> Estado verificado: `npm run test` 8/8 OK · `npm run build` OK · tema oscuro activo.

---

## Resumen ejecutivo

| # | Hallazgo | Severidad | Ubicación |
|---|----------|-----------|-----------|
| 1 | Sync Supabase **nunca corre** (funciones sin importar → ReferenceError) | 🔴 CRÍTICO | `src/App.jsx:8,83,115` |
| 2 | RLS abierta: `anon_all` FOR ALL USING(true) WITH CHECK(true) en las 14 tablas | 🔴 CRÍTICO | `schema-supabase-fixed.sql:397-437` |
| 3 | Contraseñas en texto plano + sesión sin expiración | 🔴 CRÍTICO | `src/lib/storage.js:6,115,197` |
| 4 | `ProductDetailModal` ilegible en dark (contraste 1.18) | 🔴 CRÍTICO | `src/components/pos/ProductDetailModal.jsx` |
| 5 | Merge por conteo (sin `updated_at`) → posible pérdida de datos | 🟠 ALTO | `src/App.jsx:87-110` |
| 6 | Carrera TOCTOU en `can_pay_order` → doble pago posible | 🟠 ALTO | `schema-supabase-fixed.sql:467` |
| 7 | Contraste dark insuficiente en todo el app (`text-muted` 3.07, blanco/gold 1.44, `text-gray-900` 1.21) | 🟠 ALTO | `src/index.css:181-314` + vistas |
| 8 | 164 líneas de colores Tailwind hardcodeados fuera del sistema de remap dark | 🟠 ALTO | varias vistas (abajo detalle) |
| 9 | Sync sin cola de reintentos (catch silencioso, sin retry) | 🟡 MEDIO | `src/lib/storage.js:380,527` |
| 10 | Botones de acción de 36 px en móvil (< 44 px recomendado) | 🟡 MEDIO | POS, Pedidos |
| 11 | Auditoría local mutable (`clearAudit`) e integrada a la tabla remota abierta | 🟡 MEDIO | `src/lib/storage.js:141` |
| 12 | Hint de login incoherente con la validación real | 🟡 MEDIO | `src/App.jsx:184-185` |
| 13 | Prop drilling: `refresh` sin uso en Gastos/Jornadas/Reportes; `user` sin uso en 3 componentes | 🟡 MEDIO | `cash/`, `reports/`, `admin/`, `pos/` |
| 14 | `CajasModal`/`HorariosModal` muertos (nadie los importa) | 🟡 MEDIO | `src/components/orders/` |
| 15 | Polling global 30 s fuerza re-render completo | 🟢 BAJO | `src/App.jsx:68-71` |
| 16 | Código muerto: `db.js`, `sync-engine.js`, `store.js` | 🟢 BAJO | `src/lib/`, `src/store.js` |
| 17 | `pdv_current_user` con objeto parcial obsoleto (trae `password`) | 🟢 BAJO | localStorage |
| 18 | Fallback silencioso a URL/key Supabase cloud hardcodeadas | 🟢 BAJO | `src/lib/supabase-client.js:8-13` |

---

## 1. Frontend

### 1.1 Estado y arquitectura de datos

**1.1a Rendimiento de `localStorage` — ✅ bien.**
- `pdv_state_v2` mide **37 207 bytes** con 13 órdenes, 20 productos, 3 usuarios, 54 entradas de auditoría.
- `JSON.parse` ~**0.108 ms**, `JSON.stringify` ~**0.204 ms** (50 iteraciones, desktop). Lejos del umbral de 50 ms.
- **Riesgo**: el tamaño crece con cada órdene/entrada de auditoría. Monitorear; si supera ~2-4 MB conviene IndexedDB (ya existe `db.js`, ver #16).

**1.1b Prop drilling (#13).**
- Todos los paneles reciben `state/refresh/onNav/user`.
- `refresh()` **nunca se llama** en `Gastos.jsx`, `Jornadas.jsx`, `Reportes.jsx`.
- `user` no se usa en `Configuracion.jsx`, `ClientSelect.jsx`, `ServiceTabs.jsx`.
- Profundidad: App→módulo (1 nivel); App→AppShell→Topbar/Sidebar (2). Código muerto pequeño, no bloqueante.

**1.1c Polling (#15).** `App.jsx:69` hace `setInterval(() => setState(s => ({...s})), 30000)` → re-render global cada 30 s aunque no haya cambios. Costo bajo en este tamaño, pero es trabajo desperdiciado con cualquier crecimiento.

### 1.2 UI — accesibilidad y dark mode

**1.2b Contraste dark mode (#4, #7) — problema real y sistémico.**
Causa raíz en `src/index.css:275-314`: el remap dark cubre `bg-*-50/100`, `text-gray-500..800`, `border-gray-200/300`, **pero no** `bg-gray-50`, `text-gray-900`, `text-gray-400`, `text-gray-300`. Resultado: colores remapeados y no remapeados se mezclan en el mismo componente → texto invisible.

Mediciones WCAG (color efectivo, fondo efectivo con alpha > 0.5):

| Componente / elemento | Ratio | Requerido | Nota |
|---|---|---|---|
| **ProductDetailModal** (`bg-gray-50` + texto remapeado a claro) | **1.18** | 4.5 | Ilegible en dark (título, precios, opciones) |
| Folios / totales de tarjeta en Pedidos (`text-gray-900` sobre tarjeta oscura) | **1.21** | 4.5 | Casi invisible (#1012, #1006, "Sin cliente", $120.00, $398.50) |
| Botones blanco sobre dorado: "💵 POR COBRAR", "ABRIR CAJA" (`bg-gold`) | **1.44** | 4.5 | `--c-gold` en dark es `252 211 77` (pálido) |
| Chips activos (Apariencia: "Oscuro", "POSTIA", fuente) | 1.55 | 4.5 | `bg-white` → token tarjeta, texto mal contrastado |
| Badges de servicio Historial ("Mostrador"/"POS") | 1.55 | 4.5 | 43 fallos en Historial |
| `text-brand` sobre fondo oscuro (links "Ver reportes", "5 prod.") | 2.83 | 4.5 | Azul `--c-brand` demasiado oscuro |
| `text-muted` (`--c-muted: 100 116 139`) sobre página `15 23 42` | **3.07** | 4.5 | **El más extendido**: aparece en todas las vistas |
| Chips de categoría Productos ("Alitas", "Boneless") | 2.18 | 4.5 | — |
| Segmento "Pago" (texto `gray-400` sobre `gray-50`) | 2.43 | 4.5 | — |
| "ABRIR CAJA" (texto blanco sobre dorado) | 1.44 | 4.5 | — |

Resumen por módulo (barrido de toda la app en dark):
Inicio 16 fallos · Pedidos 37 · Cocina 1 · Historial **43** · Productos 21 · Categorías 9 ·
Modificadores 13 · Clientes 27 · Caja 6 · Configuración 2 · Apariencia 29 · ProductDetailModal 32.

Nota: `text-muted` (3.07) es un problema **de token**, no de cada vista: `--c-muted` en dark debería subir (p. ej. `148 163 184`, slate-400) y resolvería ~60% de los fallos.

**1.2a Colores hardcodeados (#8).** **164 líneas** JSX con clases de color Tailwind fuera del sistema de tokens. Principales:
- `SettingsPage.jsx`: `text-gray-500` ×12, `text-sky-600` ×9, `text-gray-800` ×8, `bg-sky-50` ×8
- `Pedidos.jsx`: `text-gray-400` ×7, `text-gray-500` ×6, `bg-emerald-50` ×4, `text-emerald-700` ×4 (las tarjetas de órdenes usan `text-gray-900`; el `EstadoDropdown` sí está tokenizado)
- `ProductDetailModal.jsx`: `border-gray-200` ×6, `text-gray-400` ×6, `bg-gray-50` ×5
- `Modificadores.jsx`: `border-gray-200` ×5
- `Topbar.jsx`: `bg-red-500`, `bg-emerald-500/20`, `text-emerald-400`, `text-red-400` (Topbar:107,218)
- `ui.jsx`: `bg-purple-100` · `Mesas.jsx`/`Cocina.jsx`: varios

**1.2c Touch targets (#10).** En móvil 375×667: `Aceptar` **99×36**, `Pago` **80×36**, `Estado` **112×36**, iconos de cerrar **30-34 px**. La nav inferior móvil ("Mesas" 72×50) y `touch-target` CSS (44 px) sí cumplen; los botones de acción del contenido no. WCAG 2.5.8 recomienda ≥ 44×44.

**1.2d Flexbox/overflow — ✅ bien.** `main` es un único contenedor de scroll (`overflow-y:auto`, `overflow-x:hidden`), la lista de órdenes usa `overflow-auto flex-1 min-h-0` → sin doble scrollbar, sin clipping. Sin fallos.

### 1.3 Deuda técnica y pruebas

- **1.3a/b Legacy Next.js**: confirmado eliminado (`next.config.js`, `tsconfig.json`, `.eslintrc.json`, `jest.config.js`, `playwright.config.ts`); solo `.gitignore` conserva `.next/`/`out/`. ✅
- **1.3c Pruebas**: Vitest 8/8 pasan (storage, theme). **No existe prueba para `payOrder`** ni para el merge de App.jsx ni para el dark remap → regresiones en estas áreas pasarían desapercibidas. No hay e2e.
- `CajasModal`/`HorariosModal` y `db.js`/`sync-engine.js`/`store.js` (#14, #16): código muerto que `POSTIA-SYSTEM.md` §16 recomienda conectar. No conectados = deuda, no bug.

---

## 2. Backend / Sync (Supabase)

**2.1a** `syncOrderToSupabase` se invoca con `.catch(...)` en `storage.js:380,527`; no hay **cola de reintentos** ni cache-offline en la ruta activa (#9). Los reintentos/queue existen solo en `db.js` (muerto).

**2.1b** Merge (#5) en `App.jsx:87-110` es **por conteo de registros** (el que tenga más "gana"), sin `updated_at`. Dos dispositivos con el mismo nº de órdenes y datos distintos pierden datos; un UPDATE nunca se propaga por este merge.

**2.1c** `startRealtimeSync` tiene cleanup correcto (`App.jsx:143`) pero — por el bug #1 — **nunca llega a ejecutarse**.

**2.1 → Bug principal (#1, CRÍTICO).** `App.jsx:8` importa solo `{ verifyConnection, startRealtimeSync }`, pero en la línea 83 llama `loadStateFromSupabase()` y en la 115 `syncFullStateToSupabase(local)` (ambas exportadas en `supabase-client.js:116,198`). El `ReferenceError` lo atrapa el `try/catch` (`App.jsx:144-145`) y todo el bloque de init — merge remoto y realtime — **muere en silencio**. El app **no está sincronizando** pese a que parece "conectado".

**2.2** `can_pay_order` (`schema-supabase-fixed.sql:467`) sí tiene **timeout de 5 min** (`locked_at < now() - interval '5 minutes'`) y `release_order_lock` (línea 494), pero **retorna `TRUE` sin importar si el UPDATE matcheó filas** (#6): dos máquinas pueden adquirir el lock "exitosamente" en el mismo instante → doble pago. Falta comprobar `FOUND`/`row_count` y devolver el resultado real.

---

## 3. Seguridad

**3.1a Contraseñas en texto plano (#3).**
- `pdv_state_v2.users`: `Administrador/1234`, `Cajero/1234`, `Carlos/4321` en claro.
- `pdv_current_user` guarda el objeto usuario **completo** con `password` (escrito por una versión vieja; `setCurrentUser` actual solo guarda `{id,name,role}` — limpiar la clave).
- Se recomienda: hash (p. ej. SHA-256 con salt vía WebCrypto) + no persistir el usuario completo.

**3.1b Sin auto-logout (#3).** No existe timeout de inactividad, expiración de sesión ni TTL del token (`grep idle/inactiv/expir` en `App.jsx`/`storage.js` → nada). Quien tenga acceso al navegador conserva la sesión **indefinidamente** (y con la caja abierta).

**3.2 RLS (#2, CRÍTICO).** `schema-supabase-fixed.sql:379-393` habilita RLS en las 14 tablas, pero la **única** política es `anon_all FOR ALL USING(true) WITH CHECK(true)` en cada tabla (líneas 397-437), incluida `users`, `orders`, `caja_sessions` y `audit`. Con la anon key (que el cliente lleva embebida) **cualquiera** puede leer y escribir todo. Falso sentido de seguridad.

**3.3 Auditoría (#11).** `logAudit` (storage.js:127) persiste en `state.audit[]` local; `clearAudit()` (storage.js:141) puede **borrar el historial**; la tabla remota `audit` además está abierta por #2 → el log no es íntegro.

**3.4 Extra.** `supabase-client.js:8-13` cae a URL y anon key cloud hardcodeadas si no hay `.env` (#18). La anon key es pública por diseño, pero el fallback silencioso a la nube sin `.env.local` es sorprendente (el repo usa Supabase local en `supabase/`).

---

## Lo que está bien ✅
- Estado local pequeño y rápido (37 KB, ~0.1 ms parse).
- Layout flex/overflow correcto (single scroll, `min-h-0`).
- Sistema de tokens semánticos bien definido y remap dark parcial coherente (el problema es la cobertura, no el diseño).
- RPC de lock con timeout de 5 minutos.
- Tests y build pasan; sin config Next.js heredada.

## Recomendaciones priorizadas
1. **Corregir imports de App.jsx** (importar `loadStateFromSupabase`/`syncFullStateToSupabase`) → reactiva sync y realtime.
2. **Cerrar RLS**: políticas por rol (anon solo lectura de menú público; autenticados CRUD con reglas por org).
3. **Hash de contraseñas** + auto-logout por inactividad + limpiar `pdv_current_user` obsoleto.
4. **Dark mode**: subir `--c-muted` en dark a `148 163 184`; remapear `bg-gray-50`→`--c-card`, `text-gray-900`→`--c-night`, `text-gray-400`→`--c-muted`; usar `text-night` en botones sobre `bg-gold`; migrar las 164 líneas hardcodeadas a tokens.
5. **Merge con `updated_at`/timestamps** en vez de conteo; **`can_pay_order`** debe verificar filas actualizadas.
6. **Touch targets** ≥ 44 px en móvil (`.touch-target` existe, aplicarlo a los botones de acción).
7. Tests: cubrir `payOrder`, el merge y el remap dark.
