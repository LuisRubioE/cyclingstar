import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * UNA SUPERFICIE QUE SE PULSA ENTERA (E3, docs/visual.md §14.4; PR 21n): abre o cierra lo suyo, con
 * `aria-expanded` y, si lo abierto tiene su sitio, `aria-controls`. Es la fila de un grupo de la barra de
 * `Watch` (Ruso-036), un `<button>` a todo lo ancho y de 44 como mínimo que lleva dentro su número, su nombre,
 * sus maillots, su km y su diferencia: lo que un `Button`, que solo lleva un texto o un icono, no puede; y la
 * capa fija de `Watch`, que se toca entera para abrir su segunda línea y se nombra con su resumen (`ariaLabel`,
 * H-05) y no con sus cifras sueltas. Lo que lleva dentro no se pulsa por su cuenta: un botón no lleva otro dentro.
 *
 * Dos variantes. `row`, la de por defecto, dice que se pulsa (punto 2 del dueño, que no sabía que la fila de
 * un grupo se abría): al final, la flecha `chevron-down` de 16 en `ink-2`, que gira al abrir como la de
 * `Disclosure` (quieta con menos movimiento), y el fondo `surface-2` al pasar el cursor o al pulsar.
 * `surface`, para lo que ya es una superficie que se ve (la capa fija, en el ámbito oscuro): sin flecha ni
 * fondo.
 */
export type ExpanderVariant = 'row' | 'surface'

const VARIANTES: Readonly<Record<ExpanderVariant, string>> = {
  row: ' hover:bg-surface-2 active:bg-surface-2',
  surface: '',
}

export interface ExpanderProps {
  readonly variant?: ExpanderVariant
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
  variant = 'row',
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
      data-variant={variant}
      data-state={expanded ? 'open' : 'closed'}
      aria-expanded={expanded}
      {...(controls !== undefined ? { 'aria-controls': controls } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      onClick={onToggle}
      className={withLayout(
        `flex min-h-11 w-full items-center gap-2 rounded-ui text-left text-meta${VARIANTES[variant]} ${FOCUS}`,
        layout,
      )}
    >
      {children}
      {variant === 'row' && (
        <span
          className={`inline-flex shrink-0 text-ink-2 transition-transform motion-reduce:transition-none${expanded ? ' rotate-180' : ''}`}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      )}
    </button>
  )
}
