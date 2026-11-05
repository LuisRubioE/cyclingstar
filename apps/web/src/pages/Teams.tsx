import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { type TeamListItem, fetchTeams } from '../api/browse'
import { TOP_ROWS } from '../components/ShowAll'
import { VeilNotice } from '../components/VeilNotice'
import { ActionRow } from '../components/ui/ActionRow'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { ShowAllRows, toggled } from '../components/ui/ShowAllRows'
import { TeamJersey } from '../components/ui/TeamJersey'
import { plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'

/**
 * LOS EQUIPOS, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21k): la cabecera en `PageHeader`;
 * cada división en su `Panel`, la primera la respuesta de la 21 (§7.3), y cada equipo, una `ActionRow` a su
 * ficha, con su nombre seguido de su maillot de 28 y sin bandera al lado (4-i, D-00c), y debajo su país en
 * palabras, sus puntos y sus corredores; sin equipos, su vacío, que contesta. Iban en tarjetas a
 * mano, con la marca de su división en cada una, que ya dice su `Panel`, y las cifras en `slate-400`, que no
 * se leía (axe, 224 faltas en la 21). Cada división, con sus 20 primeros y `Show all` (§6.1), que el 21k no
 * aplicó (PR 21l).
 */

const DIVISIONES: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'WT', label: 'World Tour' },
  { key: 'PRS', label: 'Pro Series' },
  { key: 'CON', label: 'Continental' },
]

/** En dos columnas desde 1.024, como el índice de carreras (21e). */
const LISTA = 'divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0'

function TeamRow({ t }: { t: TeamListItem }) {
  const pais =
    t.country === null ? null : (COUNTRIES.find((c) => c.code === t.country)?.name ?? t.country)
  const cifras = `${t.pointsSeason.toLocaleString('en-US')} pts · ${plural(t.riderCount, 'rider')}`
  return (
    <ActionRow
      href={`/world/teams/${t.id}`}
      title={
        <span className="flex items-center gap-2">
          {t.name}
          {/* su nombre va al lado: el maillot, para el ojo, que el lector no lo diga dos veces */}
          <span aria-hidden="true">
            <TeamJersey team={{ name: t.name, kit: t.kit }} size={28} />
          </span>
        </span>
      }
      meta={pais === null ? cifras : `${pais} · ${cifras}`}
    />
  )
}

export function Teams() {
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['teams'], rev),
    queryFn: fetchTeams,
    enabled: rev !== undefined,
  })
  // Las divisiones con todos sus equipos a la vista, pasados los 20 primeros (§6.1; PR 21l).
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set())
  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return <QueryView query={query} label="teams" skeleton={{ kind: 'rows', rowHeight: 44 }} />
  const data = query.data
  const divisiones = DIVISIONES.map((d) => ({
    ...d,
    teams: data.filter((t) => t.division === d.key),
  })).filter((d) => d.teams.length > 0)

  return (
    <section className="space-y-4">
      <PageHeader
        title="Teams"
        status={`${plural(data.length, 'team')} across the three divisions.`}
      />
      <VeilNotice kind="results" />
      {divisiones.length === 0 && <EmptyState icon="team" text="No teams yet." answer />}
      {divisiones.map((d, i) => {
        const todas = abiertas.has(d.key)
        return (
          <Panel key={d.key} title={d.label} answer={i === 0}>
            <ul className={LISTA}>
              {(todas ? d.teams : d.teams.slice(0, TOP_ROWS)).map((t) => (
                <TeamRow key={t.id} t={t} />
              ))}
            </ul>
            <ShowAllRows
              total={d.teams.length}
              expanded={todas}
              onToggle={() => setAbiertas((prev) => toggled(prev, d.key))}
            />
          </Panel>
        )
      })}
    </section>
  )
}
