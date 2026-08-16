// Formato de moneda MXN y fechas en español — instancias singleton para evitar recreación.
const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const MONEY_FMT = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})
const NUM_FMT = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const DEC_FMT = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtMoney = (v) => MONEY_FMT.format(Number(v) || 0)
export const fmtNum = (v) => NUM_FMT.format(Number(v) || 0)
export const fmtDec = (v) => DEC_FMT.format(Number(v) || 0)

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
export const fmtTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
export const fmtDuration = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
export const fmtAgo = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < MINUTE) return 'hace unos segundos'
  if (diff < HOUR) return `hace ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `hace ${Math.floor(diff / HOUR)} h`
  return `hace ${Math.floor(diff / DAY)} d`
}
export const nowISO = () => new Date().toISOString()
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const todayKey = todayISO
export const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`
