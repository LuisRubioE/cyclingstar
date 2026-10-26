import { type ReactNode, useId, useState } from 'react'
import { Icon } from './Icon'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * LO PLEGADO (E3, docs/visual.md §4.3; PR 9a, I-33). Para lo que no es el porqué de una línea (eso es
 * `InfoButton`): el día a día del cuadro, que el dueño quiere debajo de la escalera ([DUEÑO 11]). Un botón
 * `quiet` a todo lo ancho, de 44, con su `chevron-down`, que gira al abrir (quieto con
 * `prefers-reduced-motion`), y la región debajo, nombrada por el botón.
 */

export interface DisclosureProps {
  /** `Show the 28 days` */
  readonly showLabel: string
  /** `Hide the 28 days` */
  readonly hideLabel: string
  readonly children: ReactNode
  readonly defaultOpen?: boolean
  readonly layout?: Layout
}

export function Disclosure({
  showLabel,
  hideLabel,
  children,
  defaultOpen = false,
  layout,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const buttonId = useId()
  const regionId = useId()
  return (
    <div
      data-ui="Disclosure"
      data-variant="default"
      data-state={open ? 'open' : 'closed'}
      className={withLayout('grid', layout)}
    >
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-ui px-3 text-left text-body font-semibold text-accent hover:bg-surface-2 active:bg-surface-2 ${FOCUS}`}
      >
        <span>{open ? hideLabel : showLabel}</span>
        <span
          className={`inline-flex transition-transform motion-reduce:transition-none${open ? ' rotate-180' : ''}`}
        >
          <Icon name="chevron-down" size={20} />
        </span>
      </button>
      <div id={regionId} role="region" aria-labelledby={buttonId} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
