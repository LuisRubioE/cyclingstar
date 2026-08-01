import {
  type Intensity,
  INTENSITIES,
  INTENSITY_LABELS,
  SESSIONS,
  SESSION_CATALOG,
  type Session,
  defaultCoachPlan,
  seasonPosition,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchOrders, saveOrders } from '../api/training'

const HORIZON = 7

interface DayPlan {
  gameDay: number
  session: Session
  intensity: Intensity
}

export function Training() {
  const query = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const [plan, setPlan] = useState<DayPlan[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.data) return
    const { currentDay, orders } = query.data
    const byDay = new Map(orders.map((order) => [order.gameDay, order]))
    const next: DayPlan[] = []
    for (let i = 1; i <= HORIZON; i++) {
      const gameDay = currentDay + i
      const existing = byDay.get(gameDay)
      const fallback = defaultCoachPlan(gameDay)
      next.push({
        gameDay,
        session: existing?.session ?? fallback.session,
        intensity: existing?.intensity ?? fallback.intensity,
      })
    }
    setPlan(next)
  }, [query.data])

  function update(gameDay: number, patch: Partial<DayPlan>) {
    setSaved(false)
    setPlan((current) =>
      current.map((day) => (day.gameDay === gameDay ? { ...day, ...patch } : day)),
    )
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      await saveOrders(plan)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (query.isPending) return <p className="text-slate-500">Loading…</p>
  if (query.isError) return <p className="text-red-600">Could not load your training plan.</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Training plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Leave your orders for the week. Without orders, your coach picks a reasonable plan.
        </p>
      </div>

      <div className="space-y-2">
        {plan.map((day) => {
          const info = SESSION_CATALOG[day.session]
          const position = seasonPosition(day.gameDay)
          return (
            <div
              key={day.gameDay}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
            >
              <span className="w-24 shrink-0 text-sm font-medium text-slate-500">
                Day {position.dayOfSeason}
              </span>
              <select
                value={day.session}
                onChange={(event) =>
                  update(day.gameDay, { session: event.target.value as Session })
                }
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                {SESSIONS.map((session) => (
                  <option key={session} value={session}>
                    {SESSION_CATALOG[session].label}
                  </option>
                ))}
              </select>
              <select
                value={day.intensity}
                disabled={!info.variableIntensity}
                onChange={(event) =>
                  update(day.gameDay, { intensity: event.target.value as Intensity })
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {INTENSITIES.map((intensity) => (
                  <option key={intensity} value={intensity}>
                    {INTENSITY_LABELS[intensity]}
                  </option>
                ))}
              </select>
              <span className="w-16 shrink-0 text-right text-xs text-slate-400">
                {info.tss[day.intensity]} TSS
              </span>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </section>
  )
}
