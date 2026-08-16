// Sonido para cocina (WebAudio, sin archivos externos) + notificaciones.
let ctx = null
let muted = false

export function setMuted(v) { muted = !!v }
export function isMuted() { return muted }

function ensureCtx() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

export function beep(count = 1, urgent = false, freq = 880) {
  if (muted) return
  const c = ensureCtx()
  if (!c) return
  for (let i = 0; i < count; i++) {
    const t = c.currentTime + i * 0.18
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = urgent ? 'square' : 'sine'
    osc.frequency.setValueAtTime(urgent ? 440 : freq, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.18)
  }
}

export function soundNewOrder() { beep(1, false, 880) }
export function soundUrgent() { beep(2, true, 440) }
export function soundOk() { beep(1, false, 660) }

export function vibrate(ms = 200) {
  try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* noop */ }
}

export function browserNotify(title, body) {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') new Notification(title, { body })
    else if (Notification.permission !== 'denied') Notification.requestPermission()
  } catch { /* noop */ }
}
