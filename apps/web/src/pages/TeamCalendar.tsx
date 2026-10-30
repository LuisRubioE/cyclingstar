import { COUNTRIES, TRANSPORT_COST, seasonPosition } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type RaceClass, type RaceFormat, fetchCalendar } from '../api/calendar'
import { fetchMyUpcomingRaces } from '../api/rider'
import {
  type TeamCalendar as TeamCalendarData,
  type TeamCalendarRace,
  type TeamPlanRace,
  type TeamRacePlan,
  draftRace,
  fetchTeamCalendar,
  fetchTeamRacePlan,
  undraftRace,
} from '../api/teamCalendar'
import { TOP_ROWS } from '../components/ShowAll'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { InfoButton } from '../components/ui/InfoButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { ShowAllRows } from '../components/ui/ShowAllRows'
import { Stat } from '../components/ui/Stat'
import { formatLabel, raceClassLabel, travelDaysLabel } from '../domain/labels'
import { finalVeiled, raceKeyOn, raceVeil } from '../domain/veil'
import { formatGameDay } from '../domain/words'
import { horizonKey, useHealth, useHorizon, useHorizonRev } from '../queryClient'

/**
 * `My Team → Race calendar` (docs/navegacion.md §3.4). La página existía pero estaba HUÉRFANA: no
 * se enlazaba desde ningún sitio y solo servía al mánager. Ahora vive en la sección `My Team` y
 * tiene dos caras:
 *
 * - **Mánager** (quien ha tomado el control de su equipo): el planificador de siempre, con el coste
 *   de viaje y los botones de añadir/quitar. Intacto.
 * - **Miembro** (el caso normal hoy: todos los equipos son bots): SOLO LECTURA. Responde a "¿a qué
 *   carreras puede ir mi equipo, y por tanto dónde pueden mandarme?", marcando las que ya tengo
 *   confirmadas.
 *
 * La vista de miembro lee el PLAN REAL del equipo (`/api/teams/me/race-plan`, solo lectura): no
 * todas las carreras abiertas a su división, sino a las que su equipo tiene previsto ir. El
 * endpoint no expone presupuesto ni salarios: eso es cosa de quien gestiona el equipo.
 */

/**
 * La línea de estado de las dos caras (E3, §4.4; PR 21c): el equipo y su país, con su nombre, como la de la
 * ficha del equipo; la bandera de al lado se va (D-00c).
 */
function teamStatus(teamName: string, country: string | null): string {
  if (country === null) return teamName
  return `${teamName} · based in ${COUNTRIES.find((c) => c.code === country)?.name ?? country}`
}

/**
 * El segundo renglón de una carrera del plan (E3, docs/visual.md §6.1; PR 12a): el día, el país, si es de
 * casa, el viaje del equipo entero y sus días (`Day 59 · FR · Travel 336 · 2 travel days (1 out, 1 back)`).
 */
function metaDelPlan(race: TeamCalendarRace, hoy: number | null): string {
  const total = race.travelPerRider * race.squad
  const dias = travelDaysLabel(TRANSPORT_COST[race.travelTier].days)
  return [
    formatGameDay(race.startDay, hoy),
    race.country,
    race.natural ? 'Home race' : null,
    total > 0 ? `Travel ${total.toLocaleString('en-US')}` : null,
    race.travelTier === 'intercontinental' ? 'Overseas' : null,
    dias === '' ? null : dias,
  ]
    .filter((p) => p !== null)
    .join(' · ')
}

/** El planificador del mánager: elige a qué carreras va el equipo y paga el viaje. */
function ManagerPlanner({ data }: { data: TeamCalendarData }) {
  const queryClient = useQueryClient()
  const mutate = useMutation({
    mutationFn: ({ id, drafted }: { id: string; drafted: boolean }) =>
      drafted ? undraftRace(id) : draftRace(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['team-calendar'] }),
  })
  const health = useHealth()
  const hoy = health.data?.gameDay ? seasonPosition(health.data.gameDay).dayOfSeason : null
  const [todas, setTodas] = useState(false)
  const vista = todas ? data.races : data.races.slice(0, TOP_ROWS)

  const draftedCount = data.races.filter((r) => r.drafted).length
  const plannedCost = data.races
    .filter((r) => r.drafted)
    .reduce((sum, r) => sum + r.travelPerRider * r.squad, 0)

  return (
    <section className="space-y-4">
      <PageHeader title="Race calendar" status={teamStatus(data.teamName, data.teamCountry)} />
      <p className="text-meta text-ink-2">
        Your team&apos;s <strong>home races</strong> are planned by default — for a continental
        team, every continental race in its region. <strong>Add</strong> races to travel further
        afield, or <strong>Drop</strong> ones you want to skip. Travel (transport + hotel) is
        charged to the team budget per rider when each race convokes.
      </p>

      {/* el plan, la respuesta de la 15 (§7.3; desde el PR 21c, en el `Panel` del catálogo), arriba y con sus
          dos cifras dentro: con las siete tarjetas encima, empezaba hacia los 750 px, y la comprobación 7
          pide 520 */}
      <Panel title="Race plan" answer>
        {data.races.length === 0 ? (
          <EmptyState icon="race" text="No upcoming races left to plan this season." />
        ) : (
          <div className="grid gap-3">
            {/* las cifras, en `Stat` (§4.4), con el dinero de `money`: hoy, `17214` */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Races planned" value={draftedCount} />
              <Stat label="Planned travel cost" value={plannedCost} />
            </div>
            {/* el porqué del viaje caro, en un `InfoButton` y no en un `title` (E3, §11.6; PR 15) */}
            {data.races.some((r) => r.travelTier === 'intercontinental') && (
              <p className="flex flex-wrap items-center gap-x-1 text-meta text-ink-2">
                Overseas races cost more.
                <InfoButton label="About overseas trips">
                  {`Overseas trip: it costs more, and ${TRANSPORT_COST.intercontinental.days} travel days each way with no training.`}
                </InfoButton>
              </p>
            )}
            {/* las filas con su acción (E3, PR 12a): `Add` y `Drop` vuelven a verse y a tocarse, y las 20 primeras */}
            <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0">
              {vista.map((race) => {
                const verbo = race.drafted ? 'Drop' : 'Add'
                return (
                  <ActionRow
                    key={race.raceId}
                    title={
                      <>
                        {race.name}{' '}
                        <span className="text-caption font-semibold text-ink-3">
                          .{race.raceClass}
                        </span>
                      </>
                    }
                    meta={metaDelPlan(race, hoy)}
                    href={`/world/races/${race.raceId}`}
                    action={{
                      label: verbo,
                      ariaLabel: `${verbo} ${race.name}`,
                      onClick: () => mutate.mutate({ id: race.raceId, drafted: race.drafted }),
                      busy: mutate.isPending && mutate.variables?.id === race.raceId,
                    }}
                  />
                )
              })}
            </ul>
            <ShowAllRows
              total={data.races.length}
              expanded={todas}
              onToggle={() => setTodas((t) => !t)}
            />
          </div>
        )}
      </Panel>

      {/* el presupuesto y la semana, en `Stat` con su signo; una por renglón en el teléfono: siete cifras en
          `display` piden unos 178 px con DejaVu Sans, y media columna a 320 da 124 */}
      <Panel title="Team budget">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Budget" value={data.budget} />
          <Stat label="Weekly income" value={data.weeklyIncome} signed />
          <Stat label="Weekly wages" value={-data.weeklyWages} signed />
          <Stat label="Weekly net" value={data.weeklyNet} signed />
        </div>
        <p className="mt-3 text-caption text-ink-2">
          Sponsors pay a fixed weekly income; wages are your riders&apos; salaries (plus any housing
          you cover). Travel is charged on top when each race convokes — so a busy calendar of far
          races eats into the budget faster.
        </p>
      </Panel>
    </section>
  )
}

/**
 * Una carrera del plan de mi equipo, en la vista de miembro: de solo lectura, una `ActionRow` sin acción que
 * enlaza a su ficha (E3, §6.1; PR 21c), y la que corro, con su `Chip` `You ride`. En el segundo renglón, el
 * día, el país, el formato y si es de casa; ya corrida, su ganador tras `Winner`, en lugar del `🏆` (3-d), o,
 * con la final en mi velo, `Finished · ready to watch`.
 */
function MemberRow({
  race,
  today,
  winner,
  finalHidden,
  selected,
}: {
  race: TeamPlanRace
  /** el día de la temporada, del calendario público */
  today: number | null
  /** Ganador de la carrera esta temporada, si ya se corrió (viene del calendario público). */
  winner: string | null
  /** la última etapa está en el velo de quien mira: llega sin ganador (sup. I4; E2, 9b) */
  finalHidden: boolean
  selected: boolean
}) {
  const meta = [
    formatGameDay(race.startDay, today),
    race.country,
    formatLabel(race.format as RaceFormat),
    race.natural ? 'Home race' : null,
  ]
    .filter((p) => p !== null)
    .join(' · ')
  return (
    <ActionRow
      title={
        <>
          {race.name}{' '}
          <span className="text-caption font-semibold text-ink-3">
            {raceClassLabel(race.raceClass as RaceClass)}
          </span>
        </>
      }
      meta={
        <>
          {meta}
          {winner !== null ? (
            <>
              {' · '}
              <span className="text-ink-3">Winner</span> {winner}
            </>
          ) : (
            finalHidden && (
              <>
                {' · '}
                <span className="font-semibold text-good">Finished · ready to watch</span>
              </>
            )
          )}
        </>
      }
      href={`/world/races/${race.raceId}`}
      {...(selected ? { done: { text: 'You ride', tone: 'accent' as const } } : {})}
    />
  )
}

/**
 * Vista de solo lectura para un corredor de la plantilla que no gestiona el equipo: el PLAN REAL de
 * su equipo, no todas las carreras abiertas a su división. Son las carreras a las que puede ser
 * convocado, así que es la respuesta a "¿dónde pueden mandarme?".
 */
function MemberCalendar({ plan }: { plan: TeamRacePlan }) {
  // El calendario público solo se usa para dos cosas: saber qué día es hoy y quién ganó cada carrera.
  const rev = useHorizonRev()
  const calendar = useQuery({
    queryKey: horizonKey(['calendar'], rev),
    queryFn: fetchCalendar,
    enabled: rev !== undefined,
  })
  const upcoming = useQuery({
    queryKey: horizonKey(['rider', 'upcoming'], rev),
    queryFn: fetchMyUpcomingRaces,
    enabled: rev !== undefined,
  })
  const [todasLasQueVienen, setTodasLasQueVienen] = useState(false)
  const [todasLasCorridas, setTodasLasCorridas] = useState(false)
  const horizon = useHorizon()
  const health = useHealth()

  // Los estados, con `QueryView` (E3, PR 10).
  if (calendar.data === undefined)
    return (
      <QueryView
        query={calendar}
        label="your team's calendar"
        skeleton={{ kind: 'rows', rowHeight: 44 }}
      />
    )

  const attending = plan.races.filter((r) => r.attending)
  const winnerOf = new Map(calendar.data.races.map((r) => [r.id, r.winner]))
  const stagesOf = new Map(calendar.data.races.map((r) => [r.id, Math.max(1, r.stages.length)]))
  // la carrera de final velado (sup. I4; 9b): solo del horizonte de quien mira (I-39)
  const hidden = (raceId: string): boolean =>
    finalVeiled(
      raceVeil(horizon.data, raceKeyOn(raceId, health.data?.gameDay)),
      stagesOf.get(raceId) ?? 1,
    )
  const today = calendar.data.dayOfSeason
  const mine = new Set((upcoming.data ?? []).map((r) => r.raceId))
  const past = today == null ? [] : attending.filter((r) => r.startDay < today).reverse()
  const ahead = today == null ? attending : attending.filter((r) => r.startDay >= today)
  const fila = (race: TeamPlanRace) => (
    <MemberRow
      key={race.raceId}
      race={race}
      today={today}
      winner={winnerOf.get(race.raceId) ?? null}
      finalHidden={hidden(race.raceId)}
      selected={mine.has(race.raceId)}
    />
  )
  // las filas, como las del plan del mánager: dos columnas desde 1.024
  const LISTA = 'divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0'

  return (
    <section className="space-y-4">
      <PageHeader title="Race calendar" status={teamStatus(plan.teamName, plan.teamCountry)} />
      <p className="text-meta text-ink-2">
        Your team&apos;s programme for the season — the races it plans to ride with a{' '}
        <strong>{plan.division}</strong> licence, and therefore the ones you can be called up to.
        The ones you are already in are marked. Picking the programme is the manager&apos;s job, and
        your team is run by the computer.
      </p>

      {/* lo que queda, la respuesta de la vista (§7.3), y lo ya corrido, cada uno en su `Panel`; las 20 primeras
          y `Show all N`, como toda lista (§6.1), y no las 10 de antes con su botón a mano */}
      <Panel title={`Still to come (${ahead.length})`} answer>
        {ahead.length === 0 ? (
          <EmptyState icon="race" text="The season is over — no races left." />
        ) : (
          <>
            <ul className={LISTA}>
              {(todasLasQueVienen ? ahead : ahead.slice(0, TOP_ROWS)).map(fila)}
            </ul>
            <ShowAllRows
              total={ahead.length}
              expanded={todasLasQueVienen}
              onToggle={() => setTodasLasQueVienen((t) => !t)}
            />
          </>
        )}
      </Panel>

      {past.length > 0 && (
        <Panel title={`Already raced (${past.length})`}>
          <ul className={LISTA}>{(todasLasCorridas ? past : past.slice(0, TOP_ROWS)).map(fila)}</ul>
          <ShowAllRows
            total={past.length}
            expanded={todasLasCorridas}
            onToggle={() => setTodasLasCorridas((t) => !t)}
          />
        </Panel>
      )}
    </section>
  )
}

export function TeamCalendar() {
  // Devuelve null si no gestiono ningún equipo: ese es el caso normal hoy (todos son bots).
  const rev = useHorizonRev()
  const draft = useQuery({
    queryKey: horizonKey(['team-calendar'], rev),
    queryFn: fetchTeamCalendar,
    enabled: rev !== undefined,
  })
  // Devuelve null si ni siquiera pertenezco a un equipo (agente libre).
  const plan = useQuery({ queryKey: ['team-race-plan'], queryFn: fetchTeamRacePlan })

  // Los estados, con `QueryView` (E3, PR 10): un fallo del plan ya no se pinta como «sin equipo», ni
  // uno del draft como la vista de miembro.
  if (draft.data === undefined)
    return (
      <QueryView
        query={draft}
        label="your team calendar"
        skeleton={{ kind: 'rows', rowHeight: 44 }}
      />
    )

  if (draft.data) return <ManagerPlanner data={draft.data} />

  if (plan.data === undefined)
    return (
      <QueryView
        query={plan}
        label="your team's race plan"
        skeleton={{ kind: 'rows', rowHeight: 44 }}
      />
    )

  if (!plan.data) {
    return (
      <section className="space-y-4">
        <PageHeader title="Race calendar" />
        <EmptyState
          icon="team"
          text="You do not belong to a team, so there is no team calendar. As a free agent you enter races yourself from My Rider, under My races."
          action={<Button to="/me/races">See your races</Button>}
        />
      </section>
    )
  }

  return <MemberCalendar plan={plan.data} />
}
