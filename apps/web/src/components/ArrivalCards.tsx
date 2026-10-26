import type { OrdersDay, PlanPreviewRace } from '@cyclingstar/shared'
import { ARRIVAL_ADVICE, raceMeta, raceWhen, racingNow } from '../domain/trainingPlan'
import { Disclosure } from './ui/Disclosure'
import { EmptyState } from './ui/EmptyState'
import { Scale5 } from './ui/Scale5'
import { TextLink } from './ui/TextLink'

/**
 * CÓMO LLEGO A MIS PRÓXIMAS CARRERAS (E3, docs/visual.md §10.3 y §10.4; PR 14; D-34, D-42). Lo que contesta
 * la pantalla: una tarjeta por carrera, con la llegada a la salida de su primera etapa en el horizonte, la
 * única de fiar (mapa 02 §3), en `Scale5`, y la instrucción de su tramo, que empieza por la causa. Sin
 * componente propio: el `Panel` de la página, `TextLink` y `Scale5`. Tres a la vista y el resto plegado.
 */

const A_LA_VISTA = 3
export const NO_RACES = 'No races in the next four weeks. This month is for building.'
export const ONLY_THE_START =
  'Only the start is forecast: later stages depend on how you race them.'

function Tarjeta({
  race,
  days,
  today,
}: {
  readonly race: PlanPreviewRace
  readonly days: readonly OrdersDay[]
  readonly today: number
}) {
  return (
    <li className="grid gap-2 py-3">
      <div>
        <p className="flex flex-wrap items-center gap-x-2 text-row text-ink">
          <TextLink to={`/world/races/${race.raceId}`}>{race.name}</TextLink>
          <span className="text-meta text-ink-2">{`· ${raceMeta(race)}`}</span>
        </p>
        <p className="text-meta text-ink-2">{raceWhen(race, today)}</p>
      </div>
      {race.ongoing ? (
        <Scale5
          value={null}
          racing={{ ...racingNow(race, days), route: { from: null, to: null } }}
          race={race.name}
        />
      ) : (
        <Scale5 value={race.arrival} race={race.name} />
      )}
      {!race.ongoing && race.arrival !== null && (
        <p className="text-meta text-ink-2">{ARRIVAL_ADVICE[race.arrival]}</p>
      )}
    </li>
  )
}

export function ArrivalCards({
  races,
  days,
  today,
}: {
  readonly races: readonly PlanPreviewRace[]
  /** los 28 días, para contar la etapa que toca en una carrera en curso */
  readonly days: readonly OrdersDay[]
  /** el día de juego de hoy */
  readonly today: number
}) {
  if (races.length === 0) return <EmptyState icon="race" text={NO_RACES} />
  const tarjeta = (r: PlanPreviewRace) => (
    <Tarjeta key={r.raceKey} race={r} days={days} today={today} />
  )
  const resto = races.slice(A_LA_VISTA)
  return (
    <div className="grid gap-2">
      <ul className="divide-y divide-line">{races.slice(0, A_LA_VISTA).map(tarjeta)}</ul>
      {resto.length > 0 && (
        <Disclosure showLabel={`Show all ${races.length} races`} hideLabel="Show fewer">
          <ul className="divide-y divide-line border-t border-line">{resto.map(tarjeta)}</ul>
        </Disclosure>
      )}
      <p className="text-caption text-ink-3">{ONLY_THE_START}</p>
    </div>
  )
}
