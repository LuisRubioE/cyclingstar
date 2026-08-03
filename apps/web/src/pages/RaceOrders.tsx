import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Panel, SectionBar } from '../components/Panel'
import {
  type Effort,
  type Mentality,
  type StageOrder,
  type StageRole,
  fetchTestTour,
  saveStageOrders,
} from '../api/raceOrders'

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

/** Consola de órdenes de etapa: las cinco capas para las 5 etapas, en una sola visita (Paso 29). */
export function RaceOrders() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race', 'test-tour'],
    queryFn: fetchTestTour,
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
    mutationFn: () => saveStageOrders(Object.values(orders)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['race', 'test-tour'] }),
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the race.</p>

  const update = (day: number, patch: Partial<StageOrder>): void =>
    setOrders((prev) => ({ ...prev, [day]: { ...prev[day]!, ...patch } }))

  const rivals = data.roster // por ahora solo tu corredor; los NPC llegan con la génesis del mundo

  return (
    <section className="space-y-4">
      <SectionBar
        action={
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/30 disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save all'}
          </button>
        }
      >
        Race orders · Test tour
      </SectionBar>
      <p className="text-sm text-slate-500">
        Set your autopilot for all five stages, then save once.
      </p>
      {mutation.isSuccess && <p className="text-sm text-emerald-600">Orders saved.</p>}
      {mutation.isError && <p className="text-sm text-red-600">Could not save your orders.</p>}

      <div className="space-y-4">
        {data.stages.map((stage) => {
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
                  </label>

                  {NEEDS_TARGET.includes(order.role) && (
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                      Target
                      <select
                        className={selectClass}
                        value={order.targetRiderId ?? ''}
                        onChange={(e) =>
                          update(stage.day, { targetRiderId: e.target.value || null })
                        }
                      >
                        <option value="">— none yet —</option>
                        {rivals.map((r) => (
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
                  </label>

                  <div className="flex items-end gap-4 text-sm text-slate-600">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={order.contestSprints}
                        onChange={(e) => update(stage.day, { contestSprints: e.target.checked })}
                      />
                      Sprints
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={order.contestClimbs}
                        onChange={(e) => update(stage.day, { contestClimbs: e.target.checked })}
                      />
                      KOMs
                    </label>
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
