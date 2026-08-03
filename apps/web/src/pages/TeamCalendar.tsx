import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  type TeamCalendarRace,
  draftRace,
  fetchTeamCalendar,
  undraftRace,
} from '../api/teamCalendar'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'

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
          to={`/races/${race.raceId}`}
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

export function TeamCalendar() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['team-calendar'],
    queryFn: fetchTeamCalendar,
  })

  const mutate = useMutation({
    mutationFn: ({ id, drafted }: { id: string; drafted: boolean }) =>
      drafted ? undraftRace(id) : draftRace(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['team-calendar'] }),
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the team calendar.</p>

  if (!data) {
    return (
      <section className="space-y-4">
        <SectionBar>Race program</SectionBar>
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          You don't manage a team. Take over your rider's team (premium) to plan its race calendar.
        </p>
      </section>
    )
  }

  const draftedCount = data.races.filter((r) => r.drafted).length
  const plannedCost = data.races
    .filter((r) => r.drafted)
    .reduce((sum, r) => sum + r.travelPerRider * r.squad, 0)

  return (
    <section className="space-y-4">
      <SectionBar>Race program · {data.teamName}</SectionBar>
      <p className="text-sm text-slate-500">
        Your team's <strong>home races</strong> are planned by default — for a continental team,
        every continental race in its region. <strong>Add</strong> races to travel further afield,
        or <strong>Drop</strong> ones you want to skip. Travel (transport + hotel) is charged to the
        team budget per rider when each race convokes.
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
        Sponsors pay a fixed weekly income; wages are your riders' salaries (plus any housing you
        cover). Travel is charged on top when each race convokes — so a busy calendar of far races
        eats into the budget faster.
      </p>

      {data.races.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
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
