/* GENERADO por apps/web/scripts/ui-icons.mjs (E3, docs/visual.md §3.7 y §3.8; PR 9a): no se edita a mano. */

import type { ReactElement } from 'react'
import type { IconName } from './types'

/** El sha256 de las fuentes, `apps/web/scripts/icons/<nombre>.svg`: `\n<nombre>\n` y sus bytes, en orden alfabético. */
export const ICONS_SHA256 = '229bc6a4c51d1becca0ec4ef169c15f7e6bbd157a2377ed778d8acf9ddabc23d'

/**
 * Lo de dentro de cada icono, sobre la rejilla de 24 u. El `svg` lo pone `Icon`: `viewBox="0 0 24 24"`,
 * `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}` y los extremos y las uniones redondeados.
 */
export const ICONS: Readonly<Record<IconName, ReactElement>> = {
  account: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.5" r="3.25" />
      <path d="M6.6 18.9 A6.5 6.5 0 0 1 17.4 18.9" />
    </>
  ),
  check: (
    <>
      <polyline points="3.5 12.5 9 18 20.5 6.5" />
    </>
  ),
  'chevron-down': (
    <>
      <polyline points="6 9 12 15 18 9" />
    </>
  ),
  'chevron-left': (
    <>
      <polyline points="15 6 9 12 15 18" />
    </>
  ),
  'chevron-right': (
    <>
      <polyline points="9 6 15 12 9 18" />
    </>
  ),
  close: (
    <>
      <path d="M6 6 L18 18" />
      <path d="M18 6 L6 18" />
    </>
  ),
  error: (
    <>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
      <path d="M9 9 L15 15" />
      <path d="M15 9 L9 15" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 L12 3 L21 10.5" />
      <polyline points="5 8.83 5 21 19 21 19 8.83" />
      <polyline points="10 21 10 15 14 15 14 21" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11 V16" />
      <path d="M12 7.75 H12.01" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  news: (
    <>
      <path d="M5 20 H19 A2 2 0 0 0 21 18 V6 A2 2 0 0 0 19 4 H9 A2 2 0 0 0 7 6 V18 A2 2 0 0 1 5 20 A2 2 0 0 1 3 18 V10.5 A1.5 1.5 0 0 1 4.5 9 H7" />
      <path d="M10.5 8.5 H17.5" />
      <path d="M10.5 12.5 H17.5" />
      <path d="M10.5 16 H14.5" />
    </>
  ),
  offline: (
    <>
      <path d="M14.9 19 H7.5 A4.5 4.5 0 0 1 6.5 10.11" />
      <path d="M9.29 5.18 A6 6 0 0 1 18.41 11.26 A4 4 0 0 1 20.68 16.57" />
      <path d="M3 3 L21 21" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="2" height="14" />
      <rect x="15" y="5" width="2" height="14" />
    </>
  ),
  play: (
    <>
      <polygon points="8 5 19.5 12 8 19" />
      <polygon points="9.5 7.67 16.62 12 9.5 16.33" />
      <polygon points="11 10.34 13.73 12 11 13.66" />
      <path d="M8 5 L11.93 12 L8 19 M11.93 12 L19.5 12" />
    </>
  ),
  race: (
    <>
      <path d="M5 21 V3.5" />
      <rect x="5" y="3.5" width="14" height="10" />
      <rect x="7" y="5.5" width="2" height="2" />
      <rect x="15" y="5.5" width="2" height="2" />
      <rect x="11" y="9.5" width="2" height="2" />
    </>
  ),
  retry: (
    <>
      <path d="M19 13 A7 7 0 1 1 12 6" />
      <polyline points="12 3.25 14.75 6 12 8.75" />
    </>
  ),
  rider: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4.5 21 A7.5 6.5 0 0 1 19.5 21" />
    </>
  ),
  share: (
    <>
      <circle cx="17.5" cy="6" r="2.75" />
      <circle cx="6.5" cy="12" r="2.75" />
      <circle cx="17.5" cy="18" r="2.75" />
      <path d="M8.92 10.68 L15.08 7.32" />
      <path d="M8.92 13.32 L15.08 16.68" />
    </>
  ),
  'star-empty': (
    <>
      <polygon points="12 3.41 14.51 9.45 21.04 9.97 16.07 14.23 17.58 20.59 12 17.18 6.42 20.59 7.93 14.23 2.96 9.97 9.49 9.45" />
    </>
  ),
  'star-full': (
    <>
      <polygon
        points="12 3.41 14.51 9.45 21.04 9.97 16.07 14.23 17.58 20.59 12 17.18 6.42 20.59 7.93 14.23 2.96 9.97 9.49 9.45"
        fill="currentColor"
      />
    </>
  ),
  'star-half': (
    <>
      <polygon
        points="12 3.41 9.49 9.45 2.96 9.97 7.93 14.23 6.42 20.59 12 17.18"
        fill="currentColor"
        stroke="none"
      />
      <polygon points="12 3.41 14.51 9.45 21.04 9.97 16.07 14.23 17.58 20.59 12 17.18 6.42 20.59 7.93 14.23 2.96 9.97 9.49 9.45" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M3 20.5 A6 6 0 0 1 15 20.5" />
      <path d="M15.5 4 A3.5 3.5 0 0 1 15.5 11" />
      <path d="M18.65 15.99 A5.5 5.5 0 0 1 21 20.5" />
    </>
  ),
  travel: (
    <>
      <path d="M12 3 C12.9 3 13.5 3.8 13.5 4.8 V9.5 L21 14 V15.5 L13.5 13 V17.5 L16 19.5 V21 L12 20 L8 21 V19.5 L10.5 17.5 V13 L3 15.5 V14 L10.5 9.5 V4.8 C10.5 3.8 11.1 3 12 3 Z" />
    </>
  ),
  trend: (
    <>
      <path d="M4 12 H20" />
      <polyline points="14 6 20 12 14 18" />
    </>
  ),
  warning: (
    <>
      <polygon points="12 3.5 21.5 20 2.5 20" />
      <path d="M12 9.5 V13.5" />
      <path d="M12 16.75 H12.01" />
    </>
  ),
  world: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="3.75" ry="9" />
      <path d="M3 12 H21" />
    </>
  ),
}
