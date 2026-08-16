import React, { useEffect, useRef } from 'react'
import { Camera, ShoppingBag, Truck, ChevronDown } from 'lucide-react'
import { toastErr } from '../../lib/notify'

export default function NuevoPedidoDropdown({ open, onClose, onSelect }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.altKey && (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'r')) {
        e.preventDefault()
        onSelect('mostrador')
      } else if (e.altKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        onSelect('domicilio')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onSelect, onClose])

  const choose = (serviceType) => {
    onClose()
    try {
      onSelect(serviceType)
    } catch (err) {
      console.error('No se pudo abrir el nuevo pedido:', err)
      toastErr('No se pudo crear el nuevo pedido')
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={ref} className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 min-w-[250px] bg-card/95 backdrop-blur-md border border-line rounded-xl shadow-2xl p-1 text-night">
        <button type="button" onClick={() => choose('mostrador')} className="flex justify-between items-center w-full px-4 py-3 rounded-lg hover:bg-page transition-colors cursor-pointer">
          <span className="flex items-center gap-3 text-sm">
            <Camera size={16} /> En el local
          </span>
          <span className="bg-line px-2 py-1 rounded text-xs text-muted font-mono">Alt + N</span>
        </button>
        <button type="button" onClick={() => choose('mostrador')} className="flex justify-between items-center w-full px-4 py-3 rounded-lg hover:bg-page transition-colors cursor-pointer">
          <span className="flex items-center gap-3 text-sm">
            <ShoppingBag size={16} /> Para llevar
          </span>
          <span className="bg-line px-2 py-1 rounded text-xs text-muted font-mono">Alt + R</span>
        </button>
        <button type="button" onClick={() => choose('domicilio')} className="flex justify-between items-center w-full px-4 py-3 rounded-lg hover:bg-page transition-colors cursor-pointer">
          <span className="flex items-center gap-3 text-sm">
            <Truck size={16} /> A domicilio
          </span>
          <span className="bg-line px-2 py-1 rounded text-xs text-muted font-mono">Alt + Y</span>
        </button>
        <hr className="border-line my-1" />
        <button type="button" onClick={() => { onClose(); toastErr('Atajos: Alt+N/R/Y, Esc') }} className="flex justify-between items-center w-full px-4 py-3 rounded-lg hover:bg-page transition-colors cursor-pointer">
          <span className="text-sm">Ver atajos de teclado</span>
          <span className="bg-line px-2 py-1 rounded text-xs text-muted font-mono">F8</span>
        </button>
      </div>
    </>
  )
}
