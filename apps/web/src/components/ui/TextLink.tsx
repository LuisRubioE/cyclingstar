import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL ENLACE DE TEXTO (E3, docs/visual.md §4.3; PR 9a). Subrayado siempre, de 1 px a 2 px de la letra, y
 * de 2 px encima; visitado, igual. `default`, en `accent`; `rider`, el nombre de un corredor, en el color
 * de su texto con el subrayado punteado (`[DUEÑO 6]`). En una frase (`inline`) lleva `data-inline-link`:
 * la prueba del teléfono le pide 24 px de objetivo, o su círculo de 24 sin tocar otro (WCAG 2.5.8; la
 * comprobación 5), y no los 44 de un control. Fuera de una frase es un control, como la acción de un
 * `Panel` o el `Go to Dashboard` de `ErrorState`, y mide 44 de alto. Nunca solo color: el subrayado no
 * se quita.
 *
 * Con `glueEnd` (PR 9b), su última palabra no parte de lo que venga detrás: el maillot de `RiderLabel`,
 * que va pegado a la última palabra del nombre ([DUEÑO 17]). Junto a un SVG siempre se puede partir (CSS
 * Text 3 §5.1), y Chromium lo deja también donde se cierra una caja en `normal`; así que el enlace va en
 * `nowrap`, y solo lo de delante de su última palabra, en `normal`, puede partir.
 */

/**
 * El texto con lo de delante de su última palabra en `normal`, para ponerlo dentro de algo en `nowrap`:
 * parte por sus espacios y sus guiones, pero no entre su última palabra y lo que venga detrás.
 */
export function gluedLastWord(text: string): ReactNode {
  const i = text.trimEnd().lastIndexOf(' ')
  if (i < 0) return text
  return (
    <>
      <span className="whitespace-normal">{text.slice(0, i + 1)}</span>
      {text.slice(i + 1)}
    </>
  )
}

export interface TextLinkProps {
  readonly to: string
  readonly children: string
  readonly variant?: 'default' | 'rider'
  /** dentro de una frase */
  readonly inline?: boolean
  /** la última palabra no se separa de lo que venga detrás */
  readonly glueEnd?: boolean
  readonly layout?: Layout
}

const VARIANTES = {
  default: 'text-accent decoration-1',
  rider: 'decoration-line-strong decoration-dotted decoration-1',
} as const

export function TextLink({
  to,
  children,
  variant = 'default',
  inline = false,
  glueEnd = false,
  layout,
}: TextLinkProps) {
  return (
    <Link
      to={to}
      data-ui="TextLink"
      data-variant={variant}
      data-state="ready"
      {...(inline ? { 'data-inline-link': '' } : {})}
      className={withLayout(
        `rounded-ui underline underline-offset-2 hover:decoration-2 ${VARIANTES[variant]} ${FOCUS}${
          inline ? '' : ' inline-flex min-h-11 items-center'
        }${glueEnd ? ' whitespace-nowrap' : ''}`,
        layout,
      )}
    >
      {glueEnd ? gluedLastWord(children) : children}
    </Link>
  )
}
