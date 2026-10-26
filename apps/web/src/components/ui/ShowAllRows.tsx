import { TOP_ROWS } from '../ShowAll'
import { ButtonContent, buttonClass } from './Button'

/**
 * `SHOW ALL` DE UNA LISTA (E3, docs/visual.md §4.5; PR 12a). Se ven las 20 primeras filas (`TOP_ROWS`, de
 * `ShowAll.tsx`) y siempre hay salida para las demás: un botón `secondary` a todo lo ancho y de 44, con
 * cuántas son (`Show all 85`) y `aria-expanded`; abierta, `Show top 20`. Con 20 o menos, no se pinta. Lo
 * usan `RankTable` y las listas de `ActionRow`.
 */
export function ShowAllRows({
  total,
  expanded,
  onToggle,
}: {
  readonly total: number
  readonly expanded: boolean
  readonly onToggle: () => void
}) {
  if (total <= TOP_ROWS) return null
  return (
    <button
      type="button"
      aria-expanded={expanded}
      data-ui="ShowAllRows"
      onClick={onToggle}
      className={`w-full ${buttonClass({ variant: 'secondary', size: 'default', iconOnly: false, disabled: false })}`}
    >
      <ButtonContent text={expanded ? `Show top ${TOP_ROWS}` : `Show all ${total}`} busy={false} />
    </button>
  )
}
