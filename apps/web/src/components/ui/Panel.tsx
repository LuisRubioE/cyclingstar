import { type ReactNode, useId } from 'react'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL PANEL (E3, docs/visual.md §4.4; PR 9a). La unidad de la página: `surface` con su filete `line`, el
 * radio del tema y `shadow-card`; el título, un `h2` en `text-title`, en una línea de 44 con una acción
 * opcional de 44 a la derecha; relleno de 12, y de 16 desde 640. Sin `overflow-hidden`: hoy recorta
 * (`components/Panel.tsx` l. 22). `bleed` quita el relleno lateral del cuerpo, para las tablas. Con
 * `answer`, el panel es lo que contesta la pantalla (`data-answer`, §7.3).
 */

export interface PanelProps {
  /** sin título, el panel no lleva `h2` y necesita `ariaLabel` */
  readonly title?: string
  readonly ariaLabel?: string
  /** un `Button` `quiet` o un `TextLink`, de 44 */
  readonly action?: ReactNode
  readonly variant?: 'default' | 'bleed'
  readonly answer?: boolean
  readonly children: ReactNode
  readonly layout?: Layout
}

export function Panel({
  title,
  ariaLabel,
  action,
  variant = 'default',
  answer = false,
  children,
  layout,
}: PanelProps) {
  const titleId = useId()
  if (title === undefined && ariaLabel === undefined)
    throw new Error('Panel: sin título, necesita ariaLabel')
  const nombre = title !== undefined ? { 'aria-labelledby': titleId } : { 'aria-label': ariaLabel }
  const lateral = variant === 'bleed' ? 'py-3 sm:py-4' : 'p-3 sm:p-4'
  return (
    <section
      data-ui="Panel"
      data-variant={variant}
      data-state="ready"
      {...(answer ? { 'data-answer': '' } : {})}
      {...nombre}
      className={withLayout('rounded-ui border border-line bg-surface shadow-card', layout)}
    >
      {title !== undefined && (
        <div className="flex min-h-11 items-center justify-between gap-2 px-3 pt-1 sm:px-4">
          <h2 id={titleId} className="text-title text-ink">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={lateral}>{children}</div>
    </section>
  )
}
