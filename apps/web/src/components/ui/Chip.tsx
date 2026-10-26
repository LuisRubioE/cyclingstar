import { Icon } from './Icon'
import { TONES } from './styles'
import type { Tone } from './types'

/**
 * LA CHAPA (E3, docs/visual.md §4.7; PR 9a, D-13). De 24 de alto, en `caption` 600, con los colores de
 * su tono y su icono de 16 delante (`good`, `check`; `warn`, `warning`; `bad`, `error`;
 * `info`, `info`; `neutral` y `accent`, sin icono). Nunca se pulsa: lo que se conmuta es un
 * `Segmented`. Siempre con texto: el tono solo no dice nada a quien no ve el color.
 */

export interface ChipProps {
  /** el icono sale del tono */
  readonly tone: Tone
  /** obligatorio; un texto vacío no es una chapa */
  readonly children: string
}

export function Chip({ tone, children }: ChipProps) {
  if (children.trim() === '') throw new Error('Chip: sin texto')
  const t = TONES[tone]
  return (
    <span
      data-ui="Chip"
      data-variant={tone}
      data-state="ready"
      className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-caption font-semibold ${t.text} ${t.bg}`}
    >
      {t.icon !== null && <Icon name={t.icon} size={16} />}
      {children}
    </span>
  )
}
