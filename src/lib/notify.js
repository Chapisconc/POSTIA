// Toasts en la app (evento global) + helpers de notificación.
export function toast(message, type = 'info') {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('postia:toast', { detail: { message: String(message), type } }))
  } catch { /* noop */ }
}
export function toastOk(message) { toast(message, 'success') }
export function toastErr(message) { toast(message, 'error') }
export function toastWarn(message) { toast(message, 'warning') }
