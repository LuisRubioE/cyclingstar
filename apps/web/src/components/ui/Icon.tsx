import { ICONS } from './icons'
import { withLayout } from './styles'
import type { IconName, Layout } from './types'

/**
 * UN ICONO (E3, docs/visual.md §3.7 y §4.6; PR 9a): uno de los 26 de `icons.tsx`, a 16, 20 o 24 px, en el
 * color del texto (`currentColor`). Con `label` se lee (`role="img"`); sin él no, porque lo dice el texto
 * de al lado (D-07). `turn` gira la flecha de `trend` en pasos de 45°: de `-90`, hacia arriba, a `90`.
 */

export interface IconProps {
  readonly name: IconName
  readonly size?: 16 | 20 | 24
  readonly label?: string
  readonly turn?: -90 | -45 | 0 | 45 | 90
  readonly layout?: Layout
}

export function Icon({ name, size = 20, label, turn = 0, layout }: IconProps) {
  const lectura =
    label === undefined
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': label }
  return (
    <svg
      data-ui="Icon"
      data-variant={name}
      data-state="ready"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={withLayout('shrink-0', layout)}
      {...lectura}
    >
      {turn === 0 ? ICONS[name] : <g transform={`rotate(${turn} 12 12)`}>{ICONS[name]}</g>}
    </svg>
  )
}
