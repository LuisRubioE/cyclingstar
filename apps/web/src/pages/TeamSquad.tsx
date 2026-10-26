import { COUNTRIES, HEALTH_STATES, type HealthState } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type TeamRider, fetchTeam } from '../api/browse'
import { fetchRiderSummary } from '../api/rider'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'
import { Panel, SectionBar } from '../components/Panel'
import { HEALTH_LOOK, isOut } from '../domain/health'
import { archetypeLabel } from '../domain/labels'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel as UiPanel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../components/ui/RankTable'
import { RiderLabel } from '../components/ui/RiderLabel'
import { horizonKey, useHorizonRev } from '../queryClient'
import { VeilNotice } from '../components/VeilNotice'

/**
 * `My Team → Squad` (docs/navegacion.md §3.4): mis compañeros de equipo, en SOLO LECTURA.
 *
 * Es la pestaña que da sentido a `My Team` para un corredor de a pie: hoy no hay mánagers humanos,
 * pero sí compañeros, y saber quiénes son —su especialidad, su nivel y lo que han ganado— es lo que
 * explica qué papel me toca a mí en la carretera.
 *
 * Cada compañero enlaza a su ficha, con su nivel, sus resultados y su palmarés: la celda de identidad
 * entera es el enlace (E3, docs/visual.md §6.1; PR 12b), y el desplegable `Detail` de antes, que pedía
 * eso mismo de las rutas públicas, ya no hace falta.
 */

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

/** El estado de salud de la respuesta, si es uno de los cuatro. */
const esEstado = (s: string): s is HealthState => (HEALTH_STATES as readonly string[]).includes(s)

/**
 * La salud en `Chip`, solo si no está sano, para no meter ruido: `Niggle` en `warn`; `Ill` e `Injured`,
 * fuera de combate, en `bad`. Las palabras, las de la ficha (`HEALTH_LOOK`).
 */
function healthChip(health: string) {
  if (!esEstado(health) || health === 'sano') return null
  return <Chip tone={isOut(health) ? 'bad' : 'warn'}>{HEALTH_LOOK[health].label}</Chip>
}

/** El papel y los puntos debajo del nombre hasta 640, y la salud hasta 1.024 (§6.1). */
const COLUMNAS: readonly RankTableColumn<TeamRider>[] = [
  {
    key: 'role',
    header: 'Role',
    priority: 'secondary',
    render: (r) => archetypeLabel(r.archetype),
  },
  {
    key: 'pts',
    header: 'Pts',
    priority: 'secondary',
    numeric: true,
    render: (r) => r.seasonPoints.toLocaleString('en-US'),
    second: (r) => `${r.seasonPoints.toLocaleString('en-US')} pts`,
  },
  { key: 'health', header: 'Health', priority: 'optional', render: (r) => healthChip(r.health) },
]

/**
 * LA PLANTILLA (E3, docs/visual.md §6.1 y §6.2; PR 12b): la de la ficha del equipo y la de `My Team →
 * Squad`. En `RankTable` sin puesto, con todas las filas y sin fila propia: el corredor con su bandera,
 * que ya dice quién es extranjero, y el maillot del equipo de la ficha; la celda entera enlaza a su ficha.
 */
export function SquadTable({
  rows,
  team,
  answer = false,
}: {
  readonly rows: readonly TeamRider[]
  /** el equipo de la ficha: su nombre y la semilla de su dibujo */
  readonly team: { readonly name: string; readonly jerseySeed: string }
  /** la tabla que contesta a la pantalla (§7.3) */
  readonly answer?: boolean
}) {
  const kit = { name: team.name, legacySeed: team.jerseySeed }
  return (
    <RankTable
      caption={`${team.name} roster: rider, role, season points and health`}
      rows={rows}
      rowKey={(r) => r.id}
      identity={(r) => (
        <RiderLabel
          rider={{ id: r.id, name: r.name, human: !r.isBot, country: r.country || null }}
          team={kit}
          link={false}
          teamLine={false}
        />
      )}
      href={(r) => `/world/riders/${r.id}`}
      columns={COLUMNAS}
      all
      answer={answer}
    />
  )
}

export function TeamSquad() {
  const rev = useHorizonRev()
  const summary = useQuery({
    queryKey: horizonKey(['rider', 'summary'], rev),
    queryFn: fetchRiderSummary,
    enabled: rev !== undefined,
  })
  const teamId = summary.data?.teamId ?? null
  const team = useQuery({
    queryKey: horizonKey(['team', teamId], rev),
    queryFn: () => fetchTeam(teamId!),
    enabled: teamId != null && rev !== undefined,
  })

  // Los estados, con `QueryView` (E3, PR 10): un fallo del resumen ya no se pinta como «agente libre».
  if (summary.data === undefined)
    return (
      <QueryView query={summary} label="your rider" skeleton={{ kind: 'rows', rowHeight: 56 }} />
    )

  // Sin equipo no hay plantilla que enseñar. Las ofertas viven en My Rider → Contract, siempre en
  // el mismo sitio tenga equipo o no (principio 7 de docs/navegacion.md). Es la respuesta de la
  // pantalla 43.
  if (!teamId) {
    return (
      <section className="space-y-4">
        <SectionBar>Squad</SectionBar>
        <EmptyState
          icon="team"
          text="You are a free agent, so you have no teammates yet. Any contract offer you receive shows up in My Rider, under Contract."
          action={<Button to="/me/contract">See your contract offers</Button>}
          answer
        />
      </section>
    )
  }

  if (team.data === undefined)
    return <QueryView query={team} label="your team" skeleton={{ kind: 'rows', rowHeight: 56 }} />

  const roster = [...team.data.roster].sort((a, b) => b.seasonPoints - a.seasonPoints)
  const country = COUNTRIES.find((c) => c.code === team.data.country)

  return (
    <section className="space-y-4">
      <SectionBar>Squad · {team.data.name}</SectionBar>
      <VeilNotice kind="results" />

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Jersey seed={team.data.jerseySeed} size={40} />
          {team.data.country && <Flag code={team.data.country} size={26} />}
          <p className="text-sm text-slate-500">
            {DIVISION_LABEL[team.data.division] ?? team.data.division}
            {country ? ` · ${country.name}` : ''} · {roster.length} riders ·{' '}
            {team.data.pointsSeason.toLocaleString('en-US')} season points
          </p>
          <Link
            to={`/world/teams/${team.data.id}`}
            className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Public team page →
          </Link>
        </div>
      </Panel>

      {/* La respuesta de la pantalla 14 (§7.3); los puntos los dice su columna, `Pts`. */}
      <UiPanel title={`Riders (${roster.length})`} variant="bleed">
        <SquadTable rows={roster} team={team.data} answer />
      </UiPanel>

      <p className="text-xs text-slate-400">
        Read-only for now: picking who races, signing and releasing riders is manager work, and no
        human manages a team yet.
      </p>
    </section>
  )
}
