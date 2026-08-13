import {
  type Intensity,
  INTENSITIES,
  INTENSITY_LABELS,
  SESSIONS,
  SESSION_CATALOG,
  type Session,
  ATTRIBUTE_LABELS,
  attributesTrainedBy,
  seasonPosition,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchOrders, fetchTeamTraining, saveOrders, saveTeamTraining } from '../api/training'
import { Panel, SectionBar } from '../components/Panel'
import {
  type DayEdit,
  type DayPlan,
  adoptTeamSuggestions,
  applyEdits,
  buildServerPlan,
  withEdit,
} from '../domain/trainingPlan'

const HORIZON = 7

// "Travel" no se elige a mano: lo marca el sistema de viajes automáticamente los días de
// desplazamiento a una carrera lejana (y el día de competición tampoco se entrena).
const SELECTABLE_SESSIONS = SESSIONS.filter((s) => s !== 'viaje')

/** Human-readable summary of what a session trains and how hard it is (#7). */
function sessionEffect(session: Session, intensity: Intensity): string {
  const info = SESSION_CATALOG[session]
  const attrs = attributesTrainedBy(session)
  if (attrs.length === 0) {
    return session === 'video_tactica'
      ? 'Builds race intelligence with no physical load.'
      : `Recovery — sheds fatigue (${info.tss[intensity]} TSS).`
  }
  const trains = attrs.map((a) => ATTRIBUTE_LABELS[a]).join(', ')
  const group = info.group ? ' · Group session: +gains when teammates train it the same day' : ''
  return `Trains ${trains} · ${info.tss[intensity]} TSS${group}`
}

export function Training() {
  const query = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const team = useQuery({ queryKey: ['team-training'], queryFn: fetchTeamTraining })
  // Ediciones sin guardar, por día de juego. Viven APARTE de los datos del servidor: un refetch en
  // segundo plano actualiza la base pero jamás pisa lo que el jugador ha tocado.
  const [edits, setEdits] = useState<Record<number, DayEdit>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamMsg, setTeamMsg] = useState<string | null>(null)

  const raceDays = new Set(query.data?.raceDays ?? [])
  const travelByDay = new Map((query.data?.travelDays ?? []).map((t) => [t.gameDay, t]))
  const teamByDay = new Map((team.data?.plan ?? []).map((o) => [o.gameDay, o]))

  // El plan del servidor es un valor DERIVADO, no estado copiado con un efecto.
  const serverPlan = useMemo(
    () => (query.data ? buildServerPlan(query.data, HORIZON) : []),
    [query.data],
  )
  const plan: DayPlan[] = applyEdits(serverPlan, edits)

  function adoptTeamPlan() {
    setSaved(false)
    setEdits((current) => adoptTeamSuggestions(serverPlan, current, teamByDay))
  }

  async function publishTeamPlan() {
    setTeamMsg(null)
    try {
      await saveTeamTraining(plan)
      setTeamMsg('Published to your squad.')
      await team.refetch()
    } catch (err) {
      setTeamMsg(err instanceof Error ? err.message : 'Could not publish.')
    }
  }

  function update(gameDay: number, patch: DayEdit) {
    setSaved(false)
    setEdits((current) => withEdit(current, gameDay, patch))
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      await saveOrders(plan)
      setSaved(true)
      // Refresca la base con lo que acaba de quedar guardado (las ediciones ya coinciden con ella).
      await query.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (query.isPending) return <p className="text-slate-500">Loading…</p>
  if (query.isError) return <p className="text-red-600">Could not load your training plan.</p>

  const currentDay = query.data.currentDay
  const days = Array.from({ length: HORIZON }, (_, i) => currentDay + i + 1)
  const planByDay = new Map(plan.map((day) => [day.gameDay, day]))

  return (
    <section className="space-y-4">
      <SectionBar>Training plan</SectionBar>
      <p className="text-sm text-slate-500">
        Leave your orders for the week. Without orders, your coach picks a reasonable plan. On race
        days you rest and race — no training.
      </p>

      {team.data && (team.data.plan.length > 0 || team.data.canEdit) && (
        <Panel title="Team training plan">
          <p className="text-sm text-slate-600">
            {team.data.canEdit
              ? 'Publish a suggested session per day for your squad. Riders who train the same session on the same day get a group bonus, so a shared plan makes everyone improve faster.'
              : `${team.data.teamName ?? 'Your team'} suggests a session per day. Train it together with your teammates for a group bonus.`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {team.data.plan.length > 0 && (
              <button
                type="button"
                onClick={adoptTeamPlan}
                className="rounded-lg bg-brand-cyan/15 px-3 py-1.5 text-sm font-medium text-brand-navy transition hover:bg-brand-cyan/25"
              >
                Adopt team plan
              </button>
            )}
            {team.data.canEdit && (
              <button
                type="button"
                onClick={publishTeamPlan}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Publish my week as the team plan
              </button>
            )}
            {teamMsg && <span className="text-sm text-emerald-600">{teamMsg}</span>}
          </div>
        </Panel>
      )}

      <Panel title="Weekly plan">
        <div className="space-y-2">
          {days.map((gameDay) => {
            const position = seasonPosition(gameDay)
            if (raceDays.has(gameDay)) {
              return (
                <div
                  key={gameDay}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
                >
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-500">
                    Day {position.dayOfSeason}
                  </span>
                  <span className="text-sm font-semibold text-amber-700">🚴 Race day</span>
                  <span className="text-xs text-amber-600">No training — you're racing.</span>
                </div>
              )
            }
            // Día de VIAJE DE IDA: el plan lo enseña por adelantado, con destino. No se entrena.
            const trip = travelByDay.get(gameDay)
            if (trip) {
              return (
                <div
                  key={gameDay}
                  className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3"
                >
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-500">
                    Day {position.dayOfSeason}
                  </span>
                  <span className="text-sm font-semibold text-sky-700">✈️ Travel day</span>
                  <span className="text-xs text-sky-600">
                    On your way to {trip.raceName}
                    {trip.country ? ` (${trip.country.toUpperCase()})` : ''} — no training.
                  </span>
                </div>
              )
            }
            const day = planByDay.get(gameDay)
            if (!day) return null
            const info = SESSION_CATALOG[day.session]
            return (
              <div
                key={gameDay}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-500">
                    Day {position.dayOfSeason}
                  </span>
                  <select
                    id={`session-${gameDay}`}
                    aria-label={`Session for day ${position.dayOfSeason}`}
                    value={day.session}
                    onChange={(event) =>
                      update(day.gameDay, { session: event.target.value as Session })
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    {SELECTABLE_SESSIONS.map((session) => (
                      <option key={session} value={session}>
                        {SESSION_CATALOG[session].label}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`intensity-${gameDay}`}
                    aria-label={`Intensity for day ${position.dayOfSeason}`}
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
                <p className="pl-24 text-xs text-slate-500">
                  {sessionEffect(day.session, day.intensity)}
                </p>
                {(() => {
                  const suggestion = teamByDay.get(gameDay)
                  if (!suggestion || suggestion.session === day.session) return null
                  return (
                    <p className="pl-24 text-xs text-brand-navy">
                      Team session: {SESSION_CATALOG[suggestion.session].label}{' '}
                      <button
                        type="button"
                        onClick={() =>
                          update(gameDay, {
                            session: suggestion.session,
                            intensity: suggestion.intensity,
                          })
                        }
                        className="font-medium underline hover:text-brand-cyan"
                      >
                        train together
                      </button>
                    </p>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </Panel>

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
