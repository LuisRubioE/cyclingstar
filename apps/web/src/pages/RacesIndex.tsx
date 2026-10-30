import { useQuery } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { type CalendarRaceSummary, fetchCalendar } from '../api/calendar'
import { TOP_ROWS } from '../components/ShowAll'
import { RestDay, StageLine } from '../components/StageLine'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { Disclosure } from '../components/ui/Disclosure'
import { EmptyState } from '../components/ui/EmptyState'
import { Field } from '../components/ui/Field'
import { Flag } from '../components/ui/Flag'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { ShowAllRows } from '../components/ui/ShowAllRows'
import { TextLink } from '../components/ui/TextLink'
import { formatLabel, raceClassLabel } from '../domain/labels'
import {
  type ClassFilter,
  type FormatFilter,
  type RaceTimelineStatus,
  RECENT_WINDOW,
  type TimelineRow,
  buildTimeline,
  champCountryName,
  champEventLabel,
  champEventsByDay,
  championshipsByNation,
  nationDay,
} from '../domain/raceTimeline'
import { finalVeiled, raceKeyOn, raceVeil } from '../domain/veil'
import { formatGameDay, plural } from '../domain/words'
import { horizonKey, useHealth, useHorizon, useHorizonRev } from '../queryClient'

/**
 * `World → Races`: la ÚNICA página de carreras del mundo (docs/navegacion.md §3.3).
 *
 * Fusiona el antiguo `World → Calendar` y el antiguo `World → Races`, que confundían porque
 * enseñaban casi lo mismo: los dos respondían a "¿qué viene?" y a "¿qué pasó?". De cada uno se
 * conserva lo que hacía mejor:
 *
 * - del calendario: la línea temporal cronológica con el marcador de "hoy", el desplegable con las
 *   etapas de cada carrera y el bloque aparte de campeonatos nacionales;
 * - del índice: el buscador (nombre, país, ganador) y los filtros de clase y de formato.
 *
 * Y se añade lo que faltaba en ambos: lo recién corrido y lo que viene, juntos alrededor de "hoy"
 * sin desplazarse media temporada (el pasado lejano se pliega tras un botón).
 *
 * Es pública: se ve sin sesión, como el resto de `World`. La lógica —orden, marcador, filtros y
 * agrupación de campeonatos— vive en `domain/raceTimeline` y se prueba allí.
 *
 * CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21e): un solo `Panel` contesta a la 20
 * (§7.3), con el buscador y los dos filtros dentro, en `Field` con su rótulo a la vista, porque encima la
 * respuesta caería hacia los 520 px y en los campeonatos tienen que seguir a la vista para volver. Cada
 * carrera, una `ActionRow` que enlaza a su ficha, con sus etapas plegadas debajo; hoy, `Day 50`; el ganador,
 * tras `Winner` (3-d); y las 20 primeras de lo que viene, con `Show all N` (§6.1). Sin el gris de lo corrido:
 * lo separa el marcador de hoy.
 */

const CLASS_FILTERS: { key: ClassFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'WT', label: 'WorldTour' },
  { key: 'Pro', label: 'ProSeries' },
  { key: 'CON', label: 'Continental' },
  { key: 'NC', label: 'Championships' },
]

const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: 'all', label: 'Any format' },
  { key: 'gran-vuelta', label: 'Grand tours' },
  { key: 'una-semana', label: 'Stage races' },
  { key: 'un-dia', label: 'One-day' },
]

/** La clave de un filtro desde el valor de su `select`, sin aserciones: lo que no es una, la primera. */
const filterKey = <K extends string>(filters: readonly { key: K }[], value: string): K =>
  filters.find((f) => f.key === value)?.key ?? filters[0]!.key

/**
 * Una carrera de la línea temporal (E3, §4.5; PR 21e): su nombre y su clase, y en el segundo renglón el día,
 * el país, el formato y quién ganó, todo enlazado a su ficha; debajo, plegado, el recorrido etapa a etapa
 * (lo que el índice viejo no tenía y el calendario sí). Antes, un botón que abría la fila, con el ganador
 * cortado a 112 px, la clase y el formato escondidos en el teléfono y el enlace a la ficha dentro.
 */
function RaceRow({
  race,
  status,
  today,
  finalHidden,
}: {
  race: CalendarRaceSummary
  status: RaceTimelineStatus
  /** el día de la temporada, para `in 3 days` */
  today: number | null
  /** la última etapa está en el velo de quien mira (sup. I1; 9b) */
  finalHidden: boolean
}) {
  const totalKm = race.stages.reduce((sum, s) => sum + s.km, 0)
  const oneDay = race.stages.length === 1
  const meta = [formatGameDay(race.startDay, today), race.country, formatLabel(race.format)]
    .filter((p) => p !== null)
    .join(' · ')
  // sin región: hay una por fila, y abiertas se llamarían todas igual (PR 21b)
  const etapas = oneDay ? 'the route' : `the ${plural(race.stages.length, 'stage')}`
  return (
    <ActionRow
      title={
        <>
          {race.name}{' '}
          <span className="text-caption font-semibold text-ink-3">
            {raceClassLabel(race.raceClass)}
            {!oneDay && ` · ${plural(race.stages.length, 'stage')}`}
          </span>
        </>
      }
      meta={
        <>
          {meta}
          {race.winner !== null ? (
            <>
              {' · '}
              <span className="text-ink-3">Winner</span> {race.winner}
            </>
          ) : finalHidden ? (
            // la API no manda el ganador de una carrera de final velado (P; 8a): se dice que está por ver
            <>
              {' · '}
              <span className="font-semibold text-good">Finished · ready to watch</span>
            </>
          ) : (
            status === 'ongoing' && (
              <>
                {' · '}
                <span className="font-semibold text-good">Racing now</span>
              </>
            )
          )}
        </>
      }
      href={`/world/races/${race.id}`}
      extra={
        <Disclosure
          showLabel={`Show ${etapas}`}
          hideLabel={`Hide ${etapas}`}
          region={false}
          layout="w-full"
        >
          <div className="grid gap-1 px-3 pb-1 text-meta">
            <p className="text-caption text-ink-3">
              {Math.round(totalKm)} km total · open to {race.openTo.join(', ')}
            </p>
            <ol className="grid gap-1">
              {race.stages.map((stage) => (
                <Fragment key={stage.index}>
                  <li className="flex flex-wrap items-center gap-x-2">
                    <StageLine stage={stage} oneDay={oneDay} />
                  </li>
                  {/* Día de descanso tras esta etapa (grandes vueltas y alguna vuelta por etapas). */}
                  {race.restAfter.includes(stage.index) && <RestDay />}
                </Fragment>
              ))}
            </ol>
          </div>
        </Disclosure>
      }
    />
  )
}

/**
 * Una nación con sus pruebas (Crono/Ruta × Elite/Sub-23). No todas caen el mismo día: la crono va
 * entre semana y la ruta el fin de semana, y según el país la Elite y el Sub-23 coinciden o no. Por
 * eso se agrupan por día, y así se ve de un vistazo qué pruebas comparten fecha. Desde el PR 21e, cada
 * prueba es un enlace de 44 con su ganador detrás, a la vista, y no en un `title` (ui/4) tras una copa.
 */
function NationRow({
  code,
  races,
  today,
  hidden,
}: {
  code: string
  races: CalendarRaceSummary[]
  today: number | null
  /** si la prueba tiene el final en el velo de quien mira (sup. I2; 9b) */
  hidden: (race: CalendarRaceSummary) => boolean
}) {
  return (
    <li className="grid gap-0.5 py-2">
      <p className="flex items-center gap-2 text-row font-semibold text-ink">
        {/* la bandera, para el ojo: su nombre lo dice el texto de al lado, que el lector no oiga dos veces */}
        <span aria-hidden="true">
          <Flag country={code} />
        </span>
        {champCountryName(races[0]!)}
      </p>
      {/* el día en su renglón y sus pruebas debajo, que parten a todo lo ancho: a su lado, en el teléfono,
          cada prueba caía en un renglón suelto bajo el día. En un `<p>`, cada enlace es de frase: `ITT` no
          llega a 44 de ancho, y pide su círculo de 24 libre (WCAG 2.5.8; la comprobación 5) */}
      {champEventsByDay(races).map(([day, events]) => (
        <div key={day}>
          <p className="text-caption tabular-nums text-ink-3">{formatGameDay(day, today)}</p>
          <p className="flex flex-wrap items-center gap-x-4 text-meta">
            {events.map((r) => (
              <span key={r.id} className="inline-flex flex-wrap items-center gap-x-1">
                <TextLink to={`/world/races/${r.id}`}>{champEventLabel(r)}</TextLink>
                {r.winner !== null ? (
                  <span className="text-ink-2">
                    <span className="text-ink-3">Winner</span> {r.winner}
                  </span>
                ) : (
                  hidden(r) && (
                    <span className="font-semibold text-good">Finished · ready to watch</span>
                  )
                )}
              </span>
            ))}
          </p>
        </div>
      ))}
    </li>
  )
}

/**
 * Los campeonatos nacionales, aparte: son 532 carreras de un día y en la línea temporal la
 * sepultarían. Tienen su propio filtro, y aquí se agrupan por nación; las 20 primeras naciones, con
 * `Show all N` (PR 21e). Se exporta para su test, que no puede pulsar el filtro.
 */
export function NationalChampionships({
  nations,
  today,
  hidden,
}: {
  nations: readonly [string, CalendarRaceSummary[]][]
  today: number | null
  hidden: (race: CalendarRaceSummary) => boolean
}) {
  const [todas, setTodas] = useState(false)
  if (nations.length === 0)
    return <EmptyState text="No national championships match that search." />
  const days = nations.map(([, list]) => nationDay(list))
  const first = Math.min(...days)
  const last = Math.max(...days)
  return (
    <>
      <p className="text-caption text-ink-3">
        {first === last ? `Day ${first}` : `Day ${first} to Day ${last}`} · Elite &amp; U23, road
        and time trial — most in late June, southern hemisphere in Jan–Feb.
      </p>
      <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0">
        {(todas ? nations : nations.slice(0, TOP_ROWS)).map(([code, list]) => (
          <NationRow key={code} code={code} races={list} today={today} hidden={hidden} />
        ))}
      </ul>
      <ShowAllRows total={nations.length} expanded={todas} onToggle={() => setTodas((t) => !t)} />
    </>
  )
}

export function RacesIndex() {
  const rev = useHorizonRev()
  const calendar = useQuery({
    queryKey: horizonKey(['calendar'], rev),
    queryFn: fetchCalendar,
    enabled: rev !== undefined,
  })
  const { data } = calendar
  // Bajo el velo (E2, §11.3; sups. I1 e I2; 9b): la carrera de final velado llega sin ganador (P, 8a), y la
  // fila dice que está por ver. Solo del horizonte de quien mira (I-39).
  const horizon = useHorizon()
  const health = useHealth()
  const hidden = (race: CalendarRaceSummary): boolean =>
    finalVeiled(
      raceVeil(horizon.data, raceKeyOn(race.id, health.data?.gameDay)),
      Math.max(1, race.stages.length),
    )
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')
  const [showEarlier, setShowEarlier] = useState(false)
  const [todas, setTodas] = useState(false)

  const today = data?.dayOfSeason ?? null
  const races = useMemo(() => data?.races ?? [], [data])

  const timeline = useMemo(
    () => buildTimeline(races, { today, query, classFilter, formatFilter, showEarlier }),
    [races, today, query, classFilter, formatFilter, showEarlier],
  )
  // El bloque de campeonatos usa el buscador y el formato, pero no la clase (ya está elegida).
  const nations = useMemo(
    () =>
      championshipsByNation(
        buildTimeline(races, { today, query, classFilter: 'NC', formatFilter, showEarlier: true })
          .rows.filter((row) => row.kind === 'race')
          .map((row) => row.race),
      ),
    [races, today, query, formatFilter],
  )
  const nationals = useMemo(() => races.filter((r) => r.championshipCountry != null), [races])
  const nationCount = useMemo(
    () => new Set(nationals.map((r) => r.championshipCountry)).size,
    [nationals],
  )

  // Los estados, con `QueryView` (E3, PR 10); la espera también contesta (§7.3).
  if (data === undefined)
    return (
      <QueryView
        query={calendar}
        label="the races"
        skeleton={{ kind: 'rows', rowHeight: 64 }}
        answer
      />
    )

  const baseRaces = races.length - nationals.length
  const showingChamps = classFilter === 'NC'
  // Con el pasado desplegado se puede volver a plegar, siempre que hubiera algo que plegar.
  const canCollapse =
    timeline.rows.filter((row) => row.kind === 'race' && row.status === 'finished').length >
    RECENT_WINDOW
  // lo corrido, encima del marcador de hoy, y lo que viene, debajo, con sus 20 primeras (§6.1)
  const hoy = timeline.rows.findIndex((row) => row.kind === 'today')
  const corridas = hoy < 0 ? [] : timeline.rows.slice(0, hoy)
  const vienen = hoy < 0 ? timeline.rows : timeline.rows.slice(hoy + 1)
  const fila = (row: TimelineRow) =>
    row.kind === 'race' && (
      <RaceRow
        key={row.race.id}
        race={row.race}
        status={row.status}
        today={today}
        finalHidden={hidden(row.race)}
      />
    )
  const LISTA = 'divide-y divide-line'

  return (
    <section className="space-y-4">
      <PageHeader title="Races" />
      <p className="text-meta text-ink-2">
        The season in order, with today marked: what has just been raced and what is coming next, in
        one timeline. {baseRaces} races plus national championships for {nationCount} nations —
        grand tours, stage races, one-day classics and every nation&apos;s Elite &amp; U23 titles.
      </p>

      <Panel
        title={
          showingChamps
            ? `National championships (${nations.length} nations)`
            : `Season timeline (${timeline.total})`
        }
        answer
      >
        <div className="grid gap-3 pb-3">
          <Field
            kind="input"
            type="search"
            id="races-search"
            label="Search races"
            value={query}
            onChange={setQuery}
            placeholder="Search by race, country code or winner…"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              kind="select"
              id="races-class"
              label="Race class"
              value={classFilter}
              onChange={(v) => setClassFilter(filterKey(CLASS_FILTERS, v))}
              options={CLASS_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
            />
            <Field
              kind="select"
              id="races-format"
              label="Race format"
              value={formatFilter}
              onChange={(v) => setFormatFilter(filterKey(FORMAT_FILTERS, v))}
              options={FORMAT_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
            />
          </div>
        </div>

        {showingChamps ? (
          <NationalChampionships nations={nations} today={today} hidden={hidden} />
        ) : timeline.total === 0 ? (
          <EmptyState text="No race matches that search." />
        ) : (
          <>
            {/* El pasado lejano, plegado: así "hoy" y lo que viene entran en la primera pantalla. */}
            {timeline.earlierCount > 0 && (
              <Button variant="quiet" layout="w-full" onClick={() => setShowEarlier(true)}>
                {`Show ${plural(timeline.earlierCount, 'earlier race')}`}
              </Button>
            )}
            {showEarlier && canCollapse && (
              <Button variant="quiet" layout="w-full" onClick={() => setShowEarlier(false)}>
                Back to recent races
              </Button>
            )}
            {corridas.length > 0 && <ul className={LISTA}>{corridas.map(fila)}</ul>}
            {hoy >= 0 && (
              <p className="flex items-center gap-2 border-y border-accent bg-info-bg px-3 py-1.5 text-caption font-semibold uppercase tracking-caps text-ink">
                <span className="inline-block h-2 w-2 shrink-0 rounded-ui bg-accent" aria-hidden />
                Today · Day {today}
              </p>
            )}
            <ul className={LISTA}>{(todas ? vienen : vienen.slice(0, TOP_ROWS)).map(fila)}</ul>
            <ShowAllRows
              total={vienen.length}
              expanded={todas}
              onToggle={() => setTodas((t) => !t)}
            />
          </>
        )}
      </Panel>
    </section>
  )
}
