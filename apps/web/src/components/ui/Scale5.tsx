import { type ArrivalLabel, stageRouteText } from '@cyclingstar/shared'
import { ARRIVAL_WORD } from '../../domain/words'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * LA LLEGADA, EN CINCO TRAMOS (E3, docs/visual.md §4.8; PR 9b; D-42, D-00n). Cinco tramos iguales de 36
 * de alto en el ancho del panel (`grid-cols-5`, que es `minmax(0, 1fr)`), con 4 px de hueco, en el orden
 * de `ARRIVAL_ORDER`: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Undertrained`. El activo, relleno de su
 * `arrival-*` con la palabra en 700 `on-arrival`; los demás, `surface-2` con borde `line-strong`. **El
 * mejor se ve siempre** (10-g): `Spot on`, que es el cuarto y no el del medio, lleva, activo o no, un
 * borde de 2 px en `good` (5,41:1), y el nombre lo dice. Debajo, los ejes que dicen la causa:
 * `◀ Too much training` y `Too little training ▶`. Marca el tramo, nunca un punto dentro de él.
 *
 * **La palabra no se corta**: parte de línea si no cabe (dos renglones de 16 caben en los 36), y
 * `Undertrained`, que no cabe en una en ningún teléfono, lleva un guion blando y sale `Under-` y
 * `trained`, que a 320 cabe por una décima con DejaVu Sans (la comprobación 2 lo vigila).
 *
 * Sin dato, ningún tramo y `Not enough data yet`; con la carrera ya empezada, ninguno y `Racing now ·
 * stage 3 of 5, Gandia → Alcoi`. Es un `role="img"` con todo en su nombre.
 */

export const ARRIVAL_ORDER = ['fundido', 'cargado', 'bien', 'perfecto', 'oxidado'] as const

export interface Scale5Props {
  /** null: `Not enough data yet` */
  readonly value: ArrivalLabel | null
  /** `Racing now · stage 3 of 5, Gandia → Alcoi`: la etapa y su origen y destino (`StageRoute`) */
  readonly racing?: {
    readonly stage: number
    readonly stages: number
    readonly route: { readonly from: string | null; readonly to: string | null }
  }
  /** el nombre de la carrera, para el `aria-label` */
  readonly race: string
  readonly layout?: Layout
}

const BEST: ArrivalLabel = 'perfecto'
const AXES = 'from too much training to too little training'
export const SCALE5_EMPTY = 'Not enough data yet'

/** Lo que se ve en el tramo: `Undertrained` con su guion blando. */
const EN_TRAMO: Readonly<Record<ArrivalLabel, string>> = {
  ...ARRIVAL_WORD,
  oxidado: 'Under­trained',
}

const RELLENO: Readonly<Record<ArrivalLabel, string>> = {
  fundido: 'bg-arrival-cooked',
  cargado: 'bg-arrival-loaded',
  bien: 'bg-arrival-fine',
  perfecto: 'bg-arrival-spoton',
  oxidado: 'bg-arrival-rusty',
}

/** `Racing now · stage 3 of 5, Gandia → Alcoi`. */
export function racingText(racing: NonNullable<Scale5Props['racing']>): string {
  const route = stageRouteText(racing.route.from, racing.route.to)
  return `Racing now · stage ${racing.stage} of ${racing.stages}${route === null ? '' : `, ${route}`}`
}

/** El nombre entero, para el lector. */
export function scale5Label({ value, racing, race }: Scale5Props): string {
  const best = `best is ${ARRIVAL_WORD[BEST]}`
  if (racing !== undefined) return `${race}: ${racingText(racing)}`
  if (value === null) return `${race}: ${SCALE5_EMPTY.toLowerCase()}, ${AXES}; ${best}`
  const n = ARRIVAL_ORDER.indexOf(value) + 1
  return `${race}: you'll arrive ${ARRIVAL_WORD[value]}, ${n} of 5, ${AXES}; ${best}`
}

function tramo(k: ArrivalLabel, activo: boolean): string {
  const borde =
    k === BEST
      ? 'border-2 border-good'
      : activo
        ? 'border border-transparent'
        : 'border border-line-strong'
  const color = activo ? `${RELLENO[k]} font-bold text-on-arrival` : 'bg-surface-2 text-ink-2'
  return `flex min-h-9 min-w-0 items-center justify-center rounded-ui text-center text-caption ${borde} ${color}`
}

export function Scale5(props: Scale5Props) {
  const { racing, layout } = props
  const value = racing === undefined ? props.value : null
  const state = racing !== undefined ? 'inactive' : value === null ? 'empty' : 'ready'
  return (
    <div
      data-ui="Scale5"
      data-variant="arrival"
      data-state={state}
      role="img"
      aria-label={scale5Label(props)}
      className={withLayout('grid gap-1', layout)}
    >
      <div className="grid grid-cols-5 gap-1">
        {ARRIVAL_ORDER.map((k) => (
          <span
            key={k}
            data-arrival={k}
            {...(k === value ? { 'data-active': '' } : {})}
            {...(k === BEST ? { 'data-best': '' } : {})}
            className={tramo(k, k === value)}
          >
            {EN_TRAMO[k]}
          </span>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-caption text-ink-3">
        <span>{'◀︎ Too much training'}</span>
        <span className="text-right">{'Too little training ▶︎'}</span>
      </div>
      {state === 'empty' && <p className="text-meta text-ink-2">{SCALE5_EMPTY}</p>}
      {racing !== undefined && <p className="text-meta text-ink-2">{racingText(racing)}</p>}
    </div>
  )
}
