import type { RiderRaceResult } from '@cyclingstar/shared'
import {
  hasStageBreakdown,
  ordinal,
  placeTone,
  raceResultKey,
  raceResultKind,
  raceResultPlace,
  stagesSummary,
  stagesToWatchText,
} from '../domain/riderResults'
import { StageRoute } from './StageRoute'
import { Disclosure } from './ui/Disclosure'
import { RankTable, type RankTableColumn } from './ui/RankTable'
import { TextLink } from './ui/TextLink'
import { TONES } from './ui/styles'

/**
 * LOS RESULTADOS DE UN CORREDOR, EN LA `RankTable` DEL CATÁLOGO (E3, docs/visual.md §6.1; PR 21b, y desde el
 * 21h también en su ficha, donde sustituye a `RaceResults.tsx` y su `Show last N`, §4.6). Una fila POR CARRERA
 * con su puesto en la general —el resultado de una vuelta es la general, se gane o no (docs/navegacion.md
 * §3.6)— y las etapas plegadas debajo, cada una con su enlace a la crónica: sin puesto ni enlace de fila,
 * porque la carrera enlaza en su nombre y cada etapa en el suyo; las etapas, en un `Disclosure` de 44 debajo
 * del segundo renglón (`detail`); y las 20 primeras, con `Show all N` (`TOP_ROWS`).
 */

/** El desglose de las etapas de una vuelta, plegado: el titular es la general (docs/navegacion.md §3.6). */
function Etapas({ r }: { readonly r: RiderRaceResult }) {
  return (
    // sin región: una por fila, y abiertas, todas se llamarían `Hide the stages` (la revisión del 21b)
    // con su nombre: una por fila, y la lista de botones del lector las diría todas igual (la revisión del 21e)
    <Disclosure
      showLabel={stagesSummary(r)}
      hideLabel="Hide the stages"
      region={false}
      name={r.raceName}
    >
      <ul className="px-3 pb-1">
        {r.stages.map((s) => (
          // las cifras, tabulares: `Stage 1 of 5` y `Stage 2 of 5` miden lo mismo, y los recorridos empiezan a la
          // vez mientras las etapas tengan las mismas cifras (en una de 21, de la 10 en adelante, uno más allá)
          <li key={s.stageDay} className="flex items-center gap-2 text-meta tabular-nums">
            <span
              className={`w-10 shrink-0 text-right font-semibold ${
                s.puesto === 1 ? TONES.good.text : 'text-ink-2'
              }`}
            >
              {ordinal(s.puesto)}
            </span>
            <TextLink to={`/world/races/${r.raceId}/stages/${s.stageDay}`} layout="shrink-0">
              {`Stage ${s.stageDay} of ${r.stageCount}`}
            </TextLink>
            <StageRoute from={s.from} to={s.to} className="min-w-0 text-ink-3" />
          </li>
        ))}
      </ul>
    </Disclosure>
  )
}

/**
 * Las columnas de mis resultados (§6.1): la temporada y qué es el resultado, en el segundo renglón hasta
 * 640 (`Season 1 · Overall`); el puesto, siempre, con su tono (`placeTone`).
 */
const COLUMNAS: readonly RankTableColumn<RiderRaceResult>[] = [
  {
    key: 'season',
    header: 'Season',
    priority: 'secondary',
    numeric: true,
    render: (r) => r.season + 1,
    second: (r) => `Season ${r.season + 1}`,
  },
  { key: 'result', header: 'Result', priority: 'secondary', render: raceResultKind },
  {
    key: 'place',
    header: 'Place',
    priority: 'primary',
    numeric: true,
    render: (r) => (
      <span className={`font-bold ${TONES[placeTone(r)].text}`}>{raceResultPlace(r)}</span>
    ),
  },
]

export function RaceResultsTable({
  results,
  caption,
  answer = false,
}: {
  readonly results: readonly RiderRaceResult[]
  /** oculto a la vista: de quién son y en qué orden */
  readonly caption: string
  readonly answer?: boolean
}) {
  return (
    <RankTable
      caption={caption}
      rows={results}
      rowKey={raceResultKey}
      identityHeader="Race"
      identity={(r) => (
        <>
          <TextLink to={`/world/races/${r.raceId}`}>{r.raceName}</TextLink>
          {/* con etapas en su velo (sup. H7; 9b): `3 stages to watch` */}
          {stagesToWatchText(r) !== null && (
            <span className={`block text-meta font-semibold ${TONES.good.text}`}>
              {stagesToWatchText(r)}
            </span>
          )}
          {/* un día: la etapa ES la carrera, y su de dónde a dónde va debajo del nombre */}
          {r.isOneDay && (
            <StageRoute
              from={r.stages[0]?.from}
              to={r.stages[0]?.to}
              className="block text-meta text-ink-3"
            />
          )}
        </>
      )}
      columns={COLUMNAS}
      detail={(r) => (hasStageBreakdown(r) ? <Etapas r={r} /> : null)}
      answer={answer}
    />
  )
}
