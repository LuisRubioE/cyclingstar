import {
  INTENSITIES,
  INTENSITY_LABELS,
  type Intensity,
  type LoadLevel,
  type PlanPreviewDay,
  type PlanPreviewRace,
  SESSIONS,
  SESSION_CATALOG,
  type Session,
  type TrainingMode,
  seasonPosition,
} from '@cyclingstar/shared'
import { useId } from 'react'
import {
  type Blocks,
  type PlanCalendar,
  type TripPlan,
  afterTitle,
  dayChip,
  stageOfRaceDay,
  weekTitle,
} from '../domain/trainingPlan'
import { BLOCK_WORD, LOAD_WORD } from '../domain/words'
import { RuleLine } from './PlanLadder'
import { Button } from './ui/Button'
import { Chip } from './ui/Chip'
import { Disclosure } from './ui/Disclosure'
import { Field } from './ui/Field'
import { Meter } from './ui/Meter'
import { Notice } from './ui/Notice'
import { TripRow } from './ui/TripRow'

/**
 * EL DÍA A DÍA (E3, docs/visual.md §10.2, §10.5 y §11.6; PR 14). Plegado bajo la escalera, porque el dueño
 * quiere los 28 días a mano y no a la vista ([DUEÑO 11]). Por semanas del plan vivo, cada día con quién lo
 * decide: un borde izquierdo de 4 px y su `Chip` (D-13), su carga en palabras y, si se entrena, su sesión y su
 * intensidad; el día con orden, `Back to …`, que la quita. Ida, carrera y vuelta van en un `TripRow`, en la
 * semana de su primer día, con los descansos de una vuelta dentro, que se editan. En `Coach decides` nada se
 * edita: un aviso lo dice, con el botón que pasa a `Mixed` sin guardar.
 */

/** `Travel` no se elige: lo pone el viaje (`resolveTrainingDay`). */
const SELECTABLE = SESSIONS.filter((s) => s !== 'viaje').map((s) => ({
  value: s,
  label: SESSION_CATALOG[s].label,
}))
const INTENSITY_OPTIONS = INTENSITIES.map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))

export const COACH_MODE_TITLE = 'Coach mode: nothing you set here is used.'

export interface DayActions {
  readonly onEdit: (gameDay: number, choice: { session: Session; intensity: Intensity }) => void
  readonly onBack: (gameDay: number) => void
  /** `Back to Build`: a dónde vuelve un día con orden */
  readonly backLabel: (gameDay: number) => string
}

/** La sesión y la intensidad de un día que se entrena, y `Back to …` si tiene orden. */
function DayEditor({
  day,
  titleId,
  actions,
}: {
  readonly day: PlanPreviewDay
  readonly titleId: string
  readonly actions: DayActions
}) {
  const sessionId = useId()
  const intensityId = useId()
  const session = day.session ?? 'descanso_activo'
  const intensity = day.intensity ?? 'normal'
  return (
    <div className="grid gap-2">
      <span id={`${sessionId}-name`} className="sr-only">
        session
      </span>
      <span id={`${intensityId}-name`} className="sr-only">
        intensity
      </span>
      <div className="flex flex-wrap gap-2">
        <Field
          kind="select"
          id={sessionId}
          label="Session"
          labelledBy={`${titleId} ${sessionId}-name`}
          value={session}
          onChange={(v) => actions.onEdit(day.gameDay, { session: v as Session, intensity })}
          options={SELECTABLE}
          layout="min-w-0 flex-1 basis-48"
        />
        {SESSION_CATALOG[session].variableIntensity && (
          <Field
            kind="select"
            id={intensityId}
            label="Intensity"
            labelledBy={`${titleId} ${intensityId}-name`}
            value={intensity}
            onChange={(v) => actions.onEdit(day.gameDay, { session, intensity: v as Intensity })}
            options={INTENSITY_OPTIONS}
            layout="min-w-0 basis-32"
          />
        )}
      </div>
      {day.source === 'orden' && (
        <Button
          variant="quiet"
          icon="retry"
          onClick={() => actions.onBack(day.gameDay)}
          layout="-ml-4 self-start"
        >
          {actions.backLabel(day.gameDay)}
        </Button>
      )}
    </div>
  )
}

/** La carga de un día: `▮▮▮▯ Load: hard`. */
function Carga({ load }: { readonly load: number }) {
  return (
    <Meter
      label="Load"
      value={load}
      valueText={LOAD_WORD[load as LoadLevel].toLowerCase()}
      layout="ml-auto"
    />
  )
}

/** La sesión de un día, en `Coach decides`: se lee, no se elige. */
const sesionLeida = (d: PlanPreviewDay) =>
  d.session === null
    ? null
    : SESSION_CATALOG[d.session].variableIntensity && d.intensity !== null
      ? `${SESSION_CATALOG[d.session].label} · ${INTENSITY_LABELS[d.intensity]}`
      : SESSION_CATALOG[d.session].label

function DayRow({
  day,
  races,
  days,
  editable,
  actions,
}: {
  readonly day: PlanPreviewDay
  readonly races: readonly PlanPreviewRace[]
  readonly days: readonly PlanPreviewDay[]
  readonly editable: boolean
  readonly actions: DayActions
}) {
  const titleId = useId()
  const chip = dayChip(day)
  const race = day.source === 'carrera' ? races.find((r) => r.raceKey === day.raceKey) : undefined
  const leida = editable ? null : sesionLeida(day)
  return (
    <li className={`grid gap-2 rounded-ui border-l-4 bg-surface py-2 pr-1 pl-3 ${chip.border}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p id={titleId} className="text-row text-ink">
          {`Day ${seasonPosition(day.gameDay).dayOfSeason}`}
        </p>
        <Chip tone={chip.tone}>{chip.text}</Chip>
        <Carga load={day.load} />
      </div>
      {race !== undefined && (
        <p className="text-meta text-ink-2">
          {`${race.name} · Stage ${stageOfRaceDay(race, days, day.gameDay)}`}
        </p>
      )}
      {day.source !== 'carrera' && editable && (
        <DayEditor day={day} titleId={titleId} actions={actions} />
      )}
      {leida !== null && day.source !== 'carrera' && (
        <p className="text-meta text-ink-2">{leida}</p>
      )}
    </li>
  )
}

function Viaje({
  trip,
  days,
  editable,
  actions,
}: {
  readonly trip: TripPlan
  readonly days: readonly PlanPreviewDay[]
  readonly editable: boolean
  readonly actions: DayActions
}) {
  return (
    <TripRow
      race={trip.race}
      meta={trip.meta}
      active={trip.active}
      legs={trip.legs.map((leg) => {
        const day = leg.gameDay === null ? undefined : days.find((d) => d.gameDay === leg.gameDay)
        return {
          key: leg.key,
          days: leg.days,
          what: leg.what,
          ...(day !== undefined && editable
            ? { action: <RestDay day={day} label={leg.days} actions={actions} /> }
            : {}),
        }
      })}
    />
  )
}

/** Un día de descanso de una vuelta, dentro de su viaje: se edita como los demás. */
function RestDay({
  day,
  label,
  actions,
}: {
  readonly day: PlanPreviewDay
  readonly label: string
  readonly actions: DayActions
}) {
  const titleId = useId()
  return (
    <span className="grid gap-1 py-1">
      <span id={titleId} className="sr-only">
        {label}
      </span>
      <DayEditor day={day} titleId={titleId} actions={actions} />
    </span>
  )
}

export interface DayByDayProps {
  readonly mode: TrainingMode
  readonly calendar: PlanCalendar
  /** los bloques de la pantalla, para la cabecera de cada semana */
  readonly blocks: Blocks
  readonly days: readonly PlanPreviewDay[]
  readonly races: readonly PlanPreviewRace[]
  readonly trips: readonly TripPlan[]
  readonly actions: DayActions
  readonly onSwitchToMixed: () => void
  /** `Adopt team plan`, solo en `Mixed` y con plan de equipo */
  readonly onAdopt?: () => void
  /** `Publish as team plan`, para quien lleva el equipo */
  readonly onPublish?: () => void
  readonly teamMessage?: string | null
}

export function DayByDay({
  mode,
  calendar,
  blocks,
  days,
  races,
  trips,
  actions,
  onSwitchToMixed,
  onAdopt,
  onPublish,
  teamMessage = null,
}: DayByDayProps) {
  const editable = mode !== 'entrenador'
  const porDia = new Map(days.map((d) => [d.gameDay, d]))
  const enViaje = new Set(trips.flatMap((t) => [...t.covers]))
  const viajeQueEmpieza = new Map(trips.map((t) => [t.firstDay, t]))

  const filas = (gameDays: readonly number[]) =>
    gameDays.flatMap((g) => {
      const trip = viajeQueEmpieza.get(g)
      if (trip !== undefined)
        return [
          <Viaje
            key={trip.raceKey}
            trip={trip}
            days={days}
            editable={editable}
            actions={actions}
          />,
        ]
      const day = porDia.get(g)
      if (day === undefined || enViaje.has(g)) return []
      return [
        <DayRow
          key={g}
          day={day}
          races={races}
          days={days}
          editable={editable}
          actions={actions}
        />,
      ]
    })

  const grupos = [
    ...calendar.weeks.map((w) => {
      const block = blocks[w.index] ?? null
      // En `Coach decides` los bloques no se usan: la semana es del entrenador.
      const quien =
        mode === 'entrenador' || block === null
          ? mode === 'manual'
            ? 'Rest'
            : 'Coach'
          : BLOCK_WORD[block]
      return { key: `w${w.index}`, title: `${weekTitle(w)} · ${quien}`, days: w.days }
    }),
    ...(calendar.after === null
      ? []
      : [{ key: 'after', title: afterTitle(calendar.after, mode), days: calendar.after.days }]),
  ]

  return (
    <Disclosure showLabel="Show the 28 days" hideLabel="Hide the 28 days">
      <div className="grid gap-4 pt-2">
        {!editable && (
          <div className="grid gap-2">
            <Notice tone="info" title={COACH_MODE_TITLE}>
              Switch to Mixed to edit.
            </Notice>
            <Button variant="secondary" onClick={onSwitchToMixed} layout="self-start">
              Switch to Mixed
            </Button>
          </div>
        )}
        <RuleLine mode={mode} />
        {grupos.map((g) => (
          <section key={g.key} aria-label={g.title} className="grid gap-2">
            <h3 className="text-row text-ink">{g.title}</h3>
            <ul className="grid gap-2">{filas(g.days)}</ul>
          </section>
        ))}
        {(onAdopt !== undefined || onPublish !== undefined) && (
          <div className="flex flex-wrap items-center gap-2">
            {onAdopt !== undefined && (
              <Button variant="secondary" onClick={onAdopt}>
                Adopt team plan
              </Button>
            )}
            {onPublish !== undefined && (
              <Button variant="secondary" onClick={onPublish}>
                Publish as team plan
              </Button>
            )}
            {teamMessage !== null && (
              <p role="status" className="text-meta text-ink-2">
                {teamMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </Disclosure>
  )
}
