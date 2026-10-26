import { COUNTRIES } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchTeam, fetchTeamControl, fetchTeamNews, takeOverTeam } from '../api/browse'
import { Flag } from '../components/Flag'
import { DiagnosticStrip } from '../components/StageGate'
import { Jersey } from '../components/Jersey'
import { Panel, SectionBar } from '../components/Panel'
import { SquadTable } from '../components/SquadTable'
import { TeamFeed } from '../components/TeamFeed'
import { TeamManager } from '../components/TeamManager'
import { diagOf, horizonKey, useHorizonRev, useWatchOn } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { Panel as UiPanel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

export function Team() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['team', id], rev),
    queryFn: () => fetchTeam(id),
    enabled: rev !== undefined,
  })
  const { data: control } = useQuery({ queryKey: ['team-control'], queryFn: fetchTeamControl })
  // El modo diagnóstico del feed del equipo (§11.15; 9b): `?diag=1` de un administrador.
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const teamNews = useQuery({
    queryKey: horizonKey(['team-news', id, diag], rev),
    queryFn: () => fetchTeamNews(id, { diag }),
    enabled: rev !== undefined,
  })
  const veiled = (teamNews.data ?? []).some((n) => n.kind === 'stage_ready')
  // solo para `Diagnostic view`: el feed del equipo no cambia con `Watch` (`needWatch` falso)
  const { isAdmin } = useWatchOn(diag || veiled, false)
  const diagOn = diag && isAdmin
  const takeOver = useMutation({
    mutationFn: takeOverTeam,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', id] })
      void queryClient.invalidateQueries({ queryKey: ['team-control'] })
      void queryClient.invalidateQueries({ queryKey: ['rider', 'me'] })
    },
  })
  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return <QueryView query={query} label="the team" skeleton={{ kind: 'rows', rowHeight: 56 }} />
  const data = query.data

  // Este es el equipo de mi ciclista, sigue siendo bot y soy premium ⇒ puedo tomar el control.
  const isMyTeam = control?.team?.id === data.id
  const canTakeOver = isMyTeam && !data.human && control?.premium === true

  return (
    <section className="space-y-4">
      <Link to="/world/teams" className="text-xs text-slate-400 hover:text-slate-600">
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
      <VeilNotice kind="results" />
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

      {/* La plantilla, la de `My Team → Squad` (§6.1; PR 12b): la respuesta de la pantalla 12. */}
      <UiPanel title={`Roster (${data.roster.length})`} variant="bleed">
        <SquadTable rows={data.roster} team={data} answer />
      </UiPanel>

      {teamNews.data && teamNews.data.length > 0 && (
        <Panel
          title="Recent news"
          bodyClassName="p-0"
          action={
            !diag && isAdmin && veiled ? (
              <Link
                to={`/world/teams/${id}?diag=1`}
                className="text-xs text-white/80 hover:text-white"
              >
                Diagnostic view
              </Link>
            ) : undefined
          }
        >
          {diagOn && <DiagnosticStrip exitHref={`/world/teams/${id}`} />}
          <TeamFeed items={teamNews.data} padding="px-5" />
        </Panel>
      )}
    </section>
  )
}
