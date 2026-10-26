import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './types'

/**
 * NADA QUE ENSEÑAR, Y POR QUÉ (E3, docs/visual.md §4.2; PR 10; D-11). Lo que pinta una consulta que llega
 * vacía: el icono de 24 en `ink-3`, el porqué en `meta` `ink-2` y, si la hay, la acción que lo arregla.
 * Sin caja discontinua (hoy, nueve, como `MyRaces.tsx` l. 37-43). Un vacío dice por qué:
 * `No races in the next four weeks. This month is for building.`
 */

export interface EmptyStateProps {
  /** el porqué, en una frase */
  readonly text: string
  /** por defecto, `info` */
  readonly icon?: IconName
  /** lo que lo arregla: un `Button` o un `TextLink` */
  readonly action?: ReactNode
  /** la respuesta de la pantalla (§7.3) */
  readonly answer?: boolean
}

export function EmptyState({ text, icon = 'info', action, answer = false }: EmptyStateProps) {
  if (text.trim() === '') throw new Error('EmptyState: un vacío dice por qué')
  return (
    <div
      data-ui="EmptyState"
      data-variant={icon}
      data-state="empty"
      {...(answer ? { 'data-answer': '' } : {})}
      className="flex flex-col items-start gap-2 py-6"
    >
      <span className="inline-flex text-ink-3">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-meta text-ink-2">{text}</p>
      {action}
    </div>
  )
}
