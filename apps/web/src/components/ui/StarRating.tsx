import { ICONS } from './icons'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * LAS ESTRELLAS (E3, docs/visual.md §4.6; PR 9b). De media en media (SPEC 3.2): el jugador ve estrellas,
 * nunca el número interno. Cinco, en un solo SVG con su nombre (`3.5 of 5 stars`), con las formas
 * `star-full`, `star-half` y `star-empty` del catálogo (§3.7), a 16 en una fila y a 20 en la ficha. Las
 * llenas, de relleno `gold` con su contorno en `gold-ink` (7,06:1), que se pinta encima; las vacías, solo
 * el contorno, en `line-strong` (3,66:1); la media, su mitad en `gold` y el contorno en `gold-ink`. Hoy
 * son `★` con un relleno por ancho (`StarRating.tsx` l. 2-20), que parte una estrella por donde caiga.
 */

export interface StarRatingProps {
  /** de 0 a 5; se pinta en medias */
  readonly value: number
  /** 16 en una fila; 20 en la ficha */
  readonly size?: 16 | 20
  readonly layout?: Layout
}

/** El valor que se pinta: entre 0 y 5, a la media más cercana. */
export function starsOf(value: number): number {
  const v = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0
  return Math.round(v * 2) / 2
}

/** `3.5 of 5 stars`, `4 of 5 stars`. */
export const starsLabel = (value: number): string => `${starsOf(value)} of 5 stars`

function Estrella({ llena }: { readonly llena: 0 | 0.5 | 1 }) {
  if (llena === 0) return <g className="text-line-strong">{ICONS['star-empty']}</g>
  return (
    <>
      <g className="text-gold">{llena === 1 ? ICONS['star-full'] : ICONS['star-half']}</g>
      <g className="text-gold-ink">{ICONS['star-empty']}</g>
    </>
  )
}

const LLENA = { 0: 'empty', 0.5: 'half', 1: 'full' } as const

export function StarRating({ value, size = 16, layout }: StarRatingProps) {
  const v = starsOf(value)
  return (
    <svg
      data-ui="StarRating"
      data-variant={size === 20 ? 'page' : 'row'}
      data-state="ready"
      role="img"
      aria-label={starsLabel(value)}
      width={size * 5}
      height={size}
      viewBox="0 0 120 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={withLayout('inline-block shrink-0 align-middle', layout)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const llena = v >= i + 1 ? 1 : v >= i + 0.5 ? 0.5 : 0
        return (
          <g key={i} data-star={LLENA[llena]} transform={`translate(${i * 24} 0)`}>
            <Estrella llena={llena} />
          </g>
        )
      })}
    </svg>
  )
}
