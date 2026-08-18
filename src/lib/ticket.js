import { SERVICE_LABEL, getSettings } from './storage'

const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const mxn = (v) => `$${Number(v || 0).toFixed(2)}`

const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (iso) => {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SERVICE_NAMES = { mesa: 'Mesa', mostrador: 'Llevar', domicilio: 'Domicilio', menudigital: 'Digital' }
const serviceLabel = (o) => SERVICE_NAMES[o.serviceType] || o.serviceType || ''

export function buildTicket(order, settings = getSettings(), kind = 'ticket') {
  const s = settings || getSettings()
  const brand = 'POSTIA'
  const isKitchen = kind === 'kitchen'

  // Header compacto
  const lines = []
  lines.push({ type: 'brand', text: brand })
  
  if (s.business?.address) {
    const addr = s.business.address.slice(0, 28)
    lines.push({ type: 'center', text: addr })
  }
  
  lines.push({ type: 'title', text: isKitchen ? 'COMANDA' : 'TICKET' })
  lines.push({ type: 'sep' })
  
  // Info en una sola línea cuando sea posible
  lines.push({ type: 'info', text: `Folio #${order.folio}  ${fmtDate(order.createdAt)}` })
  lines.push({ type: 'info', text: `${serviceLabel(order)}${order.client?.name ? '  ' + order.client.name.slice(0, 15) : ''}` })
  
  if (order.tableId) {
    const mesaName = s.tables?.find?.(t => t.id === order.tableId)?.name || order.tableId
    lines.push({ type: 'info', text: `Mesa: ${mesaName}` })
  }
  
  if (order.title) {
    lines.push({ type: 'info', text: `Nota: ${order.title.slice(0, 20)}` })
  }
  
  lines.push({ type: 'sep' })

  // Items - ultra compactos
  for (const it of order.items) {
    const totalStr = isKitchen ? '' : mxn(it.lineTotal)
    const name = it.name.length > 12 ? it.name.slice(0, 11) + '…' : it.name
    lines.push({ type: 'item', qty: it.qty, name: name, total: totalStr })
    
    for (const m of it.modifiers || []) {
      const clean = String(m.name || '').replace(/^[+\-−–—]\s*/, '').slice(0, 18)
      const prefix = Number(m.price) > 0 ? '+' : '-'
      const price = Number(m.price) > 0 ? ` $${Number(m.price).toFixed(2)}` : ''
      lines.push({ type: 'mod', text: `  ${prefix}${clean}${price}` })
    }
    
    if (it.note) {
      lines.push({ type: 'note', text: `  * ${it.note.slice(0, 25)}` })
    }
  }

  lines.push({ type: 'sep' })

  // Footer compacto
  if (isKitchen) {
    lines.push({ type: 'center', text: '--- ESPERANDO ---' })
  } else {
    // Totales en formato compacto
    lines.push({ type: 'row', label: 'Subtotal', val: mxn(order.subtotal) })
    if (order.discount > 0) lines.push({ type: 'row', label: 'Desc', val: `-${mxn(order.discount)}` })
    if (order.tip > 0) lines.push({ type: 'row', label: 'Serv.', val: `+${mxn(order.tip)}` })
    if (order.packagingCost > 0) lines.push({ type: 'row', label: 'Empaq', val: `+${mxn(order.packagingCost)}` })
    if (order.deliveryCost > 0) lines.push({ type: 'row', label: 'Envio', val: `+${mxn(order.deliveryCost)}` })
    lines.push({ type: 'total', label: 'TOTAL', val: mxn(order.total) })
    lines.push({ type: 'sep' })
    
    if (order.paid) {
      lines.push({ type: 'center', text: '*** PAGADO ***' })
    }
    
    // Calcular cambio si hay pago en efectivo
    const cashMatch = order.payments?.find(p => p.method === 'efectivo')
    if (cashMatch?.cashReceived > 0) {
      const change = cashMatch.cashReceived - order.total
      lines.push({ type: 'row', label: 'Efectivo', val: mxn(cashMatch.cashReceived) })
      lines.push({ type: 'row', label: 'Cambio', val: mxn(change > 0 ? change : 0) })
    }
    
    lines.push({ type: 'center', text: 'Gracias!' })
  }

  return { lines }
}

function renderLine(line) {
  switch (line.type) {
    case 'brand':
      return `<div class="b">${esc(line.text)}</div>`
    case 'title':
      return `<div class="t">${esc(line.text)}</div>`
    case 'sep':
      return `<div class="s"></div>`
    case 'info':
      return `<div class="i">${esc(line.text)}</div>`
    case 'item':
      return `<div class="p"><span class="pq">${line.qty}x</span><span class="pn">${esc(line.name)}</span><span class="pp">${line.total}</span></div>`
    case 'mod':
      return `<div class="m">${esc(line.text)}</div>`
    case 'note':
      return `<div class="n">${esc(line.text)}</div>`
    case 'row':
      return `<div class="r"><span>${esc(line.label)}</span><span>${esc(line.val)}</span></div>`
    case 'total':
      return `<div class="to"><span>${esc(line.label)}</span><span>${esc(line.val)}</span></div>`
    case 'center':
      return `<div class="c">${esc(line.text)}</div>`
    default:
      return ''
  }
}

export function ticketHTML(order, settings, kind = 'ticket') {
  const t = buildTicket(order, settings, kind)
  const body = t.lines.map(renderLine).join('')
  const title = kind === 'kitchen' ? `Comanda #${order.folio}` : `Ticket #${order.folio}`
  
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Consolas,monospace;width:58mm;margin:0;padding:2mm;font-size:9.5px;line-height:1.25;color:#000;background:#fff}
.b{text-align:center;font-size:12px;font-weight:bold;letter-spacing:0.5px;padding:2px 0}
.t{text-align:center;font-size:10px;font-weight:bold;padding:3px 0 2px}
.s{border-bottom:1px dashed #666;margin:3px 0}
.i{font-size:9px;padding:0.5px 0}
.p{display:flex;align-items:baseline;padding:2px 0;font-size:9.5px}
.pq{font-weight:bold;min-width:18px}
.pn{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp{font-weight:bold;margin-left:4px;white-space:nowrap}
.m{padding-left:18px;font-size:8.5px;color:#444}
.n{padding-left:18px;font-size:8.5px;color:#444;font-style:italic}
.r{display:flex;justify-content:space-between;padding:1px 0;font-size:9px}
.to{display:flex;justify-content:space-between;padding:3px 0 1px;font-size:11px;font-weight:bold;border-top:1.5px solid #000;margin-top:2px}
.c{text-align:center;font-size:9px;padding:2px 0}
@media print{
  @page{size:58mm auto;margin:2mm}
  body{width:100%}
}
</style></head><body>${body}</body></html>`
}

// Vista previa del ticket (abre ventana con estilo de ticket térmico)
export function previewTicket(order, settings, kind = 'ticket') {
  const t = buildTicket(order, settings, kind)
  const body = t.lines.map(renderLine).join('')
  const title = kind === 'kitchen' ? `Comanda #${order.folio}` : `Ticket #${order.folio}`
  
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#e5e5e5;font-family:system-ui,sans-serif;padding:20px}
.ticket{background:#fff;width:220px;margin:0 auto;padding:8px 6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:'Courier New',Consolas,monospace;font-size:9.5px;line-height:1.25;color:#000}
.b{text-align:center;font-size:12px;font-weight:bold;letter-spacing:0.5px;padding:2px 0}
.t{text-align:center;font-size:10px;font-weight:bold;padding:3px 0 2px}
.s{border-bottom:1px dashed #666;margin:3px 0}
.i{font-size:9px;padding:0.5px 0}
.p{display:flex;align-items:baseline;padding:2px 0;font-size:9.5px}
.pq{font-weight:bold;min-width:18px}
.pn{flex:1;font-weight:600}
.pp{font-weight:bold;margin-left:4px}
.m{padding-left:18px;font-size:8.5px;color:#444}
.n{padding-left:18px;font-size:8.5px;color:#444;font-style:italic}
.r{display:flex;justify-content:space-between;padding:1px 0;font-size:9px}
.to{display:flex;justify-content:space-between;padding:3px 0 1px;font-size:11px;font-weight:bold;border-top:1.5px solid #000;margin-top:2px}
.c{text-align:center;font-size:9px;padding:2px 0}
.buttons{text-align:center;margin-top:16px}
.buttons button{background:#16a34a;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;margin:0 4px}
.buttons button.print{background:#2563eb}
.actions{display:flex;gap:8px;justify-content:center;margin-top:12px}
</style></head><body>
<div class="ticket">${body}</div>
<div class="actions">
  <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600">🖨️ Imprimir</button>
  <button onclick="window.close()" style="background:#666;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600">✕ Cerrar</button>
</div>
<p style="text-align:center;color:#666;margin-top:8px;font-size:12px">Vista previa de ticket térmico 58mm</p>
</body></html>`
}

export function printTicket(order, settings, kind = 'ticket') {
  // Abre vista previa en vez de imprimir directamente
  // Así el usuario puede ver cómo queda antes de gastar papel
  return openTicketPreview(order, settings, kind)
}

// Nueva función: abrir vista previa en vez de imprimir directamente
export function openTicketPreview(order, settings, kind = 'ticket') {
  const html = previewTicket(order, settings, kind)
  try {
    const w = window.open('', '_blank', 'width=300,height=650')
    if (!w) return false
    w.document.write(html)
    w.document.close()
    w.focus()
    return true
  } catch { return false }
}
