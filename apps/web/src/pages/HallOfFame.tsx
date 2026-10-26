import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  type HallOfFameRow,
  type RecordEntry,
  fetchHallOfFame,
  fetchRecords,
} from '../api/rankings'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'
import { useOwnIds, useTeamsIdentity } from '../components/useTableIdentity'
import { type TableIdentity, rowTeam } from '../domain/tableIdentity'
import { plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel as UiPanel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { RiderLabel } from '../components/ui/RiderLabel'

function RecordCard({
  title,
  entry,
  unit,
}: {
  title: string
  entry: RecordEntry | null
  unit: string
}) {
  return (
    <Panel title={title}>
      {entry ? (
        <>
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-slate-800">{entry.value}</span>
            <span className="text-xs text-slate-400">{unit}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Flag code={entry.country} size={14} />
            <Link to={`/world/riders/${entry.riderId}`} className="hover:underline">
              <RiderName riderId={entry.riderId} name={entry.name} isBot={entry.isBot} />
            </Link>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{entry.note}</p>
        </>
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </Panel>
  )
}

/** Una fila del salón con su puesto, que la respuesta no trae: es su orden. */
interface Puesto {
  readonly r: HallOfFameRow
  readonly puesto: number
}

/**
 * Las victorias por clase: `Overall` y `Stages` son columna desde 640, y `Mountains` y `Points` desde
 * 1.024; antes, en el segundo renglón y con su palabra, `2 overall · 4 stages · 0 mountains · 0 points`
 * (§6.1), que parte de línea y no se corta. `Total`, siempre.
 */
const COLUMNAS: readonly RankTableColumn<Puesto>[] = [
  {
    key: 'gc',
    header: 'Overall',
    priority: 'secondary',
    numeric: true,
    render: ({ r }) => r.gc,
    second: ({ r }) => `${r.gc} overall`,
  },
  {
    key: 'stage',
    header: 'Stages',
    priority: 'secondary',
    numeric: true,
    render: ({ r }) => r.stage,
    second: ({ r }) => plural(r.stage, 'stage'),
  },
  {
    key: 'kom',
    header: 'Mountains',
    priority: 'optional',
    numeric: true,
    render: ({ r }) => r.kom,
    second: ({ r }) => plural(r.kom, 'mountain'),
  },
  {
    key: 'points',
    header: 'Points',
    priority: 'optional',
    numeric: true,
    render: ({ r }) => r.points,
    second: ({ r }) => plural(r.points, 'point'),
  },
  { key: 'total', header: 'Total', priority: 'primary', numeric: true, render: ({ r }) => r.total },
]

/**
 * EL SALÓN DE LA FAMA (E3, docs/visual.md §6.1 y §6.2; PR 12b). En `RankTable`, sin desplazarse de lado:
 * el puesto, el corredor con su bandera y el maillot de su equipo de hoy (el palmarés no guarda con cuál
 * ganó), sin el equipo debajo, y el total. Las 20 primeras y `Show all`, con la fila propia anclada.
 */
function HallOfFameTable({
  rows,
  identity,
  ownRiderId,
}: {
  readonly rows: readonly HallOfFameRow[]
  readonly identity: TableIdentity
  readonly ownRiderId: string | null
}) {
  return (
    <RankTable
      caption="Hall of fame: position, country, rider, wins by kind and total wins"
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

/** Salón de la fama (#58/#62): corredores por palmarés total de todas las temporadas. */
export function HallOfFame() {
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['hall-of-fame'], rev),
    queryFn: fetchHallOfFame,
    enabled: rev !== undefined,
  })
  const records = useQuery({
    queryKey: horizonKey(['records'], rev),
    queryFn: fetchRecords,
    enabled: rev !== undefined,
  })
  // El maillot del equipo de hoy y la fila propia (§6.1 y §6.2; PR 12b).
  const identity = useTeamsIdentity()
  const own = useOwnIds()

  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return (
      <QueryView
        query={query}
        label="the hall of fame"
        skeleton={{ kind: 'rows', rowHeight: 56 }}
      />
    )
  const data = query.data

  const rec = records.data
  const hasRecords = rec && (rec.mostWins || rec.mostGcWins || rec.youngestWinner)

  return (
    <section className="space-y-4">
      <SectionBar>Hall of Fame</SectionBar>
      <VeilNotice kind="results" />
      <p className="text-sm text-slate-500">
        The most decorated riders of the world, by all-time wins across every season.
      </p>

      {/* La respuesta, arriba (§2.2): los récords, que no lo son, van debajo. */}
      {data.length === 0 ? (
        <EmptyState text="No honours yet — win a race and you'll be the first name here." />
      ) : (
        <UiPanel title="All-time honours" variant="bleed">
          <HallOfFameTable rows={data} identity={identity} ownRiderId={own.riderId} />
        </UiPanel>
      )}

      {hasRecords && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            All-time records
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <RecordCard title="Most wins" entry={rec.mostWins} unit="wins" />
            <RecordCard title="Most overall wins" entry={rec.mostGcWins} unit="GC" />
            <RecordCard title="Youngest overall winner" entry={rec.youngestWinner} unit="yrs" />
          </div>
        </div>
      )}
    </section>
  )
}
