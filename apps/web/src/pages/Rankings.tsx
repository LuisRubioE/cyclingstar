import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type AwardWinner,
  type RankingRow,
  type SeasonAwards,
  fetchRankings,
  fetchSeasonAwards,
  fetchYoungRankings,
} from '../api/rankings'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'
import { TabPanel } from '../components/Tabs'
import { useOwnIds, useTeamsIdentity } from '../components/useTableIdentity'
import { NO_TEAM_LABEL, archetypeLabel } from '../domain/labels'
import { type TableIdentity, rowTeam } from '../domain/tableIdentity'
import { horizonKey, useHorizonRev } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel as UiPanel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { RiderLabel } from '../components/ui/RiderLabel'
import { type TabOption, Tabs } from '../components/ui/Tabs'

/** Una fila del ranking con su puesto, que la respuesta no trae: es su orden. */
interface Puesto {
  readonly r: RankingRow
  readonly puesto: number
}

/** El equipo debajo del nombre hasta 640 y columna desde ahí; los puntos, siempre (§6.1). */
const COLUMNAS: readonly RankTableColumn<Puesto>[] = [
  {
    key: 'team',
    header: 'Team',
    priority: 'secondary',
    clip: true,
    render: ({ r }) => r.teamName ?? NO_TEAM_LABEL,
  },
  {
    key: 'pts',
    header: 'Pts',
    priority: 'primary',
    numeric: true,
    render: ({ r }) => r.points.toLocaleString('en-US'),
  },
]

/**
 * EL RANKING (E3, docs/visual.md §6.1 y §6.2; PR 12b). En `RankTable`: el puesto, el corredor con su
 * bandera y el maillot de su equipo de hoy (`identity`, de `GET /api/teams`), el equipo debajo hasta 640
 * y los puntos, con sus 12 px de margen (antes, `Northwind Cycling Team178`). Las 20 primeras y `Show
 * all`, con la fila propia anclada tras ellas.
 */
function RankingTable({
  caption,
  rows,
  identity,
  ownRiderId,
}: {
  readonly caption: string
  readonly rows: readonly RankingRow[]
  readonly identity: TableIdentity
  readonly ownRiderId: string | null
}) {
  if (rows.length === 0)
    return (
      <div className="px-3 sm:px-4">
        <EmptyState text="No points yet — they start rolling in once races are run." />
      </div>
    )
  return (
    <RankTable
      caption={caption}
      rows={rows.map((r, i) => ({ r, puesto: i + 1 }))}
      rowKey={({ r }) => r.riderId}
      rank={({ puesto }) => puesto}
      identity={({ r }) => {
        const team = rowTeam(r.teamId, r.teamName, identity)
        return (
          <RiderLabel
            rider={{ id: r.riderId, name: r.name, human: !r.isBot, country: r.country || null }}
            {...(team === undefined ? {} : { team })}
            link={false}
            teamLine={false}
          />
        )
      }}
      href={({ r }) => `/world/riders/${r.riderId}`}
      columns={COLUMNAS}
      isOwn={({ r }) => r.riderId === ownRiderId}
      answer
    />
  )
}

const AWARD_META: { key: keyof SeasonAwards; title: string; hint: string }[] = [
  { key: 'riderOfYear', title: 'Rider of the year', hint: 'Most season points' },
  { key: 'bestSprinter', title: 'Best sprinter', hint: 'Top points · sprinter' },
  { key: 'bestClimber', title: 'Best climber', hint: 'Top points · climber' },
  { key: 'revelation', title: 'Revelation', hint: 'Best rider aged 23 or under' },
]

function AwardCard({
  title,
  hint,
  winner,
}: {
  title: string
  hint: string
  winner: AwardWinner | null
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {winner ? (
        <>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Flag code={winner.country} size={16} />
            <Link to={`/world/riders/${winner.riderId}`} className="hover:underline">
              <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {archetypeLabel(winner.archetype)} · {winner.points.toLocaleString('en-US')} pts
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-slate-400">—</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">{hint}</p>
    </div>
  )
}

function AwardsPanel({ awards }: { awards: SeasonAwards }) {
  if (AWARD_META.every((m) => awards[m.key] === null)) return null
  return (
    <Panel title="Season awards">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AWARD_META.map((m) => (
          <AwardCard key={m.key} title={m.title} hint={m.hint} winner={awards[m.key]} />
        ))}
      </div>
    </Panel>
  )
}

type Pestana = 'overall' | 'young'

const PESTANAS: readonly TabOption<Pestana>[] = [
  { key: 'overall', label: 'World ranking' },
  { key: 'young', label: 'Young riders (U23)' },
]
const PANEL_RANKING = 'ranking'

export function Rankings() {
  const [tab, setTab] = useState<Pestana>('overall')
  const rev = useHorizonRev()
  const ranking = useQuery({
    queryKey: horizonKey(['rankings'], rev),
    queryFn: fetchRankings,
    enabled: rev !== undefined,
  })
  const young = useQuery({
    queryKey: horizonKey(['rankings-young'], rev),
    queryFn: fetchYoungRankings,
    enabled: tab === 'young' && rev !== undefined,
  })
  const awards = useQuery({
    queryKey: horizonKey(['season-awards'], rev),
    queryFn: fetchSeasonAwards,
    enabled: rev !== undefined,
  })
  // El maillot del equipo de hoy y la fila propia (§6.1 y §6.2; PR 12b).
  const identity = useTeamsIdentity()
  const own = useOwnIds()

  // Los estados, con `QueryView` (E3, PR 10): con toda la API en 500, la respuesta de la pantalla 42.
  // Nunca a la vez que la tabla, que es la respuesta de la 11.
  if (ranking.data === undefined)
    return (
      <QueryView
        query={ranking}
        label="the rankings"
        skeleton={{ kind: 'rows', rowHeight: 56 }}
        answer
      />
    )

  // solo la pestaña joven puede no haber llegado todavía
  const active = tab === 'young' ? young.data : ranking.data

  return (
    <section className="space-y-4">
      <SectionBar>Rankings</SectionBar>
      <VeilNotice kind="ranking" />
      <p className="text-sm text-slate-500">
        {tab === 'young'
          ? 'Points scored by riders aged 23 and under in the current season.'
          : 'Points scored over the last 12 months of racing — results drop out a year to the day after they were won.'}
      </p>

      {/* La respuesta, arriba (§2.2): los premios, que no lo son, van debajo. */}
      <UiPanel title="Ranking" variant="bleed">
        <Tabs
          label="Ranking"
          options={PESTANAS}
          value={tab}
          onChange={setTab}
          panelId={PANEL_RANKING}
        />
        <TabPanel panelId={PANEL_RANKING} active={tab} className="">
          {active === undefined ? (
            <div className="px-3 sm:px-4">
              <QueryView
                query={young}
                label="the young riders ranking"
                skeleton={{ kind: 'rows', rowHeight: 56 }}
                answer
              />
            </div>
          ) : (
            <RankingTable
              key={tab}
              caption={
                tab === 'young'
                  ? 'Young riders ranking (U23): position, country, rider, team and points'
                  : 'World ranking: position, country, rider, team and points'
              }
              rows={active}
              identity={identity}
              ownRiderId={own.riderId}
            />
          )}
        </TabPanel>
      </UiPanel>

      {awards.data && <AwardsPanel awards={awards.data} />}
    </section>
  )
}
