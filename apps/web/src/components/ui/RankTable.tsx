import { stageRouteText } from '@cyclingstar/shared'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { DNF_WORD } from '../../domain/words'
import { TOP_ROWS } from '../ShowAll'
import { ButtonContent, buttonClass } from './Button'
import { Icon } from './Icon'
import { FOCUS_INSET, withLayout } from './styles'
import type { ColumnPriority, Layout } from './types'

/**
 * LA CLASIFICACIÓN (E3, docs/visual.md §4.5 y §6.1; PR 9b; D-16). Sustituye a las diez tablas de hoy. Una
 * `<table>` que no se desplaza de lado ni recorta: el puesto en 24 px (`meta` `tabular-nums` `ink-3`, a la
 * derecha); la celda de identidad, con su primer renglón (`RiderLabel`, o el equipo con su maillot) y el
 * segundo; y el valor, en `row` `tabular-nums` a la derecha con 12 px a su izquierda siempre (hoy el
 * equipo toca los puntos: `Northwind Cycling Team178`). La cabecera, de 32 px en versales.
 *
 * - **Las prioridades** (O-33): las columnas `primary` siempre lo son; las `secondary` van en el segundo
 *   renglón de la identidad por debajo de 640 y son columna desde 640; las `optional`, igual con 1.024.
 *   El segundo renglón une sus valores con `·` y parte de línea si no cabe; solo se corta una columna
 *   `clip` (el nombre del equipo), con `…` y `data-clip-ok`. Las dos cosas se pintan y el tema decide
 *   cuál se ve (`sm:` y `lg:`), sin medir nada.
 * - **El enlace es la celda de identidad entera**, en bloque y de 44 al menos (O-28): uno por fila, y un
 *   control para la prueba del teléfono, no un enlace de frase.
 * - **Las 20 y `Show all 140`** (`TOP_ROWS`, de `ShowAll.tsx`), a todo lo ancho y de 44. **La fila propia**
 *   (I-26) más allá de la 20 se ancla tras las 20, detrás de una fila `…` de 24 que no se lee; dentro o
 *   fuera, con la barra `own` de 3 px, el fondo `own-tint`, el nombre en 600 y `aria-current`.
 * - **Un abandono** (`rank` nulo) va al final, tras la propia, sin puesto y con `DNF` donde iría el valor,
 *   sin tachar; salen todos, y no cuentan en `Show all N`.
 * - **Velada** (E2): una fila a todo lo ancho, `Hidden until you watch stage 3, Gandia → Alcoi`, con el
 *   icono `warning` y `Watch`, un botón de 44.
 *
 * Cargando, vacía y con un fallo son de su `QueryView` (PR 10), con `Skeleton` `rows`.
 */

export interface RankTableColumn<Row> {
  readonly key: string
  /** `Time`, `Pts`, `Team` */
  readonly header: string
  readonly priority: ColumnPriority
  /** a la derecha y con `tabular-nums` */
  readonly numeric?: boolean
  /** se corta con `…` en el segundo renglón: solo el nombre del equipo (§4.5) */
  readonly clip?: boolean
  readonly render: (row: Row) => ReactNode
}

export interface RankTableProps<Row> {
  /** oculto a la vista: `General classification after stage 3, Gandia → Alcoi` */
  readonly caption: string
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  /** el puesto; null en un DNF o un equipo fuera; sin `rank`, la tabla no tiene columna de puesto */
  readonly rank?: (row: Row) => number | null
  /** el primer renglón de la identidad: `RiderLabel`, sin enlace ni equipo, o el equipo con su maillot */
  readonly identity: (row: Row) => ReactNode
  /** la cabecera de la identidad; por defecto `Rider` */
  readonly identityHeader?: string
  /** la celda de identidad entera enlaza aquí */
  readonly href: (row: Row) => string
  readonly columns: readonly RankTableColumn<Row>[]
  readonly isOwn?: (row: Row) => boolean
  /** las filas que hay en total, para `Show all 140`; por defecto, las que tienen puesto */
  readonly total?: number
  /** el velo de E2: la etapa que hay que ver, con su origen y su destino, y el enlace a `Watch` */
  readonly veil?: {
    readonly stage: number
    readonly route: { readonly from: string | null; readonly to: string | null }
    readonly href: string
  } | null
  readonly answer?: boolean
  readonly layout?: Layout
}

/** `Hidden until you watch stage 3, Gandia → Alcoi`. */
export function veilText(veil: NonNullable<RankTableProps<unknown>['veil']>): string {
  const route = stageRouteText(veil.route.from, veil.route.to)
  return `Hidden until you watch stage ${veil.stage}${route === null ? '' : `, ${route}`}`
}

/** Lo que se pinta, en orden: las filas con su puesto, el hueco de la propia y los abandonos. */
export type RankTableLine<Row> =
  | { readonly kind: 'row'; readonly row: Row; readonly own: boolean; readonly dnf: boolean }
  | { readonly kind: 'gap' }

export function rankTableLines<Row>(
  props: Pick<RankTableProps<Row>, 'rows' | 'rank' | 'isOwn'>,
  expanded: boolean,
): RankTableLine<Row>[] {
  const { rows, rank, isOwn } = props
  const own = (row: Row) => isOwn?.(row) ?? false
  const conPuesto = rank === undefined ? rows : rows.filter((r) => rank(r) !== null)
  const abandonos = rank === undefined ? [] : rows.filter((r) => rank(r) === null)
  const linea = (row: Row, dnf: boolean): RankTableLine<Row> => ({
    kind: 'row',
    row,
    own: own(row),
    dnf,
  })
  const out: RankTableLine<Row>[] = []
  const vista = expanded ? conPuesto : conPuesto.slice(0, TOP_ROWS)
  for (const row of vista) out.push(linea(row, false))
  if (!expanded) {
    const propia = conPuesto.slice(TOP_ROWS).find(own)
    if (propia !== undefined) out.push({ kind: 'gap' }, linea(propia, false))
  }
  for (const row of abandonos) out.push(linea(row, true))
  return out
}

const COLUMNA: Readonly<Record<ColumnPriority, string>> = {
  primary: '',
  secondary: 'hidden sm:table-cell',
  optional: 'hidden lg:table-cell',
}
const EN_SEGUNDO: Readonly<Record<ColumnPriority, string>> = {
  primary: '',
  secondary: 'sm:hidden',
  optional: 'lg:hidden',
}
const CABECERA =
  'h-8 align-bottom pb-1 text-caption font-semibold tracking-caps text-ink-3 uppercase'
/** La primera celda de cada fila lleva la barra de 3 px: `own` en la propia, transparente en las demás. */
const BARRA = 'border-l-3'

/** El segundo renglón de la identidad: las `secondary` y las `optional`, unidas con `·`. */
function SegundoRenglon<Row>({
  row,
  columns,
}: {
  row: Row
  columns: readonly RankTableColumn<Row>[]
}) {
  const secundarias = columns.filter((c) => c.priority === 'secondary')
  const opcionales = columns.filter((c) => c.priority === 'optional')
  if (secundarias.length + opcionales.length === 0) return null
  // el punto cuelga del valor anterior, como una coma: si el renglón parte, no empieza por él; y se
  // esconde con su valor, así que entre lo que queda a la vista siempre hay uno
  const items = [
    ...secundarias.map((c, i) => ({
      c,
      punto: i < secundarias.length - 1 || opcionales.length > 0,
    })),
    ...opcionales.map((c, i) => ({ c, punto: i < opcionales.length - 1 })),
  ]
  return (
    <span data-second="" className="flex flex-wrap gap-x-1 text-meta font-normal text-ink-3">
      {items.map(({ c, punto }) => (
        <span
          key={c.key}
          data-column={c.key}
          data-priority={c.priority}
          className={`flex min-w-0 gap-1 ${EN_SEGUNDO[c.priority]}`}
        >
          {c.clip === true ? (
            <span data-clip-ok="" className="min-w-0 truncate">
              {c.render(row)}
            </span>
          ) : (
            <span>{c.render(row)}</span>
          )}
          {punto && <span aria-hidden="true">·</span>}
        </span>
      ))}
    </span>
  )
}

export function RankTable<Row>(props: RankTableProps<Row>) {
  const { caption, rows, rowKey, rank, identity, href, columns, veil, answer, layout } = props
  const [expanded, setExpanded] = useState(false)
  const conPuesto = rank === undefined ? rows.length : rows.filter((r) => rank(r) !== null).length
  const total = props.total ?? conPuesto
  const velada = veil !== undefined && veil !== null
  const ncols = (rank === undefined ? 1 : 2) + columns.length
  const primera = columns.findIndex((c) => c.priority === 'primary')

  return (
    <div
      data-ui="RankTable"
      data-variant={rank === undefined ? 'plain' : 'ranked'}
      data-state={velada ? 'veiled' : 'ready'}
      {...(answer === true ? { 'data-answer': '' } : {})}
      className={withLayout('grid gap-2', layout)}
    >
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {rank !== undefined && (
              <th
                scope="col"
                className={`w-px pr-2 text-right ${BARRA} border-l-transparent ${CABECERA}`}
              >
                #
              </th>
            )}
            <th
              scope="col"
              className={`text-left ${rank === undefined ? `${BARRA} border-l-transparent` : ''} ${CABECERA}`}
            >
              {props.identityHeader ?? 'Rider'}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                data-column={c.key}
                data-priority={c.priority}
                className={`${COLUMNA[c.priority]} w-px pl-3 whitespace-nowrap ${c.numeric === true ? 'text-right' : 'text-left'} ${CABECERA}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {velada ? (
            <tr className="border-t border-line">
              <td colSpan={ncols} className="py-2">
                <span className="flex items-center gap-2 text-meta text-ink-2">
                  <span className="inline-flex shrink-0 text-warn">
                    <Icon name="warning" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">{veilText(veil)}</span>
                  <Link
                    to={veil.href}
                    className={buttonClass({
                      variant: 'quiet',
                      size: 'default',
                      iconOnly: false,
                      disabled: false,
                    })}
                  >
                    <ButtonContent text="Watch" busy={false} />
                  </Link>
                </span>
              </td>
            </tr>
          ) : (
            rankTableLines(props, expanded).map((linea, i) => {
              if (linea.kind === 'gap')
                return (
                  <tr key={`gap-${i}`} aria-hidden="true" className="h-6 border-t border-line">
                    <td colSpan={ncols} className="text-center text-meta text-ink-3">
                      …
                    </td>
                  </tr>
                )
              const { row, own, dnf } = linea
              const puesto = rank?.(row) ?? null
              const barra = `${BARRA} ${own ? 'border-l-own' : 'border-l-transparent'}`
              return (
                <tr
                  key={rowKey(row)}
                  data-state={dnf ? 'inactive' : 'ready'}
                  {...(own ? { 'aria-current': 'true' as const } : {})}
                  className={`border-t border-line ${own ? 'bg-own-tint' : ''}`}
                >
                  {rank !== undefined && (
                    <td
                      className={`w-px pt-2 pr-2 text-right align-top text-meta tabular-nums text-ink-3 ${barra}`}
                    >
                      {puesto ?? ''}
                    </td>
                  )}
                  <td className={`w-full max-w-0 p-0 align-top ${rank === undefined ? barra : ''}`}>
                    <Link
                      to={href(row)}
                      className={`block min-h-11 py-1 ${own ? 'font-semibold' : ''} ${FOCUS_INSET}`}
                    >
                      <span className="block">{identity(row)}</span>
                      <SegundoRenglon row={row} columns={columns} />
                    </Link>
                  </td>
                  {columns.map((c, j) => (
                    <td
                      key={c.key}
                      data-column={c.key}
                      data-priority={c.priority}
                      className={`${COLUMNA[c.priority]} w-px pt-2 pl-3 align-top whitespace-nowrap ${
                        c.numeric === true
                          ? 'text-right text-row tabular-nums text-ink'
                          : 'text-left text-meta text-ink-2'
                      }`}
                    >
                      {dnf && j === primera ? (
                        <span className="text-caption font-semibold text-ink-3">{DNF_WORD}</span>
                      ) : (
                        c.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      {!velada && total > TOP_ROWS && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className={`w-full ${buttonClass({ variant: 'secondary', size: 'default', iconOnly: false, disabled: false })}`}
        >
          <ButtonContent
            text={expanded ? `Show top ${TOP_ROWS}` : `Show all ${total}`}
            busy={false}
          />
        </button>
      )}
    </div>
  )
}
