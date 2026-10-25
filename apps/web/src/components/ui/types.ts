/**
 * LOS TIPOS DEL CATÁLOGO (E3, docs/visual.md §4; PR 9a). Los comparten los componentes de `ui/` y quien
 * los usa.
 */

export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info'

export type ColumnPriority = 'primary' | 'secondary' | 'optional'

/** Los valores de `data-state` (§4.1), con `veiled` (la RankTable velada) y `readonly` (KitPicker, §8.7). */
// prettier-ignore
export type UiState =
  | 'ready' | 'loading' | 'slow' | 'error' | 'empty' | 'offline' | 'disabled' | 'busy' | 'dirty'
  | 'saving' | 'saved' | 'failed' | 'open' | 'closed' | 'active' | 'inactive' | 'hidden' | 'veiled'
  | 'readonly'

/** Los 26 iconos de §3.7, que pinta `Icon` desde `icons.tsx` (lo escribe `scripts/ui-icons.mjs`). */
// prettier-ignore
export type IconName =
  | 'home' | 'rider' | 'team' | 'world' | 'news' | 'account' | 'travel' | 'race'
  | 'check' | 'warning' | 'error' | 'info' | 'offline' | 'retry' | 'close' | 'more'
  | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'star-full' | 'star-half' | 'star-empty' | 'trend' | 'share' | 'play' | 'pause'

/** Solo margen, ancho y sitio en la rejilla (D-10); vocabulario.test.ts comprueba sus clases (§5.2). */
export type Layout = string
