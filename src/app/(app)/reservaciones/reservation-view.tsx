'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Reservation, ReservationStatus } from '@/lib/reservations/reservations'

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
}

const STATUS_BADGE: Record<ReservationStatus, string> = {
  confirmada: 'bg-emerald-500/20 text-emerald-400',
  cancelada: 'bg-red-500/20 text-red-400',
  completada: 'bg-slate-700 text-slate-100',
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

interface ReservationViewProps {
  reservations: Reservation[]
}

export function ReservationView({ reservations }: ReservationViewProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [reservedAt, setReservedAt] = useState('')
  const [reservedTime, setReservedTime] = useState('')
  const [guests, setGuests] = useState('2')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        reserved_at: reservedAt,
        reserved_time: reservedTime,
        guests: Number(guests),
        notes,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'No se pudo crear la reservación')
      setLoading(false)
      return
    }

    setName('')
    setPhone('')
    setReservedAt('')
    setReservedTime('')
    setGuests('2')
    setNotes('')
    router.refresh()
  }

  const updateStatus = async (reservation: Reservation, status: ReservationStatus) => {
    setUpdatingId(reservation.id)
    setError(null)
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'No se pudo actualizar el estado')
        return
      }
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold">Reservaciones</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <form
        onSubmit={handleCreate}
        className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-name">
            Nombre
          </label>
          <input
            id="reservation-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-44">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-phone">
            Teléfono
          </label>
          <input
            id="reservation-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-date">
            Fecha
          </label>
          <input
            id="reservation-date"
            type="date"
            required
            value={reservedAt}
            onChange={(e) => setReservedAt(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-time">
            Hora
          </label>
          <input
            id="reservation-time"
            type="time"
            required
            value={reservedTime}
            onChange={(e) => setReservedTime(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-28">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-guests">
            Comensales
          </label>
          <input
            id="reservation-guests"
            type="number"
            min={1}
            required
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-56">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="reservation-notes">
            Notas
          </label>
          <input
            id="reservation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          Crear reservación
        </button>
      </form>

      {reservations.length === 0 ? (
        <p className="text-slate-400">Aún no hay reservaciones registradas.</p>
      ) : (
        <ul className="space-y-3">
          {reservations.map((reservation) => (
            <li
              key={reservation.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{reservation.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[reservation.status]}`}
                  >
                    {STATUS_LABELS[reservation.status]}
                  </span>
                  <span className="text-sm text-slate-400">
                    {formatDate(reservation.reserved_at)} · {formatTime(reservation.reserved_time)}
                  </span>
                  <span className="text-sm text-slate-400">
                    {reservation.guests} {reservation.guests === 1 ? 'comensal' : 'comensales'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {reservation.status === 'confirmada' && (
                    <button
                      type="button"
                      disabled={updatingId === reservation.id}
                      onClick={() => updateStatus(reservation, 'cancelada')}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                  {reservation.status === 'confirmada' && (
                    <button
                      type="button"
                      disabled={updatingId === reservation.id}
                      onClick={() => updateStatus(reservation, 'completada')}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                    >
                      Completar
                    </button>
                  )}
                </div>
              </div>
              {reservation.phone && (
                <p className="mt-2 text-sm text-slate-400">Teléfono: {reservation.phone}</p>
              )}
              {reservation.notes && (
                <p className="mt-1 text-sm text-slate-400">Notas: {reservation.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
