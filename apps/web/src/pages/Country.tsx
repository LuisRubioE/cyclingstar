import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { type CountryRider, fetchCountryRiders } from '../api/browse'
import { useOwnIds, useTeamsIdentity } from '../components/useTableIdentity'
import { NO_TEAM_LABEL, archetypeLabel } from '../domain/labels'
import { type TableIdentity, rowTeam } from '../domain/tableIdentity'
import { plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { RiderLabel } from '../components/ui/RiderLabel'

/** Una fila de la nación con su puesto, que la respuesta no trae: es su orden. */
interface Puesto {
  readonly r: CountryRider
  readonly puesto: number
}

/** El equipo y el tipo, `Andes Ruta · Climber` debajo del nombre hasta 640; los puntos, siempre (§6.1). */
const COLUMNAS: readonly RankTableColumn<Puesto>[] = [
  {
    key: 'team',
    header: 'Team',
    priority: 'secondary',
    clip: true,
    render: ({ r }) => r.teamName ?? NO_TEAM_LABEL,
  },
  {
    key: 'type',
    header: 'Type',
    priority: 'secondary',
    render: ({ r }) => archetypeLabel(r.archetype),
  },
  {
    key: 'pts',
    header: 'Pts',
    priority: 'primary',
    numeric: true,
    render: ({ r }) => r.seasonPoints.toLocaleString('en-US'),
  },
]

/**
 * LA NACIÓN (E3, docs/visual.md §6.1 y §6.2; PR 12b). En `RankTable`, sin desplazarse de lado ni cortar
 * el tipo: el puesto, el corredor con la bandera de la página (la fila no trae país: son todos de aquí) y
 * el maillot de su equipo de hoy, y los puntos. Las 20 primeras y `Show all`, con la fila propia anclada.
 */
function NationTable({
  rows,
  country,
  identity,
  ownRiderId,
}: {
  readonly rows: readonly CountryRider[]
  /** ISO 3166-1 alfa-2, el de la página */
  readonly country: string
  readonly identity: TableIdentity
  readonly ownRiderId: string | null
}) {
  return (
    <RankTable
      caption="National ranking: position, rider, team, type and points"
      rows={rows.map((r, i) => ({ r, puesto: i + 1 }))}
      rowKey={({ r }) => r.id}
      rank={({ puesto }) => puesto}
      identity={({ r }) => {
        const team = rowTeam(r.teamId, r.teamName, identity)
        return (
          <RiderLabel
            rider={{ id: r.id, name: r.name, human: !r.isBot, country }}
            {...(team === undefined ? {} : { team })}
            link={false}
            teamLine={false}
          />
        )
      }}
      href={({ r }) => `/world/riders/${r.id}`}
      columns={COLUMNAS}
      isOwn={({ r }) => r.id === ownRiderId}
      answer
    />
  )
}

/**
 * Ranking nacional (#7): corredores de un país por puntos de temporada.
 *
 * Con el sistema desde el 21k (E3, docs/visual.md §17.21): la cabecera en `PageHeader`, con su vuelta a los países
 * y, en su línea, cuántos corren y por qué se ordenan; donde iban la flecha de texto `← All nations`, de 20, y la
 * bandera de 28 en la barra de antes. La bandera, la de cada fila de la tabla (12b).
 */
export function Country() {
  const { code = '' } = useParams()
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['country', code], rev),
    queryFn: () => fetchCountryRiders(code),
    enabled: rev !== undefined,
  })
  // El maillot del equipo de hoy y la fila propia (§6.1 y §6.2; PR 12b).
  const identity = useTeamsIdentity()
  const own = useOwnIds()
  const info = COUNTRIES.find((c) => c.code === code.toUpperCase())

  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return (
      <QueryView query={query} label="this country" skeleton={{ kind: 'rows', rowHeight: 56 }} />
    )
  const data = query.data

  return (
    <section className="grid gap-4">
      <PageHeader
        title={info?.name ?? code.toUpperCase()}
        back={{ to: '/world/nations', label: 'Nations' }}
        status={`${plural(data.length, 'active rider')} · national ranking by season points`}
      />
      <VeilNotice kind="results" />

      {data.length === 0 ? (
        <EmptyState icon="rider" text="No active riders from this country yet." />
      ) : (
        <Panel title="National ranking" variant="bleed">
          <NationTable
            rows={data}
            country={code.toUpperCase()}
            identity={identity}
            ownRiderId={own.riderId}
          />
        </Panel>
      )}
    </section>
  )
}
