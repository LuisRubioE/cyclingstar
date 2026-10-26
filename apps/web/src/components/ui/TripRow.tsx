import { type ReactNode, useId } from 'react'
import { Chip } from './Chip'
import { Icon } from './Icon'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL VIAJE, EN UN BLOQUE (E3, docs/visual.md §4.5 y §11.6; PR 9b; I-34, D-43). Ida, carrera y vuelta son
 * un viaje: una cabecera de 48 en `info-bg` con el icono `travel` de 20 en `accent`, la carrera en `row` y
 * lo demás en `meta` `ink-2` (`Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training`), y
 * debajo un tramo por fila, cada uno con su origen (`Day 55 Out`, `Days 56 to 60 Race`, `Day 61 Back`);
 * los descansos de una vuelta llevan lo que los edita. Todo el bloque, con un borde izquierdo de 4 px en
 * `accent`. Mientras el viaje está en curso, la cabecera dice `Now`. Hoy son filas azules sueltas, una
 * por día (`Training.tsx` l. 215-234). Es un `<li>` con su cabecera por nombre.
 */

export interface TripLeg {
  readonly key: string
  /** `Day 55`, `Days 56 to 60` */
  readonly days: string
  /** su origen: `Out`, `Race`, `Rest`, `Back` */
  readonly what: string
  /** lo que lo edita, en un descanso */
  readonly action?: ReactNode
}

export interface TripRowProps {
  /** `Race Sardegna (IT)` */
  readonly race: string
  /** `Days 55 to 61 · 7 days off training` */
  readonly meta: string
  readonly legs: readonly TripLeg[]
  /** el viaje está en curso: `Now` */
  readonly active?: boolean
  readonly layout?: Layout
}

export const TRIP_NOW = 'Now'

export function TripRow({ race, meta, legs, active = false, layout }: TripRowProps) {
  const headId = useId()
  return (
    <li
      data-ui="TripRow"
      data-variant="trip"
      data-state={active ? 'active' : 'ready'}
      aria-labelledby={headId}
      className={withLayout(
        'overflow-hidden rounded-ui border-l-4 border-accent bg-surface',
        layout,
      )}
    >
      <div className="flex min-h-12 items-center gap-2 bg-info-bg px-3 py-1">
        <span className="inline-flex shrink-0 text-accent">
          <Icon name="travel" size={20} />
        </span>
        <p id={headId} className="min-w-0 flex-1">
          <span className="text-row text-ink">Trip to {race}</span>{' '}
          <span className="text-meta text-ink-2">· {meta}</span>
          {active && (
            <>
              {' '}
              <Chip tone="accent">{TRIP_NOW}</Chip>
            </>
          )}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {legs.map((leg) => (
          <li key={leg.key} className="flex min-h-11 flex-wrap items-center gap-x-2 px-3 py-1">
            <span className="text-meta tabular-nums text-ink-2">{leg.days}</span>
            <span className="text-row text-ink">{leg.what}</span>
            {leg.action !== undefined && <span className="ml-auto">{leg.action}</span>}
          </li>
        ))}
      </ul>
    </li>
  )
}
