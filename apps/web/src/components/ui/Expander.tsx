import type { ReactNode } from 'react'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * UNA SUPERFICIE QUE SE PULSA ENTERA (E3, docs/visual.md §14.4; PR 21n): abre o cierra lo suyo, con
 * `aria-expanded` y, si lo abierto tiene su sitio, `aria-controls`. Es la fila de un grupo de la barra de
 * `Watch` (Ruso-036), un `<button>` a todo lo ancho y de 44 como mínimo que lleva dentro su número, su nombre,
 * sus maillots, su km y su diferencia: lo que un `Button`, que solo lleva un texto o un icono, no puede; y la
 * capa fija de `Watch`, que se toca entera para abrir su segunda línea y se nombra con su resumen (`ariaLabel`,
 * H-05) y no con sus cifras sueltas. Lo que lleva dentro no se pulsa por su cuenta: un botón no lleva otro dentro.
 */
export interface ExpanderProps {
  readonly expanded: boolean
  /** el `id` de lo que abre, si está en la página aunque esté cerrado */
  readonly controls?: string
  readonly onToggle: () => void
  /** su nombre, cuando lo que lleva dentro no lo dice bien leído de corrido */
  readonly ariaLabel?: string
  readonly children: ReactNode
  readonly layout?: Layout
}

export function Expander({
  expanded,
  controls,
  onToggle,
  ariaLabel,
  children,
  layout,
}: ExpanderProps) {
  return (
    <button
      type="button"
      data-ui="Expander"
      data-variant="default"
      data-state={expanded ? 'open' : 'closed'}
      aria-expanded={expanded}
      {...(controls !== undefined ? { 'aria-controls': controls } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      onClick={onToggle}
      className={withLayout(
        `flex min-h-11 w-full items-center gap-2 rounded-ui text-left text-meta ${FOCUS}`,
        layout,
      )}
    >
      {children}
    </button>
  )
}
