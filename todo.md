# POSTIA — todo.md

> Resumen textual del estado del sistema, componentes y reglas activas. Reemplaza a los *.md
> dispersos en la raíz que ya no aportan al flujo actual y no deben leerse para trabajar.

Sistema POS de restaurante implementado con React + Vite en JS/JSX + Tailwind 3 + lucide-react.
Persistencia principal: localStorage bajo `pdv_state_v2` con sync opcional a Supabase cuando está
conectado. No hay backend propio ni API routes. Interfaz en español.

## Qué se usa hoy (componentes y flujos)

- **App.jsx**: enrutamiento por estado (`tab`) + login + refresh global + merge remoto desde
  Supabase. Módulos registrados en `MODULES` y alistados en Sidebar.
- **Sidebar.jsx**: navegación principal, drawers móviles, cierre por Escape, CajaStatus,
  optimizado con React.memo y cn().
- **AppShell.jsx**: topbar, layout con sidebar + contenido, barra inferior móvil con navegación
  rápida y “Más opciones”.
- **POS.jsx**: módulo de toma de pedidos, horarios de servicio, carrito sticky, ProductDetailModal,
  TableMap/js, cart summary, coupons, digitación de servicio/mesa/cli/domicilio, cobro y aceptar.
- **Pedidos.jsx**: lista de pedidos activos, filtros semánticos sin finalizados/cancelados, badge de
  horario, pestaña de estado, acción de pago y datos del carrito.
- **ProductDetailModal.jsx**: selección de producto con variantes, cantidades, comentarios y
  precios dinámicos, estado limpio al cerrar.
- **TableMap.jsx**: zona de mesas, salas con contadores, grid memoizado, tarjetas de estado y
  creación rápida de mesa.
- **HistorialPedidos.jsx**: historial de pedidos finalizados/cancelados con fecha, origen y folio sin
  edición ni cobro.
- **OrderDetailModal.jsx**: detalle readonly para pedidos cerrados con fallbacks defensivos.
- **CajasModal.jsx / HorariosModal.jsx**: modales extractos con temática coherente y tokens.

## Funciones y helpers centrales (lib/)

- **storage.js**: creación de pedidos, actualización, pago, cambio de estado, tabla, salon,
  cobro, descuentos, promo, clientes, riders, etc.
- **format.js**: moneda MXN, fechas/horas, diferencias de tiempo, helpers de número y porcentaje.
- **notify.js**: toasts con rate-limit y detección de window, helpers `toast`, `toastErr`, `toastOk`.
- **theme.js**: preferencias de tema, paletas, modo claro/oscuro, clase en html, sincronización.
- **sound.js**: notificaciones sonoras opcionales.
- **cn.js**: ayuda para clases condicionales sin repetir.

## Convenciones activas

- Stack: React + Vite + JS/JSX + Tailwind 3 + lucide-react.
- Los estilos del POS usan tokens semánticos cuando sea posible; los casos de focus/accent u
  overlays específicos pueden usar versiones declarativas del muestraón de diseño/key point.
- Los toasts usan el sistema global sin provider por panel.
- Los modales se montan en un portal y se cierran devolviendo estado limpio.

## Qué se eliminó y por qué

Se consolidó sobre el flujo actual los *.md del repo que ya no representan el sistema tal como está:
`README.md`, `TDD.md`, `DESIGN.md`, `PRODUCT.md` y `futuro.md`. Su contenido quedó desactualizado
con respecto a la arquitectura, los módulos reales, el manejo de tema y las reglas de negocio vigentes,
así que se eliminaron para evitar lecturas contradictorias. La referencia operativa hoy es este mismo
`todo.md` junto con `AGENTS.md`.

## Build y verificación

Comando de build: `npm run build`. El build tiene que estar verde antes de entregar cualquier cambio
de interfaz o de lógica. Los errores deben resolverse en la rama del cambio, no en su propio asunto.
