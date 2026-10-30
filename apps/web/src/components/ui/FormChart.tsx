import { seasonPosition } from '@cyclingstar/shared'
import { conditionLabel } from '../../domain/condition'
import { formatGameDay, plural } from '../../domain/words'
import { METER_EMPTY } from './Meter'
import { Skeleton } from './Skeleton'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * LA GRÁFICA DEL FONDO Y LA FRESCURA (E3, docs/visual.md §4.8; PR 21h; Rcobertura-013). Sustituye a la de
 * `components/FormChart.tsx`: los últimos 90 días de `GET /api/riders/me/form`, con los enteros de 0 a 100
 * que la frontera deja cruzar (D-55). A todo lo ancho y 120 px de alto: el fondo, una línea continua de 2 px
 * en `accent`, y la frescura, discontinua (4 y 3) en `gold-ink`, para que no se distingan solo por el color
 * (D-13). Los rótulos de los dos ejes van en HTML, junto al dibujo: a su izquierda `100`, `50` y `0`, y debajo
 * tres días de la temporada (`Day 16`, `Day 46`, `Day 75`); ningún `<text>` en el SVG, que al estirarse se
 * pintaría por debajo de 12 px (el de antes, `fontSize="10"`, salía a 5,2 px a 360; 14-h). Debajo, la
 * leyenda, con el trazo de muestra de cada una. Con menos de dos días, `No data yet`, en su hueco; cargando,
 * el `Skeleton` `panel`. Es una imagen con su nombre y la última lectura en palabras: `Fitness and freshness,
 * last 90 days. Fitness: good, Freshness: low`.
 */

export interface FormChartProps {
  /** De GET /api/riders/me/form: enteros de 0 a 100, el día más antiguo primero (D-55). */
  readonly points: readonly {
    readonly gameDay: number
    readonly fitness: number
    readonly freshness: number
  }[]
  /** mientras llega: el `Skeleton` `panel` */
  readonly loading?: boolean
  readonly layout?: Layout
}

/** Las unidades del dibujo: se estira a todo lo ancho (`preserveAspectRatio="none"`), y sus trazos no. */
const ANCHO = 300
const ALTO = 120
/** Media línea de `caption` (16 px): así las líneas de 0, 50 y 100 caen en el centro de sus rótulos. */
const MARGEN = 8

const palabra = (v: number): string => conditionLabel(v).toLowerCase()

/** `Fitness and freshness, last 90 days. Fitness: good, Freshness: low`, con los días que haya. */
export function formChartLabel(points: FormChartProps['points']): string {
  const primero = points[0]
  const ultimo = points[points.length - 1]
  if (primero === undefined || ultimo === undefined) return `Fitness and freshness: ${METER_EMPTY}`
  const dias = plural(ultimo.gameDay - primero.gameDay + 1, 'day')
  return `Fitness and freshness, last ${dias}. Fitness: ${palabra(ultimo.fitness)}, Freshness: ${palabra(ultimo.freshness)}`
}

/** Los tres días del eje, a 1/6, 1/2 y 5/6 del tramo: lejos de los bordes, para que sus rótulos quepan. */
export function formChartTicks(first: number, last: number): readonly number[] {
  const tramo = last - first
  return [1 / 6, 1 / 2, 5 / 6].map((f) => Math.round(first + tramo * f))
}

/** El trazo de muestra de la leyenda: el mismo que su línea, a 20 × 8. */
function Muestra({ tone, dashed }: { readonly tone: string; readonly dashed: boolean }) {
  return (
    <svg width={20} height={8} viewBox="0 0 20 8" aria-hidden="true">
      <line
        x1={0}
        x2={20}
        y1={4}
        y2={4}
        className={tone}
        stroke="currentColor"
        strokeWidth={2}
        {...(dashed ? { strokeDasharray: '4 3' } : {})}
      />
    </svg>
  )
}

export function FormChart({ points, loading = false, layout }: FormChartProps) {
  const raiz = (state: 'ready' | 'empty' | 'loading') =>
    ({
      'data-ui': 'FormChart',
      'data-variant': 'default',
      'data-state': state,
      className: withLayout('grid gap-2', layout),
    }) as const

  if (loading)
    return (
      <div {...raiz('loading')} role="status">
        <span className="sr-only">Loading fitness and freshness</span>
        <Skeleton shape={{ kind: 'panel' }} />
      </div>
    )

  const primero = points[0]
  const ultimo = points[points.length - 1]
  if (points.length < 2 || primero === undefined || ultimo === undefined)
    return (
      <div {...raiz('empty')}>
        <p className="grid h-30 place-items-center rounded-ui bg-surface-2 text-meta text-ink-2">
          {METER_EMPTY}
        </p>
      </div>
    )

  const desde = primero.gameDay
  const tramo = Math.max(1, ultimo.gameDay - desde)
  const x = (dia: number) => ((dia - desde) / tramo) * ANCHO
  const y = (v: number) => ALTO - MARGEN - (Math.min(100, Math.max(0, v)) / 100) * (ALTO - 2 * MARGEN)
  const linea = (pick: (p: FormChartProps['points'][number]) => number) =>
    points.map((p) => `${x(p.gameDay).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ')

  return (
    <figure {...raiz('ready')} role="img" aria-label={formChartLabel(points)}>
      <div className="flex gap-2">
        {/* el eje vertical, en HTML: tres rótulos de 16 en los 120 del dibujo, cada uno en su línea */}
        <div className="flex h-30 flex-col justify-between text-right text-caption tabular-nums text-ink-3">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="grid min-w-0 flex-1 gap-1">
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="h-30 w-full"
            fill="none"
            aria-hidden="true"
          >
            {[0, 50, 100].map((v) => (
              <line
                key={v}
                x1={0}
                x2={ANCHO}
                y1={y(v)}
                y2={y(v)}
                className="text-line"
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <polyline
              points={linea((p) => p.fitness)}
              className="text-accent"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={linea((p) => p.freshness)}
              className="text-gold-ink"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* el eje de los días, en HTML: tres marcas del día de la temporada, centradas en el suyo */}
          <div className="relative h-4 text-caption tabular-nums text-ink-3">
            {formChartTicks(desde, ultimo.gameDay).map((dia) => (
              <span
                key={dia}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${(x(dia) / ANCHO) * 100}%` }}
              >
                {formatGameDay(seasonPosition(dia).dayOfSeason, null)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Muestra tone="text-accent" dashed={false} />
          Fitness
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Muestra tone="text-gold-ink" dashed />
          Freshness
        </span>
      </div>
    </figure>
  )
}
