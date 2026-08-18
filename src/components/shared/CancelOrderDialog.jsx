import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card } from '../ui'
import { authorizeSupervisor } from '../../lib/storage'

import { X } from 'lucide-react'

const CANCEL_REASONS = [
  { value: 'cambio_opinion', label: 'Cambio de opinión del cliente' },
  { value: 'error_pedido', label: 'Error en el pedido' },
  { value: 'producto_no_disponible', label: 'Producto no disponible' },
  { value: 'cliente_no_acreditado', label: 'Cliente no acreditado' },
  { value: 'otro', label: 'Otro (especificar)' },
]

export default function CancelOrderDialog({ order, open, onClose, onConfirm }) {
  const [step, setStep] = useState('supervisor')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [error, setError] = useState('')
  const passwordRef = useRef(null)

  useEffect(() => {
    if (open) {
      setStep('supervisor')
      setPassword('')
      setReason('')
      setCustomReason('')
      setError('')
      setTimeout(() => passwordRef.current?.focus(), 100)
    }
  }, [open])

  if (!open || !order) return null

  const handleVerifySupervisor = () => {
    if (!password.trim()) {
      setError('Ingresa la contraseña del supervisor')
      return
    }
    const sup = authorizeSupervisor(password.trim())
    if (!sup) {
      setError('Contraseña incorrecta o usuario no autorizado')
      setPassword('')
      return
    }
    setStep('reason')
    setError('')
  }

  const handleConfirm = () => {
    if (!reason) {
      setError('Selecciona una razón de cancelación')
      return
    }
    if (reason === 'otro' && !customReason.trim()) {
      setError('Especifica la razón de cancelación')
      return
    }
    const finalReason = reason === 'otro' ? customReason.trim() : CANCEL_REASONS.find(r => r.value === reason)?.label || reason
    onConfirm(finalReason)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 bg-night/60 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-sm p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-night">Cancelar pedido #{order.folio}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition">
            <X size={18} />
          </button>
        </div>

        {step === 'supervisor' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Se requiere autorización de un supervisor para cancelar este pedido.</p>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Contraseña del supervisor</label>
              <Input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifySupervisor()}
                placeholder="Contraseña..."
                className={error ? 'border-danger' : ''}
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button variant="gradient" className="flex-1" onClick={handleVerifySupervisor}>Verificar</Button>
            </div>
          </div>
        )}

        {step === 'reason' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Selecciona la razón de cancelación:</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setReason(r.value); setError('') }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition text-sm font-medium ${
                    reason === r.value
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-line bg-card text-night hover:bg-page'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reason === 'otro' && (
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Especifica la razón:</label>
                <Input
                  value={customReason}
                  onChange={(e) => { setCustomReason(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="Describe la razón..."
                  className={error ? 'border-danger' : ''}
                  autoFocus
                />
              </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('supervisor')}>Atrás</Button>
              <Button variant="gradientDanger" className="flex-1" onClick={handleConfirm}>Cancelar pedido</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
