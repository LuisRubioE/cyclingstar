import { type ReactNode, useId, useState } from 'react'
import { Icon } from './Icon'
import { FOCUS } from './styles'

/**
 * EL PORQUÉ DE UNA LÍNEA (E3, docs/visual.md §4.3; PR 9a). Sustituye a los 23 `title` que el dedo no
 * abre (regla `ui/4`): el icono `info` de 20 en un objetivo de 44 × 44 que despliega el porqué debajo de
 * su línea, en el flujo, en una caja `surface-2`, sin ventana. Su raíz no hace caja (`contents`), así que
 * el botón va en la línea de quien lo pone y la caja, en una fila flexible que parte, pasa al renglón
 * siguiente (`basis-full`). El `label` es obligatorio y concreto: `About travel days`.
 */

export interface InfoButtonProps {
  readonly label: string
  /** el porqué, en una o dos frases */
  readonly children: ReactNode
  readonly defaultOpen?: boolean
}

export function InfoButton({ label, children, defaultOpen = false }: InfoButtonProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <span
      data-ui="InfoButton"
      data-variant="default"
      data-state={open ? 'open' : 'closed'}
      className="contents"
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ui text-accent hover:bg-surface-2 active:bg-surface-2 ${FOCUS}`}
      >
        <Icon name="info" size={20} />
      </button>
      <span
        id={id}
        hidden={!open}
        className="block w-full basis-full rounded-ui bg-surface-2 p-3 text-meta text-ink-2"
      >
        {children}
      </span>
    </span>
  )
}
