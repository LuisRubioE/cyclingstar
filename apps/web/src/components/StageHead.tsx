import { stageRouteText } from '@cyclingstar/shared'
import type { ReactNode } from 'react'
import { StageRoute } from './StageRoute'
import { Button } from './ui/Button'
import { Flag } from './ui/Flag'
import { TextLink } from './ui/TextLink'

/**
 * LA CABEZA DE LA ETAPA (E3, docs/visual.md §14.2; telefono §10; Ruso-035; PR 20). Sustituye a la miga y a
 * las flechas a `opacity-40`:
 *
 * - **Una fila de 44** con la carrera y las dos flechas, `Button` `quiet` de solo icono (`Previous stage`,
 *   `Next stage`); en la primera y la última etapa la que sobra no se pinta y deja su hueco, para que la
 *   carrera no se mueva. El nombre de la carrera es un `TextLink` a su ficha.
 * - **El `h1`**, el nombre de la etapa (`Stage 3 · Summit finish`), en `title`, con el botón de compartir a
 *   su lado. La ruta no va en él: con la de la pantalla 08 partiría en dos renglones de `title`.
 * - **La ruta** con su distancia, debajo, en `meta` `ink-2`, que puede partir y no se corta.
 *
 * Con la fila, el `h1`, la ruta y las pestañas, la capa fija empieza hacia los 250 px y no a los 328 de
 * antes (estimado; la mide la comprobación 7 en la pantalla 08).
 */
export function StageHead({
  raceId,
  race,
  day,
  stageCount,
  stageHref,
  title,
  from,
  to,
  km,
  run,
  share,
}: {
  raceId: string
  /** la carrera, si ya se sabe; sin ella, `Back to the race` */
  race: { readonly name: string; readonly country: string | null } | null
  day: number
  /** 0 si aún no se sabe: sin flechas ni `Stage 3 of 5` */
  stageCount: number
  stageHref: (day: number) => string
  title: string
  from: string | null | undefined
  to: string | null | undefined
  km: number
  /** corrida; si no, `not raced yet` */
  run: boolean
  /** el botón de compartir (`ShareStageIcon`), o nada */
  share: ReactNode
}) {
  const prevDay = stageCount > 0 && day > 1 ? day - 1 : null
  const nextDay = stageCount > 0 && day < stageCount ? day + 1 : null
  const gap = <span aria-hidden="true" className="h-11 w-11 shrink-0" />
  return (
    <header className="space-y-1">
      <nav aria-label="Stages" className="flex min-h-11 items-center gap-2">
        {prevDay !== null ? (
          <Button
            variant="quiet"
            icon="chevron-left"
            ariaLabel="Previous stage"
            to={stageHref(prevDay)}
          />
        ) : (
          gap
        )}
        <p className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1.5 text-meta text-ink-2">
          {race?.country != null && <Flag country={race.country} height={12} />}
          <TextLink to={`/world/races/${raceId}`}>{race?.name ?? 'Back to the race'}</TextLink>
          {race !== null && stageCount > 0 && (
            <span>
              · Stage {day} of {stageCount}
            </span>
          )}
        </p>
        {nextDay !== null ? (
          <Button
            variant="quiet"
            icon="chevron-right"
            ariaLabel="Next stage"
            to={stageHref(nextDay)}
          />
        ) : (
          gap
        )}
      </nav>
      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 text-title text-ink">{title}</h1>
        {share}
      </div>
      <p className="text-meta text-ink-2">
        {/* De dónde a dónde, antes que los kilómetros: la etapa se reconoce por sus ciudades. */}
        <StageRoute from={from} to={to} />
        {stageRouteText(from, to) !== null && ' · '}
        {km} km{run ? '' : ' · not raced yet'}
      </p>
    </header>
  )
}
