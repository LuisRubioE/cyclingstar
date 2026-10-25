import { type KeyboardEvent, useId, useRef } from 'react'
import { FOCUS_INSET, withLayout } from './styles'
import type { Layout } from './types'

/**
 * LA ELECCIÓN ENTRE POCAS (E3, docs/visual.md §4.3; PR 9a). De 2 a 4 opciones del mismo ancho a todo lo
 * ancho, de 44 como mínimo, en `meta` 600; el texto de una opción parte en dos renglones si no cabe y
 * nunca se corta. La activa, `bg-accent`; las demás, `bg-surface`. Es lo que se conmuta (un `Chip` no se
 * pulsa nunca). Un `radiogroup` con índice móvil y flechas, como `Tabs`; deshabilitado, solo con su
 * porqué, debajo.
 */

export interface SegmentedOption<K extends string> {
  readonly key: K
  readonly label: string
}

export interface SegmentedProps<K extends string> {
  /** el nombre del grupo, para el lector: `Who decides your training` */
  readonly label: string
  readonly options: readonly SegmentedOption<K>[]
  readonly value: K
  readonly onChange: (key: K) => void
  readonly disabledReason?: string
  readonly layout?: Layout
}

export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
  disabledReason,
  layout,
}: SegmentedProps<K>) {
  const reasonId = useId()
  const botones = useRef<(HTMLButtonElement | null)[]>([])
  const disabled = disabledReason !== undefined
  if (options.length < 2 || options.length > 4)
    throw new Error(`Segmented: de 2 a 4 opciones, y hay ${options.length}`)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return
    const i = options.findIndex((o) => o.key === value)
    if (i < 0) return
    const n = options.length
    let j = i
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') j = (i + 1) % n
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') j = (i - 1 + n) % n
    else if (event.key === 'Home') j = 0
    else if (event.key === 'End') j = n - 1
    else return
    event.preventDefault()
    const destino = options[j]
    if (destino === undefined) return
    onChange(destino.key)
    botones.current[j]?.focus()
  }

  return (
    <div
      data-ui="Segmented"
      data-variant="default"
      data-state={disabled ? 'disabled' : 'ready'}
      className={withLayout('grid gap-1', layout)}
    >
      <div
        role="radiogroup"
        aria-label={label}
        {...(disabled ? { 'aria-disabled': true as const, 'aria-describedby': reasonId } : {})}
        onKeyDown={onKeyDown}
        className="flex w-full rounded-ui border border-line-strong"
      >
        {options.map((o, i) => {
          const activa = o.key === value
          const color = disabled
            ? 'bg-disabled-bg text-disabled-ink'
            : activa
              ? 'bg-accent text-on-accent'
              : 'bg-surface text-ink hover:bg-surface-2'
          return (
            <button
              key={o.key}
              ref={(el) => {
                botones.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={activa}
              tabIndex={activa ? 0 : -1}
              data-state={activa ? 'active' : 'inactive'}
              onClick={() => {
                if (!disabled && !activa) onChange(o.key)
              }}
              className={`flex min-h-11 flex-1 basis-0 items-center justify-center px-2 text-center text-meta font-semibold whitespace-normal first:rounded-l-ui last:rounded-r-ui ${
                i > 0 ? 'border-l border-line-strong' : ''
              } ${color} ${FOCUS_INSET}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {disabled && (
        <p id={reasonId} className="text-meta text-ink-2">
          {disabledReason}
        </p>
      )}
    </div>
  )
}
