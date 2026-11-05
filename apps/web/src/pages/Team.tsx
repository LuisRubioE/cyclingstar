import { COUNTRIES, parseKit } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchTeam, fetchTeamControl, fetchTeamNews, takeOverTeam } from '../api/browse'
import { DiagnosticStrip } from '../components/StageGate'
import { wornTeam } from '../components/ui/TeamJersey'
import { Panel } from '../components/Panel'
import { SquadTable } from '../components/SquadTable'
import { TeamFeed } from '../components/TeamFeed'
import { bibWords, kitWords } from '../domain/labels'
import { diagOf, horizonKey, useHorizonRev, useWatchOn } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { Button } from '../components/ui/Button'
import { KitShowcase } from '../components/ui/KitShowcase'
import { PageHeader } from '../components/ui/PageHeader'
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

  // La línea de estado (E3, §8.10): la división, el país y quién lo lleva; la bandera de al lado se va
  // (D-00c). El maillot a 160, y a su derecha las cifras y el maillot en palabras; sus vistas, en la
  // `Sheet` que abre al tocarlo, porque con las pestañas la plantilla bajaba a 544 px (8-x).
  const status = [
    DIVISION_LABEL[data.division] ?? data.division,
    ...(data.country === null
      ? []
      : [COUNTRIES.find((c) => c.code === data.country)?.name ?? data.country]),
    data.human ? 'Player-managed' : 'NPC',
  ].join(' · ')
  const kit = data.kit === null ? null : parseKit(data.kit)

  return (
    <section className="space-y-4">
      <PageHeader title={data.name} back={{ to: '/world/teams', label: 'Teams' }} status={status} />
      <VeilNotice kind="results" />
      <UiPanel ariaLabel={`${data.name} kit`}>
        <KitShowcase
          team={wornTeam(data.name, data.kit, data.jerseySeed)}
          bib={data.bib}
          variant="compact"
        >
          <p>{data.pointsSeason.toLocaleString('en-US')} season points</p>
          <p>Budget {data.budget.toLocaleString('en-US')}</p>
          {kit !== null && <p>{kitWords(kit)}</p>}
          {kit !== null && <p>{bibWords(kit, data.bib)}</p>}
        </KitShowcase>
      </UiPanel>

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
      {/* El nombre, el país y el maillot se cambian en `My Team → Identity`, con un solo guardado (E3,
          docs/visual.md §8.7; 18b, 8-h). */}
      {isMyTeam && data.human && control?.team?.ownedByMe && (
        <Button to="/team/identity">Edit name, country and kit</Button>
      )}

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
