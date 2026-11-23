import { type KeyboardEvent, type MouseEvent, useId, useState } from 'react'
import { buttonClass } from './Button'
import { Icon } from './Icon'
import { FOCUS, withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL CAMPO (E3, docs/visual.md §4.3; PR 9a). El rótulo encima, en `meta` 600, siempre a la vista (nunca
 * un campo sin rótulo: hoy hay cuatro, mapa 01 §7); el control de 48 (40 con ratón), `text-body` (16 px:
 * Safari del iPhone no amplía), con borde `line-strong`; la ayuda o el error debajo, en `meta`. Tres
 * variantes, `input`, `select` (nativo, con su `chevron-down`) y `textarea`, desde 96; e `inline`, con el
 * rótulo a la izquierda en el mismo renglón. Si el rótulo es el título de la fila (la semana, el día), el
 * control no lo repite y apunta a ese título con `labelledBy` (10-k).
 *
 * Estados: `ready`; `error` (el borde y el texto en `bad`, con su icono, y `aria-invalid`); `disabled`,
 * solo con su porqué y con `aria-disabled`, para que se pueda enfocar y se oiga por qué (§4.1).
 */

interface FieldBase {
  readonly id: string
  readonly label: string
  /** el título de la fila, si el rótulo es él: el control lo nombra y no se pinta otro */
  readonly labelledBy?: string
  readonly inline?: boolean
  readonly help?: string
  readonly error?: string
  readonly disabledReason?: string
  readonly layout?: Layout
}

export type FieldProps = FieldBase &
  (
    | {
        readonly kind: 'input'
        readonly value: string
        readonly onChange: (value: string) => void
        readonly type?: 'text' | 'email' | 'password' | 'number' | 'search'
        readonly autoComplete?: string
        readonly placeholder?: string
        /** con `number`, los del nativo: el disparo de las órdenes, de 0 a los km de la etapa (PR 21i) */
        readonly min?: number
        readonly max?: number
        readonly step?: number
        /**
         * solo con `password` (docs/cuenta.md §12.5; D-56): un botón `quiet` de 44 × 44 dentro del campo que
         * alterna `Show` y `Hide`, con `aria-pressed`; cambia el `type` y no toca `autocomplete`
         */
        readonly reveal?: boolean
        /** la contraseña a la vista al empezar: para el catálogo y los tests */
        readonly defaultRevealed?: boolean
      }
    | {
        readonly kind: 'select'
        readonly value: string
        readonly onChange: (value: string) => void
        readonly options: readonly { readonly value: string; readonly label: string }[]
      }
    | {
        readonly kind: 'textarea'
        readonly value: string
        readonly onChange: (value: string) => void
        readonly rows?: number
      }
  )

const CONTROL = `w-full rounded-ui border bg-surface px-3 text-body text-ink ${FOCUS}`

/** Sin cambiarse si está deshabilitado: un `select` con `aria-disabled` se abriría igual. */
const quieto = (e: MouseEvent | KeyboardEvent) => {
  if (!('key' in e) || ['ArrowUp', 'ArrowDown', ' ', 'Enter', 'Home', 'End'].includes(e.key))
    e.preventDefault()
}

export function Field(props: FieldProps) {
  const { id, label, labelledBy, inline = false, help, error, disabledReason, layout } = props
  const helpId = useId()
  const errorId = useId()
  const reasonId = useId()
  const [revealed, setRevealed] = useState(props.kind === 'input' && props.defaultRevealed === true)
  const disabled = disabledReason !== undefined
  const describedBy = [
    help !== undefined ? helpId : null,
    error !== undefined ? errorId : null,
    disabled ? reasonId : null,
  ].filter((x): x is string => x !== null)
  const estado = disabled ? 'disabled' : error !== undefined ? 'error' : 'ready'

  const borde = error !== undefined ? 'border-bad' : 'border-line-strong'
  const color = disabled ? 'bg-disabled-bg text-disabled-ink' : ''
  const comun = {
    id,
    ...(labelledBy !== undefined ? { 'aria-labelledby': labelledBy } : {}),
    ...(describedBy.length > 0 ? { 'aria-describedby': describedBy.join(' ') } : {}),
    ...(error !== undefined ? { 'aria-invalid': true as const } : {}),
    ...(disabled ? { 'aria-disabled': true as const } : {}),
  }

  let control
  if (props.kind === 'select')
    control = (
      <span className="relative block">
        <select
          {...comun}
          value={props.value}
          onChange={(e) => {
            if (!disabled) props.onChange(e.target.value)
          }}
          {...(disabled ? { onMouseDown: quieto, onKeyDown: quieto } : {})}
          className={`${CONTROL} min-h-12 appearance-none pr-12 fine:min-h-10 ${borde} ${color}`}
        >
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-ink-2">
          <Icon name="chevron-down" size={20} />
        </span>
      </span>
    )
  else if (props.kind === 'textarea')
    control = (
      <textarea
        {...comun}
        value={props.value}
        rows={props.rows ?? 4}
        readOnly={disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className={`${CONTROL} block min-h-24 py-3 ${borde} ${color}`}
      />
    )
  else {
    const reveal = props.reveal === true && props.type === 'password'
    const tipo = reveal && revealed ? 'text' : (props.type ?? 'text')
    const input = (
      <input
        {...comun}
        type={tipo}
        value={props.value}
        readOnly={disabled}
        {...(props.autoComplete !== undefined ? { autoComplete: props.autoComplete } : {})}
        {...(props.placeholder !== undefined ? { placeholder: props.placeholder } : {})}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(e) => props.onChange(e.target.value)}
        className={`${CONTROL} ${reveal ? 'min-h-12 pr-16' : 'min-h-12 fine:min-h-10'} ${borde} ${color}`}
      />
    )
    // con `reveal`, el campo no baja de 48 en un puntero fino: dentro cabe el botón de 44
    control = reveal ? (
      <span className="relative block">
        {input}
        <span className="absolute inset-y-0 right-0.5 flex items-center">
          <button
            type="button"
            data-ui="Button"
            data-variant="quiet"
            data-state={revealed ? 'active' : 'inactive'}
            aria-pressed={revealed}
            aria-controls={id}
            onClick={() => setRevealed((v) => !v)}
            className={`${buttonClass({ variant: 'quiet', size: 'default', iconOnly: true, disabled: false })} px-2`}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        </span>
      </span>
    ) : (
      input
    )
  }

  const rotulo =
    labelledBy !== undefined ? null : (
      <label
        htmlFor={id}
        className={`text-meta font-semibold text-ink${inline ? ' shrink-0' : ' block'}`}
      >
        {label}
      </label>
    )

  return (
    <div
      data-ui="Field"
      data-variant={props.kind}
      data-state={estado}
      className={withLayout(
        inline ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'grid gap-1',
        layout,
      )}
    >
      {rotulo}
      <div className={inline ? 'min-w-0 flex-1' : ''}>{control}</div>
      {help !== undefined && (
        <p id={helpId} className={`text-meta text-ink-2${inline ? ' basis-full' : ''}`}>
          {help}
        </p>
      )}
      {error !== undefined && (
        <p
          id={errorId}
          className={`flex items-center gap-1 text-meta text-bad${inline ? ' basis-full' : ''}`}
        >
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      {disabled && (
        <p id={reasonId} className={`text-meta text-ink-2${inline ? ' basis-full' : ''}`}>
          {disabledReason}
        </p>
      )}
    </div>
  )
}
