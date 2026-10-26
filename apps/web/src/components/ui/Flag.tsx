import { COUNTRIES } from '@cyclingstar/shared'
import sprite from '../../assets/flags.webp'
import { FLAG_CELLS, FLAG_SPRITE } from './flagSprite.generated'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * LA BANDERA (E3, docs/visual.md §4.6 y §12.2; PR 9b; D-49). La del sprite de las 133 del juego
 * (`assets/flags.webp`, del PR 6), a 21 × 16 en una fila, o a 12, 16 o 24 de alto, con un filete `line`
 * de 1 px por dentro. Enseña lo de dentro del anillo de su celda (60 × 44 píxeles del sprite), escalado
 * en píxeles al tamaño de la caja: así lo que el filtrado coja de fuera es su propio borde, nunca la
 * bandera vecina (`scripts/flag-sprite.mjs`). Sin país, o con uno que no está, el hueco de su ancho, que
 * no se lee (`empty`; hoy, `🏳️`). Junto a un maillot solo en `RiderLabel` (D-00c).
 */

export interface FlagProps {
  /** ISO 3166-1 alfa-2 */
  readonly country: string | null | undefined
  /** el alto; 16, el de una fila, por defecto */
  readonly height?: 12 | 16 | 24
  readonly layout?: Layout
}

const NOMBRES: ReadonlyMap<string, string> = new Map(COUNTRIES.map((c) => [c.code, c.name]))

/** El ancho de la caja: 4:3, redondeado (21 × 16 en una fila). */
export const flagWidth = (height: 12 | 16 | 24): number => Math.round((height * 4) / 3)

const { cols, rows, width, height: alto, margin } = FLAG_SPRITE

export function Flag({ country, height = 16, layout }: FlagProps) {
  const code = country?.trim().toUpperCase() ?? ''
  const name = NOMBRES.get(code)
  const cell = FLAG_CELLS[code]
  const w = flagWidth(height)
  const caja = withLayout('inline-block shrink-0 align-middle', layout)

  if (name === undefined || cell === undefined)
    return (
      <span
        data-ui="Flag"
        data-variant="sprite"
        data-state="empty"
        aria-hidden="true"
        className={caja}
        style={{ width: w, height }}
      />
    )

  const sx = w / (width - 2 * margin)
  const sy = height / (alto - 2 * margin)
  const [col, row] = cell
  const px = (n: number) => `${Number(n.toFixed(3))}px`
  return (
    <span
      data-ui="Flag"
      data-variant="sprite"
      data-state="ready"
      role="img"
      aria-label={name}
      className={caja}
      style={{
        width: w,
        height,
        backgroundImage: `url(${sprite})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${px(cols * width * sx)} ${px(rows * alto * sy)}`,
        backgroundPosition: `${px(-(col * width + margin) * sx)} ${px(-(row * alto + margin) * sy)}`,
        boxShadow: 'inset 0 0 0 1px var(--color-line)',
      }}
    />
  )
}
