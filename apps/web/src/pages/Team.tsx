import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchTeam, fetchTeamControl, fetchTeamNews, takeOverTeam } from '../api/browse'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'
import { TeamManager } from '../components/TeamManager'

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

/** Distintivo de salud junto al nombre en la plantilla; los sanos no llevan (sin ruido). */
const HEALTH_BADGE: Record<string, { label: string; cls: string } | undefined> = {
  molestias: { label: 'Niggle', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  enfermo: { label: 'Ill', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  lesionado: { label: 'Injured', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

export function Team() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({
    queryKey: ['team', id],
    queryFn: () => fetchTeam(id),
  })
  const { data: control } = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })
  const teamNews = useQuery({ queryKey: ['team-news', id], queryFn: () => fetchTeamNews(id) })
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
    <section className="space-y-4">
      <Link to="/teams" className="text-xs text-slate-400 hover:text-slate-600">
        ← Teams
      </Link>
      <SectionBar
        action={
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              data.human ? 'bg-white/25 text-white' : 'bg-black/15 text-white'
            }`}
          >
            {data.human ? 'Player-managed' : 'NPC'}
          </span>
        }
      >
        {data.name}
      </SectionBar>
      <Panel bodyClassName="p-4">
        <div className="flex items-center gap-3">
          <Jersey seed={data.jerseySeed} size={44} />
          {data.country && <Flag code={data.country} size={30} />}
          <p className="text-sm text-slate-500">
            {DIVISION_LABEL[data.division] ?? data.division}
            {data.country
              ? ` · ${COUNTRIES.find((c) => c.code === data.country)?.name ?? data.country}`
              : ''}{' '}
            · {data.pointsSeason} season points · budget {data.budget.toLocaleString('en-US')}
          </p>
        </div>
      </Panel>

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

      <Panel title={`Roster (${data.roster.length})`} bodyClassName="p-0">
        <table className="w-full text-sm">
          <tbody>
            {data.roster.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="w-6 py-1.5 pl-4">
                  <Flag code={r.country} size={16} />
                </td>
                <td className="py-1.5">
                  {/* La bandera de cada corredor ya dice su nacionalidad; comparar con el país del
                      equipo hace obvio quién es extranjero, así que no hace falta etiqueta "abroad". */}
                  <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                  {HEALTH_BADGE[r.health] && (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-xs ring-1 ${HEALTH_BADGE[r.health]!.cls}`}
                    >
                      {HEALTH_BADGE[r.health]!.label}
                    </span>
                  )}
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
      </Panel>

      {teamNews.data && teamNews.data.length > 0 && (
        <Panel title="Recent news" bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            {teamNews.data.map((n, i) => (
              <li key={i} className="flex gap-3 px-5 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
                  Day {n.gameDay}
                </span>
                <span className="text-slate-700">{n.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  )
}
