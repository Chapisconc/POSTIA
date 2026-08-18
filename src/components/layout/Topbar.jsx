import React, { useState, useEffect, useMemo } from 'react'
import { Menu, LogOut, Bell, HelpCircle, ChevronDown, Sparkles, Pause, Play, Banknote, Settings } from 'lucide-react'
import { toast } from '../../lib/notify'
import { fmtMoney } from '../../lib/format'

function PausaModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('5')

  const presets = [
    { label: '5 min', value: '5', icon: '☕' },
    { label: '10 min', value: '10', icon: '🍽️' },
    { label: '15 min', value: '15', icon: '🚶' },
    { label: '30 min', value: '30', icon: '📦' },
    { label: '1 hora', value: '60', icon: '⏰' },
  ]

  const handleConfirm = () => {
    onConfirm({ reason: reason || 'Sin especificar', minutes: parseInt(duration) })
    onClose()
    setReason('')
    setDuration('5')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-line shadow-2xl overflow-hidden animate-pop">
        <div className="px-6 pt-6 pb-4 border-b border-line bg-gradient-to-r from-gold-soft/50 to-warning-soft/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold grid place-items-center">
              <Pause size={24} className="text-white" />
            </div>
            <div>
              <h3 className="type-h3 text-night">Pausar sistema</h3>
              <p className="type-body text-muted">Tómate un descanso, pausaremos las notificaciones</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="type-body font-semibold text-night mb-2 block">Duración</label>
            <div className="grid grid-cols-5 gap-2">
              {presets.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDuration(p.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition ${
                    duration === p.value ? 'border-gold bg-gold-soft' : 'border-line hover:border-brand'
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="type-label text-night">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="type-body font-semibold text-night mb-2 block">Razón (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Hora de comer, reunión..."
              className="w-full px-4 py-3 rounded-lg border border-line bg-page text-night placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-line text-night font-semibold hover:bg-page transition">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-3 rounded-lg bg-gold text-gold-dark font-bold hover:bg-gold/80 transition flex items-center justify-center gap-2">
            <Pause size={16} /> Pausar
          </button>
        </div>
      </div>
    </div>
  )
}

function CajaModal({ open, onClose, state, onNav, onOpen }) {
  const session = state.caja?.sessions?.find(c => c.status === 'abierta')
  const cajaAbierta = !!session

  const summary = useMemo(() => {
    if (!session) return null
    const sales = session.sales || []
    const cashSales = sales.filter(s => s.method === 'efectivo').reduce((a, s) => a + s.charge, 0)
    const cardSales = sales.filter(s => s.method === 'tarjeta').reduce((a, s) => a + s.charge, 0)
    const totalSales = sales.reduce((a, s) => a + s.charge, 0)
    const expenses = (session.expenses || []).reduce((a, e) => a + e.amount, 0)
    return { cashSales, cardSales, totalSales, expenses, count: sales.length }
  }, [session])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-line shadow-2xl overflow-hidden animate-pop">
        <div className={`px-6 pt-6 pb-4 border-b ${cajaAbierta ? 'border-success/30 bg-gradient-to-r from-success-soft/50 to-success-soft' : 'border-danger/30 bg-gradient-to-r from-danger-soft/50 to-danger-soft'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl grid place-items-center ${cajaAbierta ? 'bg-success' : 'bg-danger'}`}>
              <Banknote size={24} className="text-white" />
            </div>
            <div>
              <h3 className="type-h3 text-night">{cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}</h3>
              <p className="type-body text-muted">{cajaAbierta ? 'Operando normalmente' : 'Abre la caja para continuar'}</p>
            </div>
          </div>
        </div>

        {cajaAbierta && summary && (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success-soft rounded-xl p-3">
                <div className="type-label text-success-dark">Ventas totales</div>
                <div className="text-xl font-mono font-extrabold text-success-dark mt-1">{fmtMoney(summary.totalSales)}</div>
              </div>
              <div className="bg-page rounded-xl p-3">
                <div className="type-label text-muted">Transacciones</div>
                <div className="text-xl font-mono font-extrabold text-night mt-1">{summary.count}</div>
              </div>
              <div className="bg-page rounded-xl p-3">
                <div className="type-label text-muted">Efectivo</div>
                <div className="text-lg font-mono font-bold text-night mt-1">{fmtMoney(summary.cashSales)}</div>
              </div>
              <div className="bg-page rounded-xl p-3">
                <div className="type-label text-muted">Tarjeta</div>
                <div className="text-lg font-mono font-bold text-night mt-1">{fmtMoney(summary.cardSales)}</div>
              </div>
            </div>
            {summary.expenses > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-danger-soft">
                <span className="type-caption font-semibold text-danger">Gastos</span>
                <span className="text-sm font-mono font-bold text-danger">-{fmtMoney(summary.expenses)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 px-6 py-4 border-t border-line">
          {cajaAbierta ? (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-line text-night font-semibold hover:bg-page transition">
                Cerrar
              </button>
              <button onClick={() => { onClose(); onNav('caja') }} className="flex-1 px-4 py-3 rounded-lg bg-brand text-white font-bold hover:bg-brand/90 transition flex items-center justify-center gap-2">
                <Banknote size={16} /> Ver caja
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-line text-night font-semibold hover:bg-page transition">
                Cancelar
              </button>
              <button onClick={() => { onClose(); onOpen() }} className="flex-1 px-4 py-3 rounded-lg bg-success text-white font-bold hover:bg-success/90 transition flex items-center justify-center gap-2">
                <Banknote size={16} /> Abrir caja
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Topbar({ state, user, userMenu, setUserMenu, onOpenMenu, onLoginOpen, onNav }) {
  const [pausaOpen, setPausaOpen] = useState(false)
  const [cajaOpen, setCajaOpen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const cajaAbierta = state.caja?.sessions?.some(c => c.status === 'abierta')

  const handlePausa = ({ reason, minutes }) => {
    setIsPaused(true)
    toast(`Sistema pausado por ${minutes} min: ${reason}`, 'info')
    setTimeout(() => {
      setIsPaused(false)
      toast('Pausa finalizada', 'success')
    }, minutes * 60 * 1000)
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-brand text-white shadow-lg shadow-brand/20">
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14">
          {/* Mobile menu toggle (oculto en móvil: la barra inferior ya tiene toda la navegación) */}
          <button className="hidden xl:flex p-2 -ml-1 rounded-lg hover:bg-white/10 transition touch-icon" onClick={onOpenMenu} aria-label="Abrir menú">
            <Menu size={22} />
          </button>

          {/* Logo + Brand */}
          <button onClick={() => onNav && onNav('inicio')} className="flex items-center gap-2 hover:bg-white/10 px-2 py-1.5 rounded-lg transition" aria-label="Ir al inicio">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm grid place-items-center text-lg shrink-0">🌿</div>
            <span className="hidden sm:block text-base font-bold text-white tracking-tight">POSTIA</span>
          </button>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {/* Pause */}
            <button
              onClick={() => setPausaOpen(true)}
              className={`p-2 rounded-lg transition-all duration-200 touch-icon ${isPaused ? 'bg-gold/30 text-gold scale-110' : 'hover:bg-white/10 hover:scale-105'}`}
              title={isPaused ? 'Sistema en pausa' : 'Pausar sistema'}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>

            {/* Caja */}
            <button
              onClick={() => setCajaOpen(true)}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 touch-icon ${cajaAbierta ? 'bg-success-soft text-success hover:bg-success-soft' : 'bg-danger-soft text-danger hover:bg-danger-soft'}`}
              title={cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
            >
              <Banknote size={18} />
            </button>

            <button onClick={() => toast('Actualiza tu plan próximamente', 'info')}
              className="hidden xl:flex items-center gap-1 border border-white/30 hover:bg-white/10 rounded-full px-2 py-1 text-[11px] font-bold transition">
              <Sparkles size={11} /> Plan
            </button>
            <button aria-label="Notificaciones" onClick={() => toast('Próximamente', 'info')}
              className="hidden sm:block p-2 rounded-lg hover:bg-white/10 transition touch-icon">
              <Bell size={18} />
            </button>
            <button aria-label="Soporte" onClick={() => toast('Próximamente', 'info')}
              className="hidden sm:block p-2 rounded-lg hover:bg-white/10 transition touch-icon">
              <HelpCircle size={18} />
            </button>
            <button aria-label="Configuración" onClick={() => onNav && onNav('configuracion')}
              className="p-2 rounded-lg hover:bg-white/10 transition touch-icon">
              <Settings size={18} />
            </button>

            {/* User */}
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)} aria-expanded={userMenu} aria-haspopup="menu" aria-label="Cuenta"
                className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg hover:bg-white/10 transition">
                <span className="w-8 h-8 rounded-full bg-white/20 grid place-items-center font-extrabold text-xs uppercase">{user?.name?.[0] || 'U'}</span>
                <span className="hidden md:block text-left">
                  <span className="block text-xs font-semibold leading-tight truncate max-w-[100px]">{user?.name}</span>
                  <span className="block text-[10px] text-white/80 leading-tight capitalize">{user?.role}</span>
                </span>
                <ChevronDown size={12} className={`text-white/70 transition ${userMenu ? 'rotate-180' : ''}`} />
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-card text-night rounded-xl border border-line shadow-lg overflow-hidden animate-pop">
                    <div className="px-4 py-3 border-b border-line">
                      <div className="text-sm font-bold truncate">{user?.name}</div>
                      <div className="type-caption text-muted capitalize">{user?.role}</div>
                    </div>
                    <button onClick={() => { setUserMenu(false); onLoginOpen() }}
                      className="w-full flex items-center gap-2 px-4 py-3 type-body text-night hover:bg-page transition touch-target">
                      <LogOut size={15} className="text-muted" /> Cambiar usuario
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Paused banner */}
        {isPaused && (
          <div className="bg-gold text-gold-dark px-4 py-2 text-center type-body font-bold">
            Sistema en pausa · Las notificaciones están desactivadas
          </div>
        )}
      </div>

      <PausaModal open={pausaOpen} onClose={() => setPausaOpen(false)} onConfirm={handlePausa} />
      <CajaModal open={cajaOpen} onClose={() => setCajaOpen(false)} state={state} onNav={onNav} onOpen={() => { setCajaOpen(false); onNav('caja') }} />
    </>
  )
}
