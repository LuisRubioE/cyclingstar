import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
import { orderAdvice } from '../domain/raceOrdersAdvice'
import {
  EFFORT_DESC,
  EFFORT_LABEL,
  EFFORT_OPTIONS,
  MENTALITY_DESC,
  MENTALITY_LABEL,
  MENTALITY_OPTIONS,
  STAGE_ROLE_DESC,
  STAGE_ROLE_LABEL,
  STAGE_ROLE_OPTIONS,
  STAGE_KIND_LABEL,
  CHASE_POLICY_DESC,
  CHASE_POLICY_LABEL,
  CHASE_POLICY_OPTIONS,
  type ChasePolicyUi,
  CLIMB_PART_LABEL,
  CLIMB_WHICH_LABEL,
  DAY_GOAL_DESC,
  DAY_GOAL_LABEL,
  DAY_GOAL_OPTIONS,
  type DayGoalUi,
  TRIGGER_KIND_LABEL,
  TRIGGER_KIND_OPTIONS,
  type TriggerKindUi,
  WEATHER_COND_LABEL,
} from '../domain/labels'
import {
  type OrdersDraft,
  buildServerOrders,
  defaultOrder,
  resolveOrders,
  withOrderPatch,
} from '../domain/raceOrdersDraft'

const NEEDS_TARGET: StageRole[] = ['lanzador', 'gregario', 'marcador']

/**
 * LA CITA DEJA DE SER SOLO UN KILÓMETRO (paso 17a, R22 · S-214/S-321/S-322).
 *
 * Seis formas de decir «cuándo», y **cinco dependen de lo que pase en la carretera** — que es toda
 * la diferencia entre una cita y un despertador. El kilómetro se queda porque a veces es lo que el
 * jugador quiere decir, y porque las hojas guardadas antes de este paso lo usan.
 *
 * Cuando la forma elegida es el kilómetro se escriben LAS DOS COSAS, `triggerOn` y el `triggerKm` de
 * siempre. No es duplicar por gusto: el motor lee hoy `triggerKm` y seguirá leyéndolo hasta el paso
 * 17b, así que si solo se escribiera la forma nueva la palanca dejaría de funcionar durante un paso
 * entero — que es exactamente el defecto de la v58 que este paso existe para no repetir.
 */
function Trigger({
  stageDay,
  stageKm,
  order,
  onChange,
  selectClass,
}: {
  stageDay: number
  stageKm: number
  order: StageOrder
  onChange: (patch: Partial<StageOrder>) => void
  selectClass: string
}) {
  const t =
    order.triggerOn ?? (order.triggerKm != null ? { at: 'km' as const, km: order.triggerKm } : null)
  const kind: TriggerKindUi =
    t?.at === 'attack' ? 'ninguno' : ((t?.at as TriggerKindUi) ?? 'ninguno')
  const id = `trigger-${stageDay}`

  const setKind = (k: TriggerKindUi) => {
    if (k === 'ninguno') return onChange({ triggerOn: null, triggerKm: null })
    if (k === 'km') return onChange({ triggerOn: { at: 'km', km: 0 }, triggerKm: 0 })
    if (k === 'climb')
      return onChange({ triggerOn: { at: 'climb', which: 'last', part: 'pie' }, triggerKm: null })
    if (k === 'gap') return onChange({ triggerOn: { at: 'gap', overS: 120 }, triggerKm: null })
    if (k === 'weather')
      return onChange({ triggerOn: { at: 'weather', cond: 'lluvia' }, triggerKm: null })
    return onChange({ triggerOn: { at: 'sector', index: 1 }, triggerKm: null })
  }

  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      <label htmlFor={id} className="flex flex-col gap-1">
        When I go
        <select
          id={id}
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as TriggerKindUi)}
        >
          {TRIGGER_KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {TRIGGER_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>

      {t?.at === 'km' ? (
        <input
          aria-label="Kilometre"
          type="number"
          min={0}
          max={stageKm}
          className={selectClass}
          value={t.km}
          onChange={(e) => {
            const km = e.target.value === '' ? 0 : Number(e.target.value)
            onChange({ triggerOn: { at: 'km', km }, triggerKm: km })
          }}
        />
      ) : null}

      {t?.at === 'climb' ? (
        <div className="flex gap-1">
          <select
            aria-label="Which climb"
            className={selectClass}
            value={t.which}
            onChange={(e) =>
              onChange({
                triggerOn: {
                  at: 'climb',
                  which: e.target.value as 'last' | 'penultimate',
                  part: t.part,
                },
              })
            }
          >
            {(['last', 'penultimate'] as const).map((w) => (
              <option key={w} value={w}>
                {CLIMB_WHICH_LABEL[w]}
              </option>
            ))}
          </select>
          <select
            aria-label="Where on the climb"
            className={selectClass}
            value={t.part}
            onChange={(e) =>
              onChange({
                triggerOn: {
                  at: 'climb',
                  which: t.which,
                  part: e.target.value as 'pie' | 'duro' | 'cima',
                },
              })
            }
          >
            {(['pie', 'duro', 'cima'] as const).map((pp) => (
              <option key={pp} value={pp}>
                {CLIMB_PART_LABEL[pp]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {t?.at === 'gap' ? (
        <input
          aria-label="Gap in seconds"
          type="number"
          min={0}
          step={15}
          className={selectClass}
          value={t.overS}
          onChange={(e) =>
            onChange({ triggerOn: { at: 'gap', overS: Number(e.target.value || 0) } })
          }
        />
      ) : null}

      {t?.at === 'weather' ? (
        <select
          aria-label="Weather"
          className={selectClass}
          value={t.cond}
          onChange={(e) =>
            onChange({ triggerOn: { at: 'weather', cond: e.target.value as 'lluvia' | 'viento' } })
          }
        >
          {(['lluvia', 'viento'] as const).map((c) => (
            <option key={c} value={c}>
              {WEATHER_COND_LABEL[c]}
            </option>
          ))}
        </select>
      ) : null}

      {t?.at === 'sector' ? (
        <input
          aria-label="Sector number"
          type="number"
          min={1}
          className={selectClass}
          value={t.index}
          onChange={(e) =>
            onChange({ triggerOn: { at: 'sector', index: Number(e.target.value || 1) } })
          }
        />
      ) : null}

      <span className="font-normal text-slate-400">
        {kind === 'ninguno'
          ? 'No appointment. Your mentality picks the moment.'
          : 'A move launched here, if the legs are there when it comes.'}
      </span>
    </div>
  )
}

/**
 * EL PARTE DEL DÍA, en la pantalla donde se decide (v44). Que el clima exista en el motor no sirve
 * de nada si el jugador no lo ve antes de repartir los roles: eso es la diferencia entre una
 * mecánica y un modificador.
 *
 * SE PINTA CON SU FIABILIDAD Y NO SIN ELLA, y además se ATENÚA cuando es baja. Un parte a siete días
 * es casi «lo normal aquí en esta época»; presentarlo con la misma tinta que el de mañana sería
 * enseñar una conjetura como si fuera un dato.
 */
function Forecast({ f }: { f: { lluvia: number; grados: number; fiabilidad: number } }) {
  const seguro = f.fiabilidad >= 60
  return (
    <span
      className={seguro ? 'text-white/90' : 'text-white/60'}
      title={`${f.fiabilidad}% confidence — a forecast this far out is closer to the local average than to the sky`}
    >
      {f.lluvia >= 50 ? '🌧' : f.lluvia >= 20 ? '🌦' : '☀'} {f.lluvia}% · {f.grados}°C
      {seguro ? '' : ' (outlook)'}
    </span>
  )
}

/** El objetivo de una orden: un COMPAÑERO (lanzar/trabajar) o un RIVAL (marcar), según el rol. */
function targetLabel(role: StageRole): string {
  if (role === 'marcador') return 'Rival to mark'
  if (role === 'lanzador') return 'Teammate to lead out'
  return 'Teammate to work for'
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
  // Borrador de ediciones sin guardar, SIEMPRE atado a su carrera: ni un refetch en segundo plano
  // las pisa (antes un `useEffect` copiaba `data` al estado y las borraba) ni se pueden guardar
  // contra otra carrera si el jugador cambia de selección antes de pulsar "Save all".
  const [draft, setDraft] = useState<OrdersDraft | null>(null)

  const serverOrders = useMemo(
    () => (data ? buildServerOrders(data.stages, data.orders) : {}),
    [data],
  )
  const orders = resolveOrders(serverOrders, draft, selectedKey)

  const mutation = useMutation({
    mutationFn: ({ raceKey, orders: toSave }: { raceKey: string; orders: StageOrder[] }) =>
      saveRaceOrders(raceKey, toSave),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: ['race-orders', variables.raceKey] }),
  })

  const update = (day: number, patch: Partial<StageOrder>): void => {
    if (!selectedKey) return
    setDraft((prev) => withOrderPatch(prev, selectedKey, serverOrders, day, patch))
  }

  /**
   * COPIAR UNA ORDEN A LAS DEMÁS ETAPAS (v58). Rellenar veintiuna etapas a mano era el motivo real
   * por el que casi nadie las tocaba, y una orden que no se toca es una orden que no se nota.
   *
   * Dos alcances, que son los dos que se usan de verdad: a las etapas del MISMO TIPO —el plan del
   * velocista para las llanas, el del escalador para las reinas— y a todo lo que queda de carrera.
   * La crono nunca recibe copia: allí no hay táctica de grupo que copiar.
   *
   * El objetivo (`targetRiderId`) viaja con la orden: si trabajas para tu jefe, trabajas para él
   * todos los días, y si marcabas a un rival, lo sigues marcando.
   */
  const copiarA = (desdeDia: number, alcance: 'iguales' | 'siguientes'): void => {
    if (!selectedKey || !data) return
    const origen = orders[desdeDia]
    const etapaOrigen = data.stages.find((st) => st.day === desdeDia)
    if (!origen || !etapaOrigen) return
    for (const st of data.stages) {
      if (st.day === desdeDia || st.timeTrial) continue
      if (alcance === 'iguales' && st.kind !== etapaOrigen.kind) continue
      if (alcance === 'siguientes' && st.day < desdeDia) continue
      update(st.day, {
        role: origen.role,
        mentality: origen.mentality,
        effort: origen.effort,
        triggerKm: origen.triggerKm,
        targetRiderId: origen.targetRiderId,
        contestSprints: origen.contestSprints,
        contestClimbs: origen.contestClimbs,
      })
    }
  }

  // Solo se guarda lo que se está viendo: la carrera seleccionada Y ya cargada.
  const canSave = !!selectedKey && !!data && !mutation.isPending
  const saveAll = (): void => {
    if (!selectedKey || !data) return
    mutation.mutate({ raceKey: selectedKey, orders: Object.values(orders) })
  }

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
  const teams = data?.teams ?? []
  const rivals = data?.rivals ?? []

  return (
    <section className="space-y-4">
      <SectionBar
        action={
          <button
            onClick={saveAll}
            disabled={!canSave}
            className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/30 disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save all'}
          </button>
        }
      >
        Race orders
      </SectionBar>
      <label
        htmlFor="race-picker"
        className="flex flex-col gap-1 text-xs font-medium text-slate-500"
      >
        Race
        <select
          id="race-picker"
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
      {/* EL RESUMEN, ARRIBA. Con veintiuna etapas, lo que el jugador necesita saber al entrar es si
          se ha dejado algo sin decidir y si hay algo que chirría, no ir panel por panel. */}
      {data && data.stages.length > 1 && (
        <p className="text-sm text-slate-500">
          {(() => {
            const enLinea = data.stages.filter((st) => !st.timeTrial)
            const conChoque = enLinea.filter((st) =>
              orderAdvice(orders[st.day] ?? defaultOrder(st.day), st).some(
                (a) => a.level === 'warn',
              ),
            ).length
            return conChoque === 0
              ? `${enLinea.length} road stages, no clashing orders.`
              : `${enLinea.length} road stages · ${conChoque} with orders that clash — look for the ⚠ below.`
          })()}
        </p>
      )}

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
              action={
                <span className="flex items-center gap-2 text-xs text-white/90">
                  {/* DE QUÉ VA EL DÍA, antes que ningún otro dato: la orden que tiene sentido en una
                      llana es un disparate en una reina, y el perfil dibujado no siempre se lee de
                      un vistazo en el móvil. */}
                  <span className="rounded bg-white/15 px-1.5 py-0.5 font-medium">
                    {STAGE_KIND_LABEL[stage.kind] ?? stage.kind}
                  </span>
                  <span>{stage.km} km</span>
                  {stage.forecast != null && (
                    <>
                      <span aria-hidden className="text-white/40">
                        ·
                      </span>
                      <Forecast f={stage.forecast} />
                    </>
                  )}
                </span>
              }
            >
              {/* SVG generado por nuestro motor; se anuncia como imagen con su descripción. */}
              <div
                className="mb-3 w-full overflow-x-auto"
                role="img"
                aria-label={`Elevation profile of ${stage.name}, ${stage.km} km`}
                dangerouslySetInnerHTML={{ __html: stage.altimetry }}
              />

              {stage.timeTrial ? (
                <p className="text-sm text-slate-500">
                  Individual time trial — a solo effort against the clock.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label
                    htmlFor={`role-${stage.day}`}
                    className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                  >
                    Role
                    <select
                      id={`role-${stage.day}`}
                      className={selectClass}
                      value={order.role}
                      onChange={(e) => update(stage.day, { role: e.target.value as StageRole })}
                    >
                      {STAGE_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {STAGE_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">
                      {STAGE_ROLE_DESC[order.role]}
                    </span>
                  </label>

                  {NEEDS_TARGET.includes(order.role) && (
                    <label
                      htmlFor={`target-${stage.day}`}
                      className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                    >
                      {targetLabel(order.role)}
                      <select
                        id={`target-${stage.day}`}
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

                  <label
                    htmlFor={`mentality-${stage.day}`}
                    className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                  >
                    Mentality
                    <select
                      id={`mentality-${stage.day}`}
                      className={selectClass}
                      value={order.mentality}
                      onChange={(e) =>
                        update(stage.day, { mentality: e.target.value as Mentality })
                      }
                    >
                      {MENTALITY_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {MENTALITY_LABEL[m]}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">
                      {MENTALITY_DESC[order.mentality]}
                    </span>
                  </label>

                  <label
                    htmlFor={`effort-${stage.day}`}
                    className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                  >
                    Effort
                    <select
                      id={`effort-${stage.day}`}
                      className={selectClass}
                      value={order.effort}
                      onChange={(e) => update(stage.day, { effort: e.target.value as Effort })}
                    >
                      {EFFORT_OPTIONS.map((ef) => (
                        <option key={ef} value={ef}>
                          {EFFORT_LABEL[ef]}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">{EFFORT_DESC[order.effort]}</span>
                  </label>

                  <Trigger
                    stageDay={stage.day}
                    stageKm={stage.km}
                    order={order}
                    onChange={(patch) => update(stage.day, patch)}
                    selectClass={selectClass}
                  />

                  <label
                    htmlFor={`day-goal-${stage.day}`}
                    className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                  >
                    What I ride for
                    <select
                      id={`day-goal-${stage.day}`}
                      className={selectClass}
                      value={order.dayGoal ?? ''}
                      onChange={(e) =>
                        update(stage.day, {
                          dayGoal: e.target.value === '' ? null : (e.target.value as DayGoalUi),
                        })
                      }
                    >
                      <option value="">No preference — the team decides</option>
                      {DAY_GOAL_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {DAY_GOAL_LABEL[g]}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">
                      {order.dayGoal
                        ? DAY_GOAL_DESC[order.dayGoal as DayGoalUi]
                        : 'Leave it blank and the day is planned for you.'}
                    </span>
                  </label>

                  <label
                    htmlFor={`chase-${stage.day}`}
                    className="flex flex-col gap-1 text-xs font-medium text-slate-500"
                  >
                    What we do with a breakaway
                    <select
                      id={`chase-${stage.day}`}
                      className={selectClass}
                      value={order.chasePolicy ?? ''}
                      onChange={(e) =>
                        update(stage.day, {
                          chasePolicy:
                            e.target.value === '' ? null : (e.target.value as ChasePolicyUi),
                        })
                      }
                    >
                      <option value="">No preference — read the race</option>
                      {CHASE_POLICY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {CHASE_POLICY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <span className="font-normal text-slate-400">
                      {order.chasePolicy
                        ? CHASE_POLICY_DESC[order.chasePolicy as ChasePolicyUi]
                        : 'Leave it blank and the team judges each move on its merits.'}
                    </span>
                  </label>

                  {teams.length > 0 ? (
                    <fieldset className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                      <legend className="mb-1">Teams I will not work with</legend>
                      <div className="flex max-h-28 flex-col gap-1 overflow-y-auto pr-1 text-sm font-normal text-slate-600">
                        {teams.map((t) => {
                          const vetados = order.refuseRelayTeams ?? []
                          const marcado = vetados.includes(t.id)
                          return (
                            <label key={t.id} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={(e) =>
                                  update(stage.day, {
                                    refuseRelayTeams: e.target.checked
                                      ? [...vetados, t.id]
                                      : vetados.filter((x) => x !== t.id),
                                  })
                                }
                              />
                              {t.name}
                            </label>
                          )
                        })}
                      </div>
                      <span className="font-normal text-slate-400">
                        You will not take a turn on the front while they are the ones benefiting.
                      </span>
                    </fieldset>
                  ) : null}

                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <label htmlFor={`sprints-${stage.day}`} className="flex items-center gap-1.5">
                      <input
                        id={`sprints-${stage.day}`}
                        type="checkbox"
                        checked={order.contestSprints}
                        onChange={(e) => update(stage.day, { contestSprints: e.target.checked })}
                      />
                      Chase points-jersey sprints
                    </label>
                    <label htmlFor={`climbs-${stage.day}`} className="flex items-center gap-1.5">
                      <input
                        id={`climbs-${stage.day}`}
                        type="checkbox"
                        checked={order.contestClimbs}
                        onChange={(e) => update(stage.day, { contestClimbs: e.target.checked })}
                      />
                      Chase mountain (KOM) points
                    </label>
                    <span className="text-xs text-slate-400">
                      Contest the intermediate-sprint or the King-of-the-Mountains points at the
                      banners along the route (green / polka-dot jerseys). Costs energy.
                    </span>
                  </div>
                </div>
              )}

              {/* LO QUE UN DIRECTOR TE DIRÍA AL LEER LA HOJA (v58). No prohíbe nada —puedes correr
                  una reina de sprinter si te empeñas— pero deja de ser un formulario mudo. */}
              {(() => {
                const avisos = orderAdvice(order, stage)
                if (avisos.length === 0) return null
                return (
                  <ul className="mt-3 space-y-1">
                    {avisos.map((a, i) => (
                      <li
                        key={i}
                        className={`flex gap-2 text-xs ${a.level === 'warn' ? 'text-amber-700' : 'text-slate-500'}`}
                      >
                        <span aria-hidden>{a.level === 'warn' ? '⚠' : 'ℹ'}</span>
                        <span>{a.text}</span>
                      </li>
                    ))}
                  </ul>
                )
              })()}

              {/* COPIAR A LAS DEMÁS, que es lo que ahorra la tarde: en una gran vuelta son
                  veintiuna etapas y hasta ahora había que rellenarlas una a una. */}
              {!stage.timeTrial && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => copiarA(stage.day, 'iguales')}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 transition hover:bg-slate-50"
                  >
                    Copy to every {(STAGE_KIND_LABEL[stage.kind] ?? stage.kind).toLowerCase()} stage
                  </button>
                  <button
                    type="button"
                    onClick={() => copiarA(stage.day, 'siguientes')}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 transition hover:bg-slate-50"
                  >
                    Copy to the rest of the race
                  </button>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </section>
  )
}
