import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type EnterableRace, enterRace, fetchEnterableRaces, withdrawRace } from '../api/raceEntry'
import { fetchRiderSummary } from '../api/rider'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'

/** Una carrera continental inscribible por un agente libre, con su coste de viaje y estado. */
function RaceRow({
  race,
  busy,
  onEnter,
  onWithdraw,
}: {
  race: EnterableRace
  busy: boolean
  onEnter: (id: string) => void
  onWithdraw: (id: string) => void
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-2 text-xs tabular-nums text-slate-400">GD {race.startDay}</td>
      <td className="px-2 py-2">
        <Link
          to={`/races/${race.raceId}`}
          className="font-medium text-slate-800 hover:text-indigo-600 hover:underline"
        >
          {race.name}
        </Link>
        <span className="ml-2 font-mono text-[11px] text-slate-400">.{race.raceClass}</span>
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
        <span className={race.affordable ? 'text-slate-700' : 'text-rose-600'}>
          {race.travelMoney}
        </span>
        {race.travelDays > 0 && (
          <span className="ml-1 text-xs text-slate-400">· {race.travelDays}d</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {race.enrolled ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Racing
          </span>
        ) : race.entered ? (
          <button
            onClick={() => onWithdraw(race.raceId)}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Withdraw
          </button>
        ) : (
          <button
            onClick={() => onEnter(race.raceId)}
            disabled={busy || !race.affordable}
            title={race.affordable ? 'Enter this race' : 'Not enough money for the trip'}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Enter
          </button>
        )}
      </td>
    </tr>
  )
}

export function RaceEntry() {
  const queryClient = useQueryClient()
  const summary = useQuery({ queryKey: ['rider-summary'], queryFn: fetchRiderSummary })
  const { data, isPending, isError } = useQuery({
    queryKey: ['race-entries'],
    queryFn: fetchEnterableRaces,
  })

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'enter' | 'withdraw' }) =>
      action === 'enter' ? enterRace(id) : withdrawRace(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['race-entries'] }),
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load races.</p>

  const hasTeam = summary.data?.teamId != null

  return (
    <section className="space-y-4">
      <SectionBar>Race entry</SectionBar>
      {hasTeam ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          You ride for a team, so your team convokes you for races. Self-entry is for free agents —
          riders without a contract.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            As a free agent you can enter continental races (.1/.2) yourself. You pay your own
            travel (transport + hotel) from your balance when the race convokes — so pick races you
            can afford and want to target. National championships you already qualify for
            automatically.
          </p>
          {summary.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Panel title="Balance">
                <p className="text-xl font-bold tabular-nums text-slate-800">
                  {summary.data.money.toLocaleString('en-US')}
                </p>
              </Panel>
              <Panel title="Committed travel">
                <p className="text-xl font-bold tabular-nums text-rose-600">
                  −
                  {data
                    .filter((r) => r.entered && !r.enrolled)
                    .reduce((s, r) => s + r.travelMoney, 0)
                    .toLocaleString('en-US')}
                </p>
              </Panel>
              <Panel title="Races entered">
                <p className="text-xl font-bold tabular-nums text-slate-800">
                  {data.filter((r) => r.entered).length}
                </p>
              </Panel>
            </div>
          )}
          {data.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No upcoming continental races left to enter this season.
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
                    <th className="px-3 py-2 text-right font-medium">Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((race) => (
                    <RaceRow
                      key={race.raceId}
                      race={race}
                      busy={mutate.isPending}
                      onEnter={(id) => mutate.mutate({ id, action: 'enter' })}
                      onWithdraw={(id) => mutate.mutate({ id, action: 'withdraw' })}
                    />
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </>
      )}
    </section>
  )
}
