import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchTeam, fetchTeamControl, takeOverTeam } from '../api/browse'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { RiderPortrait } from '../components/RiderPortrait'
import { TeamManager } from '../components/TeamManager'

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

export function Team() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['team', id],
    queryFn: () => fetchTeam(id),
  })
  const { data: control } = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })
  const takeOver = useMutation({
    mutationFn: takeOverTeam,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', id] })
      void queryClient.invalidateQueries({ queryKey: ['team-control'] })
      void queryClient.invalidateQueries({ queryKey: ['rider', 'me'] })
    },
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the team.</p>

  // Este es el equipo de mi ciclista, sigue siendo bot y soy premium ⇒ puedo tomar el control.
  const isMyTeam = control?.team?.id === data.id
  const canTakeOver = isMyTeam && !data.human && control?.premium === true

  return (
    <section className="space-y-6">
      <div>
        <Link to="/teams" className="text-xs text-slate-400 hover:text-slate-600">
          ← Teams
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <Jersey seed={data.jerseySeed} size={44} />
          {data.country && <Flag code={data.country} size={30} />}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {data.name}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  data.human ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {data.human ? 'Player-managed' : 'NPC'}
              </span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {DIVISION_LABEL[data.division] ?? data.division}
              {data.country
                ? ` · ${COUNTRIES.find((c) => c.code === data.country)?.name ?? data.country}`
                : ''}{' '}
              · {data.pointsSeason} season points · budget {data.budget.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>

      {canTakeOver && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <h2 className="text-sm font-semibold text-indigo-900">Take over this team</h2>
          <p className="mt-0.5 text-sm text-indigo-800">
            This is your rider&apos;s team and it&apos;s still bot-run. As a premium account you can
            take control and manage it — later you&apos;ll be able to rename it and change its
            country and jersey.
          </p>
          <button
            type="button"
            onClick={() => takeOver.mutate()}
            disabled={takeOver.isPending}
            className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {takeOver.isPending ? 'Taking over…' : 'Take control'}
          </button>
          {takeOver.isError && (
            <p className="mt-2 text-sm text-red-600">Could not take over the team. Try again.</p>
          )}
        </div>
      )}
      {isMyTeam && data.human && control?.team?.ownedByMe && <TeamManager team={data} />}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Roster ({data.roster.length})
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {data.roster.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="w-9 py-1.5 pl-4">
                  <RiderPortrait seed={r.id} size={28} />
                </td>
                <td className="w-6 py-1.5">
                  <Flag code={r.country} size={16} />
                </td>
                <td className="py-1.5">
                  <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                </td>
                <td className="py-1.5 text-slate-500">
                  {VOCATION_LABELS[r.archetype as Vocation] ?? r.archetype}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-slate-400">
                  {r.seasonPoints} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
