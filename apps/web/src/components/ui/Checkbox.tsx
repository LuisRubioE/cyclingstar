import { Icon } from './Icon'
import { withLayout } from './styles'
import type { Layout, UiState } from './types'

/**
 * LA CASILLA (E3, PR 21i). La pide lo que se marca de varios a la vez, que ni `Segmented` (de 2 a 4, una sola)
 * ni `Field` eligen: los equipos con los que no se tira, en la pantalla de órdenes. Una fila de 44 a todo lo
 * ancho, con su rótulo a la vista en `row`, que nombra a la casilla. El `input` nativo, invisible, cubre la
 * fila entera, que es lo que el dedo toca; la caja de 24 que se ve la pinta su vecina, con el borde
 * `line-strong` y, marcada, en `accent` con su `check`, y en ella el anillo del foco. Su estado, el de `UiState`:
 * `active`, marcada, o `inactive`.
 */

export interface CheckboxProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly layout?: Layout
}

export function Checkbox({ label, checked, onChange, layout }: CheckboxProps) {
  const estado: UiState = checked ? 'active' : 'inactive'
  return (
    <label
      data-ui="Checkbox"
      data-variant="default"
      data-state={estado}
      className={withLayout(
        'relative flex min-h-11 cursor-pointer items-center gap-3 text-row text-ink',
        layout,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      />
      <span
        aria-hidden="true"
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-ui border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${
          checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface'
        }`}
      >
        {checked && <Icon name="check" size={16} />}
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  )
}
