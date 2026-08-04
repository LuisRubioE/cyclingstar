import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel, SectionBar } from '../components/Panel'
import {
  type Effort,
  type Mentality,
  type StageOrder,
  type StageRole,
  fetchRaceOrders,
  saveRaceOrders,
} from '../api/raceOrders'
import { fetchMyUpcomingRaces } from '../api/rider'

const ROLES: { value: StageRole; label: string }[] = [
  { value: 'libre', label: 'Free' },
  { value: 'lider', label: 'Leader' },
  { value: 'sprinter', label: 'Sprinter' },
  { value: 'lanzador', label: 'Lead-out' },
  { value: 'gregario', label: 'Domestique' },
  { value: 'cazaetapas', label: 'Stage hunter' },
  { value: 'marcador', label: 'Marker' },
]
const MENTALITIES: { value: Mentality; label: string }[] = [
  { value: 'reservon', label: 'Conservative' },
  { value: 'oportunista', label: 'Opportunist' },
  { value: 'combativo', label: 'Aggressive' },
  { value: 'supercombativo', label: 'Super-aggressive' },
]
const EFFORTS: { value: Effort; label: string }[] = [
  { value: 'ahorrar', label: 'Save' },
  { value: 'normal', label: 'Normal' },
  { value: 'a_tope', label: 'All-in' },
]
const NEEDS_TARGET: StageRole[] = ['lanzador', 'gregario', 'marcador']

const ROLE_DESC: Record<StageRole, string> = {
  libre: 'Rides on instinct with no special job — a free role.',
  lider: 'Your protected leader: teammates shelter and pace them, saving them for the finish.',
  sprinter: 'Sits in for the finish and contests a bunch sprint.',
  lanzador: 'Lead-out: delivers a teammate to the sprint at top speed, then swings off.',
  gregario: 'Domestique: works for a teammate — shelters them, sets the pace, fetches bottles.',
  cazaetapas: 'Stage hunter: gets in the breakaway to fight for the stage win.',
  marcador: "Marker: shadows a RIVAL and follows their attacks so they can't get away.",
}
const MENTALITY_DESC: Record<Mentality, string> = {
  reservon: 'Conservative — saves energy and only reacts.',
  oportunista: 'Opportunist — takes a good chance when it appears.',
  combativo: 'Aggressive — attacks and forces the race.',
  supercombativo: 'Super-aggressive — attacks early and often (burns through energy).',
}
const EFFORT_DESC: Record<Effort, string> = {
  ahorrar: 'Save — ride within yourself to keep energy for later.',
  normal: 'Normal — a balanced effort for the day.',
  a_tope: 'All-in — empty the tank today.',
}
/** El objetivo de una orden: un COMPAÑERO (lanzar/trabajar) o un RIVAL (marcar), según el rol. */
function targetLabel(role: StageRole): string {
  if (role === 'marcador') return 'Rival to mark'
  if (role === 'lanzador') return 'Teammate to lead out'
  return 'Teammate to work for'
}

function defaultOrder(stageDay: number): StageOrder {
  return {
    stageDay,
    role: 'libre',
    targetRiderId: null,
    mentality: 'reservon',
    effort: 'normal',
    triggerKm: null,
    contestSprints: false,
    contestClimbs: false,
  }
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none'

/** Consola de órdenes de etapa: el piloto automático para tus próximas carreras inscritas (Paso 29). */
export function RaceOrders() {
  const queryClient = useQueryClient()
  const upcoming = useQuery({ queryKey: ['rider', 'upcoming'], queryFn: fetchMyUpcomingRaces })
  const [searchParams] = useSearchParams()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // Por defecto: la carrera del enlace (?race=), si no la más próxima que aún no ha empezado.
  useEffect(() => {
    if (selectedKey || !upcoming.data || upcoming.data.length === 0) return
    const requested = searchParams.get('race')
    const fromLink = requested ? upcoming.data.find((r) => r.raceKey === requested) : undefined
    const next = fromLink ?? upcoming.data.find((r) => !r.ongoing) ?? upcoming.data[0]!
    setSelectedKey(next.raceKey)
  }, [upcoming.data, selectedKey, searchParams])

  const { data, isPending, isError } = useQuery({
    queryKey: ['race-orders', selectedKey],
    queryFn: () => fetchRaceOrders(selectedKey!),
    enabled: !!selectedKey,
  })
  const [orders, setOrders] = useState<Record<number, StageOrder>>({})

  useEffect(() => {
    if (!data) return
    const map: Record<number, StageOrder> = {}
    for (const stage of data.stages) {
      map[stage.day] = data.orders.find((o) => o.stageDay === stage.day) ?? defaultOrder(stage.day)
    }
    setOrders(map)
  }, [data])

  const mutation = useMutation({
    mutationFn: () => saveRaceOrders(selectedKey!, Object.values(orders)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['race-orders', selectedKey] }),
  })

  const update = (day: number, patch: Partial<StageOrder>): void =>
    setOrders((prev) => ({ ...prev, [day]: { ...prev[day]!, ...patch } }))

  if (upcoming.isPending) return <p className="text-slate-500">Loading…</p>
  if (!upcoming.data || upcoming.data.length === 0) {
    return (
      <section className="space-y-4">
        <SectionBar>Race orders</SectionBar>
        <p className="text-sm text-slate-500">
          You have no upcoming races yet. Once your team enters you in a race (or you enter one as a
          free agent), it will appear here about two weeks before the start so you can set your
          autopilot.
        </p>
      </section>
    )
  }

  const teammates = data?.teammates ?? []
  const rivals = data?.rivals ?? []

  return (
    <section className="space-y-4">
      <SectionBar
        action={
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !selectedKey}
            className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/30 disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save all'}
          </button>
        }
      >
        Race orders
      </SectionBar>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Race
        <select
          className={`${selectClass} max-w-sm`}
          value={selectedKey ?? ''}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          {upcoming.data.map((r) => (
            <option key={r.raceKey} value={r.raceKey}>
              {r.raceName}
              {r.ongoing ? ' (racing now)' : r.daysUntil > 0 ? ` (in ${r.daysUntil}d)` : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-slate-500">Set your autopilot for each stage, then save once.</p>
      {isPending && <p className="text-sm text-slate-500">Loading the race…</p>}
      {isError && <p className="text-sm text-red-600">Could not load the race.</p>}
      {mutation.isSuccess && <p className="text-sm text-emerald-600">Orders saved.</p>}
      {mutation.isError && <p className="text-sm text-red-600">Could not save your orders.</p>}

      <div className="space-y-4">
        {(data?.stages ?? []).map((stage) => {
          const order = orders[stage.day] ?? defaultOrder(stage.day)
          return (
            <Panel
              key={stage.day}
              title={stage.name}
              action={<span className="text-xs text-white/90">{stage.km} km</span>}
            >
              <div
                className="mb-3 w-full overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: stage.altimetry }}
              />

              {stage.timeTrial ? (
                <p className="text-sm text-slate-500">
                  Individual time trial — a solo effort against the clock.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Role
                    <select
                      className={selectClass}
                      value={order.role}
                      onChange={(e) => update(stage.day, { role: e.target.value as StageRole })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">{ROLE_DESC[order.role]}</span>
                  </label>

                  {NEEDS_TARGET.includes(order.role) && (
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                      {targetLabel(order.role)}
                      <select
                        className={selectClass}
                        value={order.targetRiderId ?? ''}
                        onChange={(e) =>
                          update(stage.day, { targetRiderId: e.target.value || null })
                        }
                      >
                        <option value="">— none yet —</option>
                        {(order.role === 'marcador' ? rivals : teammates).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Mentality
                    <select
                      className={selectClass}
                      value={order.mentality}
                      onChange={(e) =>
                        update(stage.day, { mentality: e.target.value as Mentality })
                      }
                    >
                      {MENTALITIES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">
                      {MENTALITY_DESC[order.mentality]}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Effort
                    <select
                      className={selectClass}
                      value={order.effort}
                      onChange={(e) => update(stage.day, { effort: e.target.value as Effort })}
                    >
                      {EFFORTS.map((ef) => (
                        <option key={ef.value} value={ef.value}>
                          {ef.label}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">{EFFORT_DESC[order.effort]}</span>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Attack at km (optional)
                    <input
                      type="number"
                      min={0}
                      max={stage.km}
                      className={selectClass}
                      value={order.triggerKm ?? ''}
                      onChange={(e) =>
                        update(stage.day, {
                          triggerKm: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                    <span className="font-normal text-slate-400">
                      Launch a move at this distance. Leave blank to let your mentality decide when.
                    </span>
                  </label>

                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={order.contestSprints}
                        onChange={(e) => update(stage.day, { contestSprints: e.target.checked })}
                      />
                      Contest sprints
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={order.contestClimbs}
                        onChange={(e) => update(stage.day, { contestClimbs: e.target.checked })}
                      />
                      Contest KOMs
                    </label>
                    <span className="text-xs text-slate-400">
                      Go for the intermediate-sprint or climb points on the way (costs energy).
                    </span>
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </section>
  )
}
