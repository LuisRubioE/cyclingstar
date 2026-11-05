import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchTeam } from '../api/browse'
import { fetchRiderSummary } from '../api/rider'
import { SquadTable } from '../components/SquadTable'
import { VeilNotice } from '../components/VeilNotice'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { TeamJersey } from '../components/ui/TeamJersey'
import { TextLink } from '../components/ui/TextLink'
import { plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'

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
 *
 * Con el sistema (E3, §17.21; PR 21l): la cabecera en `PageHeader`, con el equipo y su división, como la de
 * `Identity`; el maillot a 40 (`card`, §8.3) en su `Panel`, sin la bandera de al lado (6-f), con el país en
 * palabras, los corredores y los puntos, y la ficha pública en un `TextLink`. Iban la barra dorada, un panel
 * blanco a mano y la nota en `slate-400`.
 */

const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
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
        <PageHeader title="Squad" />
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
  const division = DIVISION_LABEL[team.data.division] ?? team.data.division
  const cifras = [
    ...(country ? [country.name] : []),
    plural(roster.length, 'rider'),
    `${team.data.pointsSeason.toLocaleString('en-US')} season points`,
  ].join(' · ')

  return (
    <section className="space-y-4">
      <PageHeader title="Squad" status={`${team.data.name} · ${division}`} />
      <VeilNotice kind="results" />

      <Panel ariaLabel={`${team.data.name} kit and figures`}>
        <div className="flex flex-wrap items-center gap-3">
          <TeamJersey team={{ name: team.data.name, kit: team.data.kit }} size={40} />
          <p className="text-meta text-ink-2">{cifras}</p>
          <TextLink to={`/world/teams/${team.data.id}`} layout="ml-auto">
            Public team page
          </TextLink>
        </div>
      </Panel>

      {/* La respuesta de la pantalla 14 (§7.3); los puntos los dice su columna, `Pts`. */}
      <Panel title={`Riders (${roster.length})`} variant="bleed">
        <SquadTable rows={roster} team={team.data} answer />
      </Panel>

      <p className="text-meta text-ink-2">
        Read-only for now: picking who races, signing and releasing riders is manager work, and no
        human manages a team yet.
      </p>
    </section>
  )
}
