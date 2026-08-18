import React, { useMemo, useState } from 'react'
import { Card, Button, QtyStepper, Modal } from './components/ui'
import { fmtMoney } from './lib/format'
import { createOrder, getMenuDigital } from './lib/storage'
import { toast } from './lib/notify'

// Menú digital público: se abre con ?menu=1
export default function MenuPage({ state }) {
  const md = state.menuDigital || getMenuDigital()
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState({}) // productId -> {qty, note}
  const [service, setService] = useState(md.services?.domicilio ? 'domicilio' : 'mostrador')
  const [info, setInfo] = useState({ name: '', phone: '', address: '', colony: '', reference: '' })
  const [placing, setPlacing] = useState(false)

  const cats = useMemo(() => [{ id: 'all', name: 'Todo', emoji: '✨' }, ...state.categories], [state.categories])
  const products = state.products.filter((p) => p.available && (category === 'all' || p.categoryId === category))

  const addToCart = (p) => setCart((c) => ({ ...c, [p.id]: { qty: (c[p.id]?.qty || 0) + 1, note: c[p.id]?.note || '' } }))
  const dec = (id) => setCart((c) => {
    const q = (c[id]?.qty || 0) - 1
    const n = { ...c }
    if (q <= 0) delete n[id]
    else n[id] = { ...n[id], qty: q }
    return n
  })
  const cartList = Object.entries(cart).map(([id, v]) => ({ product: state.products.find((p) => p.id === id), ...v })).filter((x) => x.product)
  const subtotal = cartList.reduce((a, x) => a + x.product.price * x.qty, 0)
  const deliveryCost = service === 'domicilio' ? (state.settings.delivery?.baseCost || 30) : 0
  const total = subtotal + deliveryCost

  const placeOrder = () => {
    if (!info.name || (service === 'domicilio' && !info.address)) { toast('Completa tus datos', 'warning'); return }
    setPlacing(true)
    const items = cartList.map((x) => ({ productId: x.product.id, qty: x.qty }))
    createOrder({
      serviceType: service === 'llevar' ? 'mostrador' : service,
      client: service === 'domicilio' ? { name: info.name, phone: info.phone, address: info.address, colony: info.colony, reference: info.reference } : { name: info.name, phone: info.phone },
      items: items.map((i) => { const p = state.products.find((x) => x.id === i.productId); return { productId: i.productId, name: p.name, emoji: p.emoji, qty: i.qty, unitBase: p.price, price: p.price, modifiers: [], note: cart[i.productId]?.note || '', lineTotal: p.price * i.qty } }),
      deliveryCost: deliveryCost,
      status: 'nuevo',
      createdBy: { name: 'Menú digital', role: 'menudigital' },
    })
    setCart({}); setInfo({ name: '', phone: '', address: '', colony: '', reference: '' }); setPlacing(false)
    toast('Pedido enviado a la cocina ✅', 'success')
  }

  return (
    <div className="min-h-screen bg-night">
      <header className="bg-night text-white border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand grid place-items-center text-3xl mb-2">🌿</div>
          <h1 className="text-2xl font-extrabold">{state.meta.businessName}</h1>
          <p className="text-white/60 text-sm">{md.welcome}</p>
          {md.mode === 'view' && <p className="text-gold text-xs font-semibold mt-2">Modo solo consulta</p>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-32">
        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${category === c.id ? 'bg-brand text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {products.map((p) => {
            const inCart = cart[p.id]?.qty || 0
            return (
              <Card key={p.id} className={`p-4 ${inCart ? 'ring-2 ring-brand' : ''}`}>
                <div className="text-4xl mb-2">{p.emoji}</div>
                <div className="font-bold text-night text-sm leading-tight">{p.name}</div>
                <div className="text-xs text-muted mb-2 line-clamp-2">{p.description}</div>
                <div className="font-mono font-extrabold text-brand dark:text-night text-sm">{fmtMoney(p.price)}</div>
                {md.mode === 'order' ? (
                  inCart > 0 ? (
                    <div className="mt-2 flex items-center justify-between">
                      <QtyStepper value={inCart} onChange={(v) => {
                        if (v === 0) { const n = { ...cart }; delete n[p.id]; setCart(n) }
                        else setCart((c) => ({ ...c, [p.id]: { qty: v, note: c[p.id]?.note || '' } }))
                      }} />
                      <span className="text-xs text-muted">{inCart}</span>
                    </div>
                  ) : (
                    <Button className="w-full mt-2 !py-1.5 !text-xs" onClick={() => addToCart(p)}>Agregar</Button>
                  )
                ) : null}
              </Card>
            )
          })}
        </div>
      </main>

      {md.mode === 'order' && cartList.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-line p-3 shadow-2xl">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">{cartList.length} artículos</div>
                <div className="font-extrabold text-night text-lg font-mono">{fmtMoney(total)}</div>
              </div>
              <Button variant="gold" onClick={() => setPlacing(true)}>Ordenar · {fmtMoney(total)}</Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={placing} onClose={() => setPlacing(false)} title="Confirmar pedido" maxW="max-w-lg">
        <div className="space-y-3">
          <div className="space-y-1 max-h-40 overflow-auto">
            {cartList.map((x) => (
              <div key={x.product.id} className="flex justify-between text-sm bg-page rounded-lg px-3 py-1.5">
                <span className="font-medium text-night">{x.qty}× {x.product.emoji} {x.product.name}</span>
                <span className="font-mono text-night">{fmtMoney(x.product.price * x.qty)}</span>
              </div>
            ))}
            {deliveryCost > 0 && <div className="flex justify-between text-sm px-3"><span className="text-muted">Envío</span><span className="font-mono">{fmtMoney(deliveryCost)}</span></div>}
            <div className="flex justify-between text-sm font-bold px-3"><span>Total</span>              <span className="font-mono text-brand dark:text-night">{fmtMoney(total)}</span></div>
          </div>

          <div className="flex gap-2">
            {md.services?.llevar && <Button variant={service === 'llevar' ? 'primary' : 'outline'} className="flex-1 !text-xs" onClick={() => setService('llevar')}>🥡 Para llevar</Button>}
            {md.services?.domicilio && <Button variant={service === 'domicilio' ? 'primary' : 'outline'} className="flex-1 !text-xs" onClick={() => setService('domicilio')}>🚗 Domicilio</Button>}
            {md.services?.mesa && <Button variant={service === 'mesa' ? 'primary' : 'outline'} className="flex-1 !text-xs" onClick={() => setService('mesa')}>🍽️ Mesa</Button>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Nombre *" className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-brand" />
            <input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="Teléfono" className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-brand" />
          </div>
          {service === 'domicilio' && (
            <>
              <input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="Dirección *" className="w-full px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-brand" />
              <div className="grid grid-cols-2 gap-2">
                <input value={info.colony} onChange={(e) => setInfo({ ...info, colony: e.target.value })} placeholder="Colonia" className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-brand" />
                <input value={info.reference} onChange={(e) => setInfo({ ...info, reference: e.target.value })} placeholder="Referencia" className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-brand" />
              </div>
            </>
          )}

          <Button variant="gold" className="w-full" onClick={placeOrder}>Enviar pedido · {fmtMoney(total)}</Button>
          <p className="text-[11px] text-muted text-center">El pago se realiza al recibir tu pedido.</p>
        </div>
      </Modal>
    </div>
  )
}
