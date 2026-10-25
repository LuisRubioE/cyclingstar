import { Link } from 'react-router-dom'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL ENLACE DE TEXTO (E3, docs/visual.md §4.3; PR 9a). Subrayado siempre, de 1 px a 2 px de la letra, y
 * de 2 px encima; visitado, igual. `default`, en `accent`; `rider`, el nombre de un corredor, en el color
 * de su texto con el subrayado punteado (`[DUEÑO 6]`). En una frase (`inline`) lleva `data-inline-link`:
 * la prueba del teléfono le pide 24 px de objetivo, o su círculo de 24 sin tocar otro (WCAG 2.5.8; la
 * comprobación 5), y no los 44 de un control. Nunca solo color: el subrayado no se quita.
 */

export interface TextLinkProps {
  readonly to: string
  readonly children: string
  readonly variant?: 'default' | 'rider'
  /** dentro de una frase */
  readonly inline?: boolean
  readonly layout?: Layout
}

const VARIANTES = {
  default: 'text-accent decoration-1',
  rider: 'decoration-line-strong decoration-dotted decoration-1',
} as const

export function TextLink({ to, children, variant = 'default', inline = false, layout }: TextLinkProps) {
  return (
    <Link
      to={to}
      data-ui="TextLink"
      data-variant={variant}
      data-state="ready"
      {...(inline ? { 'data-inline-link': '' } : {})}
      className={withLayout(
        `rounded-ui underline underline-offset-2 hover:decoration-2 ${VARIANTES[variant]} ${FOCUS}`,
        layout,
      )}
    >
      {children}
    </Link>
  )
}
