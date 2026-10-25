import { COUNTRIES } from '@cyclingstar/shared'
import sprite from '../assets/flags.webp'
import { FLAG_CELLS, FLAG_SPRITE } from './ui/flagSprite.generated'

/**
 * Bandera como imagen en lugar de emoji: los emoji de bandera no se renderizan en Windows ni en muchos
 * navegadores de escritorio (muestran las letras del país). `size` es la altura en px (el ancho sale
 * 4:3). Sin país válido, el hueco de su ancho, que no se lee.
 *
 * DEL SPRITE (E3, docs/visual.md §12.2; PR 6, D-49): las 133 del juego en `assets/flags.webp`, de
 * `scripts/flag-sprite.mjs`. Antes, las clases de `flag-icons`, cuya hoja era el 91 % de la CSS que
 * bloquea la primera pintura. La caja es la de `flag-icons` (`.flag`, en `index.css`), para que nada se
 * mueva, y el sprite se escala en `em`, así que la bandera sigue a `size`. La caja enseña su celda sin
 * el anillo que repite el borde (`margin`): la bandera entera y en 4:3, y al escalar, lo que el filtrado
 * coja de fuera es su propio color, nunca el de la vecina (`scripts/flag-sprite.mjs`).
 */

const { cols, rows, width, height, margin } = FLAG_SPRITE
/** em por píxel del sprite: lo de dentro del anillo mide 4/3 em de ancho y 1 em de alto */
const EM_X = 4 / 3 / (width - 2 * margin)
const EM_Y = 1 / (height - 2 * margin)
const em = (n: number) => `${Number(n.toFixed(4))}em`
const SPRITE_SIZE = `${em(cols * width * EM_X)} ${em(rows * height * EM_Y)}`

export function Flag({
  code,
  size = 20,
  className = '',
}: {
  code: string | null | undefined
  size?: number
  className?: string
}) {
  const cc = code?.trim().toUpperCase()
  const country = cc ? COUNTRIES.find((c) => c.code === cc) : undefined
  const cell = cc ? FLAG_CELLS[cc] : undefined
  const classes = className ? `flag ${className}` : 'flag'

  if (!country || !cell) return <span className={classes} style={{ fontSize: size }} aria-hidden />
  const [col, row] = cell
  return (
    <span
      className={classes}
      style={{
        fontSize: size,
        backgroundImage: `url(${sprite})`,
        backgroundSize: SPRITE_SIZE,
        backgroundPosition: `${em(-(col * width + margin) * EM_X)} ${em(-(row * height + margin) * EM_Y)}`,
        borderRadius: 2,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
      role="img"
      aria-label={country.name}
      title={country.name}
    />
  )
}
