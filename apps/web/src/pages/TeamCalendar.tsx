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
import { formatLabel, raceClassLabel } from '../domain/labels'

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

/** Una carrera elegible para el plan del equipo, con su coste de viaje total estimado. */
function RaceRow({
  race,
  busy,
  onToggle,
}: {
  race: TeamCalendarRace
  busy: boolean
  onToggle: (race: TeamCalendarRace) => void
}) {
  const total = race.travelPerRider * race.squad
  return (
    <tr
      className={`border-b border-slate-100 last:border-0 ${race.drafted ? 'bg-brand-cyan/5' : ''}`}
    >
      <td className="px-3 py-2 text-xs tabular-nums text-slate-400">GD {race.startDay}</td>
      <td className="px-2 py-2">
        <Link
          to={`/world/races/${race.raceId}`}
          className="font-medium text-slate-800 hover:text-indigo-600 hover:underline"
        >
          {race.name}
        </Link>
        <span className="ml-2 font-mono text-[11px] text-slate-400">.{race.raceClass}</span>
        {race.natural && (
          <span
            className="ml-2 rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
            title="Home race — part of your team's natural calendar"
          >
            home
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        {race.country && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Flag code={race.country} size={14} />
            {race.country}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">
        <span
          className={race.travelTier === 'intercontinental' ? 'text-rose-600' : 'text-slate-700'}
        >
          {total}
        </span>
        <span className="ml-1 text-xs text-slate-400">
          ({race.travelPerRider}×{race.squad})
        </span>
        {race.travelTier === 'intercontinental' && (
          <span
            className="ml-1 text-xs font-medium text-rose-500"
            title="Overseas trip — expensive"
          >
            ✈
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => onToggle(race)}
          disabled={busy}
          className={
            race.drafted
              ? 'rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'
              : 'rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60'
          }
        >
          {race.drafted ? 'Drop' : 'Add'}
        </button>
      </td>
    </tr>
  )
}

/** El planificador del mánager: elige a qué carreras va el equipo y paga el viaje. */
function ManagerPlanner({ data }: { data: TeamCalendarData }) {
  const queryClient = useQueryClient()
  const mutate = useMutation({
    mutationFn: ({ id, drafted }: { id: string; drafted: boolean }) =>
      drafted ? undraftRace(id) : draftRace(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['team-calendar'] }),
  })

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel title="Budget">
          <p className="text-xl font-bold tabular-nums text-slate-800">
            {data.budget.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly income">
          <p className="text-xl font-bold tabular-nums text-emerald-600">
            +{data.weeklyIncome.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly wages">
          <p className="text-xl font-bold tabular-nums text-rose-600">
            −{data.weeklyWages.toLocaleString('en-US')}
          </p>
        </Panel>
        <Panel title="Weekly net">
          <p
            className={`text-xl font-bold tabular-nums ${data.weeklyNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
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
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No upcoming races left to plan this season.
        </p>
      ) : (
        <Panel bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-2 py-2 font-medium">Race</th>
                <th className="px-2 py-2 font-medium">Where</th>
                <th className="px-2 py-2 text-right font-medium">Travel</th>
                <th className="px-3 py-2 text-right font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {data.races.map((race) => (
                <RaceRow
                  key={race.raceId}
                  race={race}
                  busy={mutate.isPending}
                  onToggle={(r) => mutate.mutate({ id: r.raceId, drafted: r.drafted })}
                />
              ))}
            </tbody>
          </table>
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
  selected,
  past,
}: {
  race: TeamPlanRace
  /** Ganador de la carrera esta temporada, si ya se corrió (viene del calendario público). */
  winner: string | null
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
  const calendar = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })
  const upcoming = useQuery({ queryKey: ['rider', 'upcoming'], queryFn: fetchMyUpcomingRaces })
  const [showAllPast, setShowAllPast] = useState(false)

  if (calendar.isPending) return <p className="text-slate-500">Loading…</p>
  if (calendar.isError)
    return <p className="text-red-600">Could not load your team&apos;s calendar.</p>

  const attending = plan.races.filter((r) => r.attending)
  const winnerOf = new Map(calendar.data.races.map((r) => [r.id, r.winner]))
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
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            The season is over — no races left.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ahead.map((race) => (
              <MemberRow
                key={race.raceId}
                race={race}
                winner={winnerOf.get(race.raceId) ?? null}
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
  const draft = useQuery({ queryKey: ['team-calendar'], queryFn: fetchTeamCalendar })
  // Devuelve null si ni siquiera pertenezco a un equipo (agente libre).
  const plan = useQuery({ queryKey: ['team-race-plan'], queryFn: fetchTeamRacePlan })

  if (draft.isPending || plan.isPending) return <p className="text-slate-500">Loading…</p>

  if (draft.data) return <ManagerPlanner data={draft.data} />

  if (!plan.data) {
    return (
      <section className="space-y-4">
        <SectionBar>Race calendar</SectionBar>
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          You do not belong to a team, so there is no team calendar. As a free agent you enter races
          yourself from{' '}
          <Link to="/me/races" className="font-medium text-indigo-600 hover:underline">
            My Rider → My races
          </Link>
          .
        </p>
      </section>
    )
  }

  return <MemberCalendar plan={plan.data} />
}
