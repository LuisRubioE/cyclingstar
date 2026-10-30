import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type RaceStage,
  type RosterRider,
  type StageOrder,
  type StageRole,
  fetchRaceOrders,
  saveRaceOrders,
} from '../api/raceOrders'
import { fetchMyUpcomingRaces } from '../api/rider'
import { OrdersGate } from '../components/OrdersGate'
import { ActionBar, type ActionBarStatus } from '../components/ui/ActionBar'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { Disclosure } from '../components/ui/Disclosure'
import { EmptyState } from '../components/ui/EmptyState'
import { Field } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { InfoButton } from '../components/ui/InfoButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { Segmented } from '../components/ui/Segmented'
import {
  CHASE_POLICY_DESC,
  CHASE_POLICY_LABEL,
  CHASE_POLICY_OPTIONS,
  CLIMB_PART_LABEL,
  CLIMB_WHICH_LABEL,
  type ChasePolicyUi,
  DAY_GOAL_DESC,
  DAY_GOAL_LABEL,
  DAY_GOAL_OPTIONS,
  type DayGoalUi,
  EFFORT_DESC,
  EFFORT_LABEL,
  EFFORT_OPTIONS,
  MENTALITY_DESC,
  MENTALITY_LABEL,
  MENTALITY_OPTIONS,
  STAGE_KIND_LABEL,
  STAGE_ROLE_DESC,
  STAGE_ROLE_LABEL,
  STAGE_ROLE_OPTIONS,
  TRIGGER_KIND_LABEL,
  TRIGGER_KIND_OPTIONS,
  type TriggerKindUi,
  WEATHER_COND_LABEL,
} from '../domain/labels'
import { orderAdvice } from '../domain/raceOrdersAdvice'
import {
  type OrdersDraft,
  buildServerOrders,
  changedStages,
  defaultOrder,
  defaultRaceKey,
  resolveOrders,
  withOrderPatch,
} from '../domain/raceOrdersDraft'
import {
  clashSummary,
  forecastText,
  isOutlook,
  ordersConsequence,
  orderStageTitle,
} from '../domain/raceOrdersText'
import { waitingStage } from '../domain/veil'
import { plural } from '../domain/words'
import { horizonKey, useHorizon, useHorizonRev, veilApplies } from '../queryClient'

/**
 * LA PANTALLA DE ÓRDENES CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21i). `PageHeader`; la
 * carrera, en un `Field` `select`; cada etapa en su `Panel`, con su título como toda etapa (§4.10), de qué va
 * el día en palabras y el parte sin emoji (`Rain`, `Showers`, `Dry`; 3-d); cada orden en su `Field`, con su
 * porqué debajo; los equipos con los que no se tira, en `Checkbox`, plegados; los esprints y la montaña, en
 * `Segmented`; lo que diría el director, con su icono; y guardar, en la barra de abajo (`ActionBar`, `Save
 * orders`), que dice qué cambia y sin cambios no se pinta. Lo que pesa cada orden no cambia: es de la línea
 * de táctica (H-08).
 */

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
 *
 * Con el sistema desde el 21i: cada control en su `Field`, con su rótulo a la vista, donde los de cada forma
 * solo tenían su `aria-label`.
 */
function Trigger({
  stageDay,
  stageKm,
  order,
  onChange,
}: {
  stageDay: number
  stageKm: number
  order: StageOrder
  onChange: (patch: Partial<StageOrder>) => void
}) {
  const t =
    order.triggerOn ?? (order.triggerKm != null ? { at: 'km' as const, km: order.triggerKm } : null)
  const kind: TriggerKindUi =
    t?.at === 'attack' ? 'ninguno' : ((t?.at as TriggerKindUi) ?? 'ninguno')

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
    <div className="grid content-start gap-3">
      <Field
        kind="select"
        id={`trigger-${stageDay}`}
        label="When I go"
        value={kind}
        onChange={(v) => {
          const k = TRIGGER_KIND_OPTIONS.find((x) => x === v)
          if (k !== undefined) setKind(k)
        }}
        options={TRIGGER_KIND_OPTIONS.map((k) => ({ value: k, label: TRIGGER_KIND_LABEL[k] }))}
        help={
          kind === 'ninguno'
            ? 'No appointment. Your mentality picks the moment.'
            : 'A move launched here, if the legs are there when it comes.'
        }
      />

      {t?.at === 'km' && (
        <Field
          kind="input"
          type="number"
          id={`trigger-km-${stageDay}`}
          label="Kilometre"
          min={0}
          max={stageKm}
          value={String(t.km)}
          onChange={(v) => {
            const km = v === '' ? 0 : Number(v)
            onChange({ triggerOn: { at: 'km', km }, triggerKm: km })
          }}
        />
      )}

      {t?.at === 'climb' && (
        <>
          <Field
            kind="select"
            id={`trigger-climb-${stageDay}`}
            label="Which climb"
            value={t.which}
            onChange={(v) => {
              const which = v === 'penultimate' ? 'penultimate' : 'last'
              onChange({ triggerOn: { at: 'climb', which, part: t.part } })
            }}
            options={(['last', 'penultimate'] as const).map((w) => ({
              value: w,
              label: CLIMB_WHICH_LABEL[w],
            }))}
          />
          <Field
            kind="select"
            id={`trigger-part-${stageDay}`}
            label="Where on the climb"
            value={t.part}
            onChange={(v) => {
              const part = (['pie', 'duro', 'cima'] as const).find((x) => x === v)
              if (part !== undefined) onChange({ triggerOn: { at: 'climb', which: t.which, part } })
            }}
            options={(['pie', 'duro', 'cima'] as const).map((pp) => ({
              value: pp,
              label: CLIMB_PART_LABEL[pp],
            }))}
          />
        </>
      )}

      {t?.at === 'gap' && (
        <Field
          kind="input"
          type="number"
          id={`trigger-gap-${stageDay}`}
          label="Gap in seconds"
          min={0}
          step={15}
          value={String(t.overS)}
          onChange={(v) => onChange({ triggerOn: { at: 'gap', overS: Number(v || 0) } })}
        />
      )}

      {t?.at === 'weather' && (
        <Field
          kind="select"
          id={`trigger-weather-${stageDay}`}
          label="Weather"
          value={t.cond}
          onChange={(v) =>
            onChange({ triggerOn: { at: 'weather', cond: v === 'viento' ? 'viento' : 'lluvia' } })
          }
          options={(['lluvia', 'viento'] as const).map((c) => ({
            value: c,
            label: WEATHER_COND_LABEL[c],
          }))}
        />
      )}

      {t?.at === 'sector' && (
        <Field
          kind="input"
          type="number"
          id={`trigger-sector-${stageDay}`}
          label="Sector number"
          min={1}
          value={String(t.index)}
          onChange={(v) => onChange({ triggerOn: { at: 'sector', index: Number(v || 1) } })}
        />
      )}
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
 *
 * Con el sistema desde el 21i: la palabra donde iba el emoji (`Rain 60% · 14°C`; 3-d), y la fiabilidad en su
 * `InfoButton`, donde iba en un `title` que el dedo no abre.
 */
function Forecast({ f }: { f: NonNullable<RaceStage['forecast']> }) {
  const outlook = isOutlook(f)
  return (
    <span className="inline-flex items-center">
      <span className={outlook ? 'text-ink-3' : 'text-ink-2'}>
        {forecastText(f)}
        {outlook && ' (outlook)'}
      </span>
      <InfoButton label="About the forecast">
        {`${f.fiabilidad}% confidence.`}
        {outlook && ' A forecast this far out is closer to the local average than to the sky.'}
      </InfoButton>
    </span>
  )
}

/** El objetivo de una orden: un COMPAÑERO (lanzar/trabajar) o un RIVAL (marcar), según el rol. */
function targetLabel(role: StageRole): string {
  if (role === 'marcador') return 'Rival to mark'
  if (role === 'lanzador') return 'Teammate to lead out'
  return 'Teammate to work for'
}

/** Sí o no a una pancarta del recorrido, en su `Segmented` con su rótulo a la vista (§4.3). */
function Contest({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="grid gap-1">
      <p className="text-meta font-semibold text-ink">{label}</p>
      <Segmented
        label={label}
        options={[
          { key: 'si', label: 'Chase them' },
          { key: 'no', label: 'Let them go' },
        ]}
        value={value ? 'si' : 'no'}
        onChange={(k) => onChange(k === 'si')}
      />
    </div>
  )
}

/** Las órdenes de una etapa, en su `Panel`. */
function StageOrders({
  stage,
  order,
  title,
  answer,
  canCopy,
  teammates,
  rivals,
  teams,
  onChange,
  onCopy,
}: {
  stage: RaceStage
  order: StageOrder
  title: string
  answer: boolean
  /** con más de una etapa: copiar a las demás */
  canCopy: boolean
  teammates: readonly RosterRider[]
  rivals: readonly RosterRider[]
  teams: readonly RosterRider[]
  onChange: (patch: Partial<StageOrder>) => void
  onCopy: (alcance: 'iguales' | 'siguientes') => void
}) {
  const kindWord = STAGE_KIND_LABEL[stage.kind] ?? stage.kind
  const vetados = order.refuseRelayTeams ?? []
  // LO QUE UN DIRECTOR TE DIRÍA AL LEER LA HOJA (v58). No prohíbe nada —puedes correr una reina de sprinter si
  // te empeñas— pero deja de ser un formulario mudo.
  const avisos = orderAdvice(order, stage)
  return (
    <Panel title={title} answer={answer}>
      <div className="grid gap-4">
        {/* DE QUÉ VA EL DÍA, antes que ningún otro dato: la orden que tiene sentido en una llana es un
            disparate en una reina, y el perfil dibujado no siempre se lee de un vistazo en el móvil. */}
        <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-2">
          <span className="font-semibold text-ink">{kindWord}</span>
          <span>· {stage.km} km</span>
          {stage.forecast != null && (
            <>
              <span>·</span>
              <Forecast f={stage.forecast} />
            </>
          )}
        </p>

        {/* SVG generado por nuestro motor; se anuncia como imagen con su descripción. */}
        <div
          className="w-full overflow-x-auto rounded-ui bg-surface-2 p-1"
          role="img"
          aria-label={`Elevation profile of ${stage.name}, ${stage.km} km`}
          dangerouslySetInnerHTML={{ __html: stage.altimetry }}
        />

        {stage.timeTrial ? (
          <p className="text-meta text-ink-2">
            Individual time trial — a solo effort against the clock.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              kind="select"
              id={`role-${stage.day}`}
              label="Role"
              value={order.role}
              onChange={(v) => {
                const role = STAGE_ROLE_OPTIONS.find((r) => r === v)
                if (role !== undefined) onChange({ role })
              }}
              options={STAGE_ROLE_OPTIONS.map((role) => ({
                value: role,
                label: STAGE_ROLE_LABEL[role],
              }))}
              help={STAGE_ROLE_DESC[order.role]}
            />

            {NEEDS_TARGET.includes(order.role) && (
              <Field
                kind="select"
                id={`target-${stage.day}`}
                label={targetLabel(order.role)}
                value={order.targetRiderId ?? ''}
                onChange={(v) => onChange({ targetRiderId: v || null })}
                options={[
                  { value: '', label: '— none yet —' },
                  ...(order.role === 'marcador' ? rivals : teammates).map((r) => ({
                    value: r.id,
                    label: r.name,
                  })),
                ]}
              />
            )}

            <Field
              kind="select"
              id={`mentality-${stage.day}`}
              label="Mentality"
              value={order.mentality}
              onChange={(v) => {
                const mentality = MENTALITY_OPTIONS.find((m) => m === v)
                if (mentality !== undefined) onChange({ mentality })
              }}
              options={MENTALITY_OPTIONS.map((m) => ({ value: m, label: MENTALITY_LABEL[m] }))}
              help={MENTALITY_DESC[order.mentality]}
            />

            <Field
              kind="select"
              id={`effort-${stage.day}`}
              label="Effort"
              value={order.effort}
              onChange={(v) => {
                const effort = EFFORT_OPTIONS.find((e) => e === v)
                if (effort !== undefined) onChange({ effort })
              }}
              options={EFFORT_OPTIONS.map((ef) => ({ value: ef, label: EFFORT_LABEL[ef] }))}
              help={EFFORT_DESC[order.effort]}
            />

            <Trigger stageDay={stage.day} stageKm={stage.km} order={order} onChange={onChange} />

            <Field
              kind="select"
              id={`day-goal-${stage.day}`}
              label="What I ride for"
              value={order.dayGoal ?? ''}
              onChange={(v) => onChange({ dayGoal: DAY_GOAL_OPTIONS.find((g) => g === v) ?? null })}
              options={[
                { value: '', label: 'No preference — the team decides' },
                ...DAY_GOAL_OPTIONS.map((g) => ({ value: g, label: DAY_GOAL_LABEL[g] })),
              ]}
              help={
                order.dayGoal
                  ? DAY_GOAL_DESC[order.dayGoal as DayGoalUi]
                  : 'Leave it blank and the day is planned for you.'
              }
            />

            <Field
              kind="select"
              id={`chase-${stage.day}`}
              label="What we do with a breakaway"
              value={order.chasePolicy ?? ''}
              onChange={(v) =>
                onChange({
                  chasePolicy: CHASE_POLICY_OPTIONS.find((c) => c === v) ?? null,
                })
              }
              options={[
                { value: '', label: 'No preference — read the race' },
                ...CHASE_POLICY_OPTIONS.map((c) => ({ value: c, label: CHASE_POLICY_LABEL[c] })),
              ]}
              help={
                order.chasePolicy
                  ? CHASE_POLICY_DESC[order.chasePolicy as ChasePolicyUi]
                  : 'Leave it blank and the team judges each move on its merits.'
              }
            />

            {teams.length > 0 && (
              <fieldset className="grid content-start gap-1">
                <legend className="text-meta font-semibold text-ink">
                  Teams I will not work with
                </legend>
                {/* uno por fila de 44, plegados: en una carrera son veinte equipos */}
                <Disclosure
                  showLabel={
                    vetados.length === 0
                      ? 'Choose teams'
                      : `Choose teams · ${vetados.length} chosen`
                  }
                  hideLabel="Hide the teams"
                >
                  <div className="grid px-3">
                    {teams.map((t) => (
                      <Checkbox
                        key={t.id}
                        label={t.name}
                        checked={vetados.includes(t.id)}
                        onChange={(marcado) =>
                          onChange({
                            refuseRelayTeams: marcado
                              ? [...vetados, t.id]
                              : vetados.filter((x) => x !== t.id),
                          })
                        }
                      />
                    ))}
                  </div>
                </Disclosure>
                <p className="text-meta text-ink-2">
                  You will not take a turn on the front while they are the ones benefiting.
                </p>
              </fieldset>
            )}

            <div className="grid content-start gap-3">
              <Contest
                label="Points-jersey sprints"
                value={order.contestSprints}
                onChange={(contestSprints) => onChange({ contestSprints })}
              />
              <Contest
                label="Mountain (KOM) points"
                value={order.contestClimbs}
                onChange={(contestClimbs) => onChange({ contestClimbs })}
              />
              <p className="text-meta text-ink-2">
                Contest the intermediate-sprint or the King-of-the-Mountains points at the banners
                along the route (green / polka-dot jerseys). Costs energy.
              </p>
            </div>
          </div>
        )}

        {avisos.length > 0 && (
          <ul className="grid gap-1">
            {avisos.map((a, i) => (
              <li key={i} className="flex gap-2 text-meta text-ink-2">
                <span className={`inline-flex ${a.level === 'warn' ? 'text-warn' : 'text-accent'}`}>
                  <Icon
                    name={a.level === 'warn' ? 'warning' : 'info'}
                    size={16}
                    label={a.level === 'warn' ? 'Warning' : 'Note'}
                  />
                </span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}

        {/* COPIAR A LAS DEMÁS, que es lo que ahorra la tarde: en una gran vuelta son veintiuna etapas y
            hasta ahora había que rellenarlas una a una. En una de un día no hay demás. */}
        {!stage.timeTrial && canCopy && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onCopy('iguales')}>
              Copy to every {kindWord.toLowerCase()} stage
            </Button>
            <Button variant="secondary" onClick={() => onCopy('siguientes')}>
              Copy to the rest of the race
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** `Race France · in 2 days`, `Race Var · racing now`: la carrera del selector (§4.10). */
function raceOptionLabel(r: { raceName: string; ongoing: boolean; daysUntil: number }): string {
  if (r.ongoing) return `${r.raceName} · racing now`
  return r.daysUntil > 0 ? `${r.raceName} · in ${plural(r.daysUntil, 'day')}` : r.raceName
}

/** Consola de órdenes de etapa: el piloto automático para tus próximas carreras inscritas (Paso 29). */
export function RaceOrders() {
  const queryClient = useQueryClient()
  const rev = useHorizonRev()
  const upcoming = useQuery({
    queryKey: horizonKey(['rider', 'upcoming'], rev),
    queryFn: fetchMyUpcomingRaces,
    enabled: rev !== undefined,
  })
  const [searchParams] = useSearchParams()
  // Por defecto: la carrera del enlace (?race=), si no la más próxima que aún no ha empezado. Al pintar, y no
  // en un efecto: la hoja se pide desde el primer pintado (PR 21i).
  const [chosen, setChosen] = useState<string | null>(null)
  const selectedKey = chosen ?? defaultRaceKey(upcoming.data ?? [], searchParams.get('race'))

  const raceOrders = useQuery({
    queryKey: ['race-orders', selectedKey],
    queryFn: () => fetchRaceOrders(selectedKey!),
    enabled: !!selectedKey,
  })
  const { data } = raceOrders
  // Borrador de ediciones sin guardar, SIEMPRE atado a su carrera: ni un refetch en segundo plano
  // las pisa (antes un `useEffect` copiaba `data` al estado y las borraba) ni se pueden guardar
  // contra otra carrera si el jugador cambia de selección antes de guardar.
  const [draft, setDraft] = useState<OrdersDraft | null>(null)
  const [status, setStatus] = useState<ActionBarStatus>('idle')

  const serverOrders = useMemo(
    () => (data ? buildServerOrders(data.stages, data.orders) : {}),
    [data],
  )
  const orders = resolveOrders(serverOrders, draft, selectedKey)

  const update = (day: number, patch: Partial<StageOrder>): void => {
    if (!selectedKey) return
    // lo tocado mientras se guarda espera a que acabe: la barra sigue `saving`
    setStatus((s) => (s === 'saving' ? s : 'idle'))
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

  // LA PUERTA DE LA N+1 (E2, §11.12, DD-09; 9b): con una etapa corrida y sin ver, la página abre con el
  // aviso y sus tres salidas; `Give orders anyway` la deja tal cual para esa carrera.
  const horizon = useHorizon()
  const waiting =
    selectedKey !== null && veilApplies(rev) ? waitingStage(horizon.data, selectedKey) : null
  const [ordersAnyway, setOrdersAnyway] = useState<ReadonlySet<string>>(new Set())
  const gated = waiting !== null && selectedKey !== null && !ordersAnyway.has(selectedKey)

  // Solo se guarda lo que se está viendo: la carrera seleccionada Y ya cargada.
  async function guardar(raceKey: string): Promise<void> {
    const enviado = draft
    setStatus('saving')
    try {
      await saveRaceOrders(raceKey, Object.values(orders))
      // lo guardado, de nuevo, antes de soltar el borrador: la pantalla no vuelve a lo de antes un momento
      await queryClient.invalidateQueries({ queryKey: ['race-orders', raceKey] })
      // se suelta lo mandado; lo tocado mientras tanto se queda, y la barra sigue con ello
      setDraft((d) => (d === enviado ? null : d))
      setStatus('saved')
    } catch {
      setStatus('failed')
    }
  }

  // Los estados, con `QueryView` (E3, PR 10), que contestan (§7.3): un fallo de `upcoming` ya no se pinta
  // como «no tienes carreras».
  if (upcoming.data === undefined)
    return (
      <QueryView query={upcoming} label="your upcoming races" skeleton={{ kind: 'panel' }} answer />
    )
  if (upcoming.data.length === 0) {
    return (
      <section className="grid gap-4">
        <PageHeader title="Race orders" />
        <EmptyState
          text="You have no upcoming races yet. Once your team enters you in a race (or you enter one as a free agent), it will appear here about two weeks before the start so you can set your autopilot."
          answer
        />
      </section>
    )
  }

  const oneDay = data !== undefined && data.stages.length === 1
  const enLinea = data?.stages.filter((st) => !st.timeTrial) ?? []
  const conChoque = enLinea.filter((st) =>
    orderAdvice(orders[st.day] ?? defaultOrder(st.day), st).some((a) => a.level === 'warn'),
  ).length
  const changed = data === undefined ? [] : changedStages(serverOrders, orders)
  const consequence =
    data === undefined
      ? ''
      : ordersConsequence(
          data.race.name,
          oneDay
            ? []
            : changed.map(
                (day) => data.stages.find((st) => st.day === day)?.name ?? `Stage ${day}`,
              ),
        )

  return (
    <section className="grid gap-4">
      <PageHeader title="Race orders" />
      <Field
        kind="select"
        id="race-picker"
        label="Race"
        value={selectedKey ?? ''}
        onChange={(v) => setChosen(v)}
        options={upcoming.data.map((r) => ({ value: r.raceKey, label: raceOptionLabel(r) }))}
        help="Set your autopilot for each stage, then save once."
      />
      {/* EL RESUMEN, ARRIBA. Con veintiuna etapas, lo que el jugador necesita saber al entrar es si
          se ha dejado algo sin decidir y si hay algo que chirría, no ir panel por panel. */}
      {data && data.stages.length > 1 && (
        <p className="text-meta text-ink-2">{clashSummary(enLinea.length, conChoque)}</p>
      )}

      {/* la hoja de la carrera elegida, con sus estados (E3, PR 10), que contestan mientras llega */}
      {data === undefined && (
        <QueryView query={raceOrders} label="the race" skeleton={{ kind: 'panel' }} answer />
      )}

      {gated && selectedKey !== null && waiting !== null ? (
        <OrdersGate
          raceKey={selectedKey}
          stageDay={waiting}
          onGiveOrders={() => setOrdersAnyway((prev) => new Set([...prev, selectedKey]))}
        />
      ) : (
        data !== undefined && (
          <div className="grid gap-4">
            {data.stages.map((stage, i) => (
              <StageOrders
                key={stage.day}
                stage={stage}
                order={orders[stage.day] ?? defaultOrder(stage.day)}
                title={orderStageTitle(stage, data.race.name, oneDay)}
                answer={i === 0}
                canCopy={!oneDay}
                teammates={data.teammates}
                rivals={data.rivals}
                teams={data.teams}
                onChange={(patch) => update(stage.day, patch)}
                onCopy={(alcance) => copiarA(stage.day, alcance)}
              />
            ))}
          </div>
        )
      )}

      {data !== undefined && selectedKey !== null && (
        <ActionBar
          changes={changed.length}
          consequence={consequence}
          actionLabel="Save orders"
          status={status}
          onSave={() => void guardar(selectedKey)}
        />
      )}
    </section>
  )
}
