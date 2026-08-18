// Búsqueda tolerante a acentos y errores tipográficos (sin dependencias).
// Inspirado en el Informe Analítico: el buscador del POS debe resolver en <100ms
// y tolerar "enchilada"/"enchiladda", "milanesa"/"milaneza", acentos, etc.
// Para la búsqueda contra Supabase se recomienda pg_trgm + unaccent en la BD
// (ver schema-supabase-fixed.sql); esta utilidad cubre el filtrado local en el cliente.

const ACCENT_MAP = {
  a: 'aáàäâãå', e: 'eéèëê', i: 'iíìïî', o: 'oóòöôõ', u: 'uúùüû',
  n: 'nñ', c: 'cç',
}
const ACCENT_REVERSE = {}
for (const [base, variants] of Object.entries(ACCENT_MAP)) {
  for (const ch of variants) ACCENT_REVERSE[ch] = base
}

// Quita acentos y normaliza a minúsculas para comparación insensible.
export function normalize(text) {
  if (!text) return ''
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos
    .toLowerCase()
    .trim()
}

// Distancia de Levenshtein (edición) entre dos strings ya normalizados.
// Tolerante a typos: un caracter de más/menos ("enchiladda" vs "enchiladas").
function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    [prev, cur] = [cur, prev]
  }
  return prev[n]
}

// Umbral de typo: permite ~2 errores en palabras largas, 1 en cortas.
function typoThreshold(s) {
  return Math.max(1, Math.min(2, Math.floor(s.length / 5)))
}

// ¿La query es subcadena o está a distancia de typo del target (o viceversa)?
function near(a, b) {
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  if (Math.abs(a.length - b.length) > 2) return false
  return lev(a, b) <= typoThreshold(a.length > b.length ? a : b)
}

// Coincidencia difusa: retorna true si `query` matchea `text` tolerando
// acentos y errores leves (substring normalizada, token o typo de 1-2 chars).
export function fuzzyMatch(query, text) {
  const q = normalize(query)
  if (!q) return true
  const t = normalize(text)
  if (!t) return false
  if (near(q, t)) return true
  // Fallback por tokens: algún token del texto matchea la query (o viceversa)
  const qTokens = q.split(/\s+/)
  const tTokens = t.split(/\s+/)
  return qTokens.some((qt) => tTokens.some((tt) => near(qt, tt)))
}

// Score 0..1 de similitud (usado para ordenar resultados). Basado en coincidencia
// de subcadena normalizada + bonificación por prefijo + typo cercano.
export function matchScore(query, text) {
  const q = normalize(query)
  const t = normalize(text)
  if (!q || !t) return 0
  if (t === q) return 1
  if (t.startsWith(q)) return 0.9
  if (t.includes(q)) return 0.7
  if (near(q, t)) return 0.6
  const tTokens = t.split(/\s+/)
  if (tTokens.some((tt) => tt.startsWith(q) || near(q, tt))) return 0.5
  return 0
}
