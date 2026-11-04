import { CONTINENTS, COUNTRIES, type Continent, continentForCountry } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { type CountrySummary, fetchCountries } from '../api/browse'
import { VeilNotice } from '../components/VeilNotice'
import { ActionRow } from '../components/ui/ActionRow'
import { EmptyState } from '../components/ui/EmptyState'
import { Flag } from '../components/ui/Flag'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { plural } from '../domain/words'
import { horizonKey, useHorizonRev } from '../queryClient'

const CONTINENT_LABEL: Record<Continent, string> = {
  Europe: 'Europe',
  Asia: 'Asia',
  Africa: 'Africa',
  America: 'Americas',
  Oceania: 'Oceania',
}

/** En dos columnas desde 1.024, como el índice de carreras (21e). */
const LISTA = 'divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0'

function NationRow({ c }: { c: CountrySummary }) {
  const nombre = COUNTRIES.find((x) => x.code === c.country)?.name ?? c.country
  return (
    <ActionRow
      href={`/world/nations/${c.country}`}
      title={
        <span className="flex items-center gap-2">
          {/* su nombre va al lado: la bandera, para el ojo */}
          <span aria-hidden="true">
            <Flag country={c.country} />
          </span>
          {nombre}
        </span>
      }
      meta={`${c.totalPoints.toLocaleString('en-US')} pts · ${plural(c.riderCount, 'rider')}`}
    />
  )
}

/**
 * Naciones (#7): países con corredores en activo, agrupados por continente.
 *
 * Con el sistema desde el 21k (E3, docs/visual.md §17.21): la cabecera en `PageHeader`; cada continente en su
 * `Panel`, el primero la respuesta de la 22 (§7.3); y cada país, una `ActionRow` a su ranking, con su bandera
 * y su nombre, y debajo sus puntos y sus corredores, donde iban tarjetas a mano con las cifras en `slate-400`.
 */
export function Countries() {
  const rev = useHorizonRev()
  const query = useQuery({
    queryKey: horizonKey(['countries'], rev),
    queryFn: fetchCountries,
    enabled: rev !== undefined,
  })

  // Los estados, con `QueryView` (E3, PR 10).
  if (query.data === undefined)
    return <QueryView query={query} label="countries" skeleton={{ kind: 'rows', rowHeight: 44 }} />
  const data = query.data

  const byContinent = new Map<Continent, CountrySummary[]>()
  for (const c of data) {
    const cont = continentForCountry(c.country)
    if (!cont) continue
    const list = byContinent.get(cont)
    if (list) list.push(c)
    else byContinent.set(cont, [c])
  }
  const continentes = CONTINENTS.filter((cont) => (byContinent.get(cont)?.length ?? 0) > 0)

  return (
    <section className="grid gap-4">
      <PageHeader
        title="Nations"
        status="Every country with riders in the game, by continent. Tap one for its national ranking."
      />
      <VeilNotice kind="results" />
      {continentes.length === 0 && (
        <EmptyState icon="world" text="No countries with riders yet." answer />
      )}
      {continentes.map((cont, i) => (
        <Panel key={cont} title={CONTINENT_LABEL[cont]} answer={i === 0}>
          <ul className={LISTA}>
            {(byContinent.get(cont) ?? []).map((c) => (
              <NationRow key={c.country} c={c} />
            ))}
          </ul>
        </Panel>
      ))}
    </section>
  )
}
