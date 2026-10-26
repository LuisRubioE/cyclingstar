import type { IconName, Tone } from './types'

/**
 * LO QUE COMPARTEN LOS COMPONENTES (E3, docs/visual.md §4.1 y §3.2; PR 9a): el foco y los tonos. Las
 * clases van enteras, para que Tailwind las vea.
 */

/** El foco (§4.1): un anillo de 2 px a 2 px del borde (6,70:1 sobre `surface`). Nadie lo quita. */
export const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

/** El mismo anillo por dentro, para lo que vive en un carril que recorta (las pestañas). */
export const FOCUS_INSET =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus'

/** Un tono (§3.2): su texto, su fondo, su borde y su icono. */
export interface ToneStyle {
  readonly text: string
  readonly bg: string
  readonly border: string
  readonly icon: IconName | null
}

export const TONES: Readonly<Record<Tone, ToneStyle>> = {
  neutral: { text: 'text-ink-2', bg: 'bg-surface-2', border: 'border-ink-2', icon: null },
  accent: { text: 'text-on-accent', bg: 'bg-accent', border: 'border-on-accent', icon: null },
  good: { text: 'text-good', bg: 'bg-good-bg', border: 'border-good', icon: 'check' },
  warn: { text: 'text-warn', bg: 'bg-warn-bg', border: 'border-warn', icon: 'warning' },
  bad: { text: 'text-bad', bg: 'bg-bad-bg', border: 'border-bad', icon: 'error' },
  info: { text: 'text-accent', bg: 'bg-info-bg', border: 'border-accent', icon: 'info' },
}

/** Las clases de `layout` (margen, ancho y sitio en la rejilla), detrás de las propias. */
export const withLayout = (classes: string, layout: string | undefined): string =>
  layout === undefined || layout === '' ? classes : `${classes} ${layout}`
