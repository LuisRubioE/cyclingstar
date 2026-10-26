import { TRANSPORT_COST, seasonPosition } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { TOP_ROWS } from '../components/ShowAll'
import { formatLabel, raceClassLabel, travelDaysLabel } from '../domain/labels'
import { finalVeiled, raceKeyOn, raceVeil } from '../domain/veil'
import { formatGameDay } from '../domain/words'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { QueryView } from '../components/ui/QueryView'
import { ShowAllRows } from '../components/ui/ShowAllRows'
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
      <SectionBar>Race calendar · {data.teamName}</SectionBar>
      <p className="text-sm text-slate-500">
        Your team&apos;s <strong>home races</strong> are planned by default — for a continental
        team, every continental race in its region. <strong>Add</strong> races to travel further
        afield, or <strong>Drop</strong> ones you want to skip. Travel (transport + hotel) is
        charged to the team budget per rider when each race convokes.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Panel title="Races planned">
          <p className="text-2xl font-bold tabular-nums text-slate-800">{draftedCount}</p>
        </Panel>
        <Panel title="Planned travel cost">
          <p className="text-2xl font-bold tabular-nums text-slate-800">{plannedCost}</p>
        </Panel>
        <Panel title="Based in">
          <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            {data.teamCountry && <Flag code={data.teamCountry} size={18} />}
            {data.teamCountry ?? '—'}
          </span>
        </Panel>
      </div>

      {/* las cifras en `title` y con sus tokens (E3, PR 12a): en `text-xl`, el presupuesto se salía 3 px de su
          tarjeta a 320; y en 18 px ya no es letra grande, así que `emerald-600` (3,67:1) no llega: `good` */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel title="Budget">
          <p className="text-title font-bold tabular-nums text-ink">
            {data.budget.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly income">
          <p className="text-title font-bold tabular-nums text-good">
            +{data.weeklyIncome.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly wages">
          <p className="text-title font-bold tabular-nums text-bad">
            −{data.weeklyWages.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly net">
          <p
            className={`text-title font-bold tabular-nums ${data.weeklyNet >= 0 ? 'text-good' : 'text-bad'}`}
          >
            {data.weeklyNet >= 0 ? '+' : '−'}
            {Math.abs(data.weeklyNet).toLocaleString('en-US')}
          </p>
        </Panel>
      </div>
      <p className="text-xs text-slate-400">
        Sponsors pay a fixed weekly income; wages are your riders&apos; salaries (plus any housing
        you cover). Travel is charged on top when each race convokes — so a busy calendar of far
        races eats into the budget faster.
      </p>

      {data.races.length === 0 ? (
        <EmptyState icon="race" text="No upcoming races left to plan this season." />
      ) : (
        // las filas con su acción (E3, PR 12a): `Add` y `Drop` vuelven a verse y a tocarse, y las 20 primeras
        <Panel title="Race plan" bodyClassName="px-3 pb-3">
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
        </Panel>
      )}
    </section>
  )
}

/** Cuántas carreras ya corridas se ven antes de "Show all" (§7.3). */
const PAST_PREVIEW = 10

/** Una fila de la vista de miembro: solo lectura, con la marca de "voy yo". */
function MemberRow({
  race,
  winner,
  finalHidden,
  selected,
  past,
}: {
  race: TeamPlanRace
  /** Ganador de la carrera esta temporada, si ya se corrió (viene del calendario público). */
  winner: string | null
  /** la última etapa está en el velo de quien mira: llega sin ganador (sup. I4; E2, 9b) */
  finalHidden: boolean
  selected: boolean
  past: boolean
}) {
  return (
    <li className={past ? 'opacity-60' : ''}>
      <Link
        to={`/world/races/${race.raceId}`}
        className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 ${
          selected ? 'bg-brand-cyan/5' : ''
        }`}
      >
        <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
          GD {race.startDay}
        </span>
        {race.country ? (
          <Flag code={race.country} size={16} />
        ) : (
          <span className="inline-block w-4 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
          {race.name}
          <span className="ml-2 font-mono text-[11px] font-normal text-slate-400">
            {raceClassLabel(race.raceClass as RaceClass)}
          </span>
          {race.natural && (
            <span
              className="ml-2 rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
              title="Home race — part of your team's natural calendar"
            >
              home
            </span>
          )}
        </span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-slate-400 md:block">
          {formatLabel(race.format as RaceFormat)}
        </span>
        <span className="w-24 shrink-0 text-right text-xs">
          {selected ? (
            <span className="rounded bg-brand-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              You ride
            </span>
          ) : winner ? (
            <span className="truncate text-amber-700">🏆 {winner}</span>
          ) : finalHidden ? (
            <span className="truncate text-emerald-700">Finished · ready to watch</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
      </Link>
    </li>
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
  const [showAllPast, setShowAllPast] = useState(false)
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
  const shownPast = showAllPast ? past : past.slice(0, PAST_PREVIEW)

  return (
    <section className="space-y-4">
      <SectionBar>Race calendar · {plan.teamName}</SectionBar>
      <p className="text-sm text-slate-500">
        Your team&apos;s programme for the season — the races it plans to ride with a{' '}
        <strong>{plan.division}</strong> licence, and therefore the ones you can be called up to.
        The ones you are already in are marked. Picking the programme is the manager&apos;s job, and
        your team is run by the computer.
      </p>

      <Panel title={`Still to come (${ahead.length})`} bodyClassName="p-0">
        {ahead.length === 0 ? (
          <div className="px-4">
            <EmptyState icon="race" text="The season is over — no races left." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ahead.map((race) => (
              <MemberRow
                key={race.raceId}
                race={race}
                winner={winnerOf.get(race.raceId) ?? null}
                finalHidden={hidden(race.raceId)}
                selected={mine.has(race.raceId)}
                past={false}
              />
            ))}
          </ul>
        )}
      </Panel>

      {past.length > 0 && (
        <Panel title={`Already raced (${past.length})`} bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            {shownPast.map((race) => (
              <MemberRow
                key={race.raceId}
                race={race}
                winner={winnerOf.get(race.raceId) ?? null}
                finalHidden={hidden(race.raceId)}
                selected={mine.has(race.raceId)}
                past
              />
            ))}
          </ul>
          {past.length > PAST_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllPast((v) => !v)}
              className="w-full border-t border-slate-100 py-2 text-xs font-medium text-indigo-600 transition hover:bg-slate-50"
            >
              {showAllPast ? 'Show fewer' : `Show all ${past.length}`}
            </button>
          )}
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
        <SectionBar>Race calendar</SectionBar>
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
