import { useId } from 'react'
import { Icon } from './Icon'
import { FOCUS } from './styles'

/**
 * LA FECHA EN TRES CAMPOS (docs/cuenta.md §12.5; D-04, D-56). `Day`, `Month` y `Year` en una fila de 64, 64 y
 * 96 px (caben a 320: 224 más dos huecos de 8), numéricos y con el `autocomplete` de la fecha de nacimiento:
 * el navegador que la tenga la rellena de un toque, y si no son ocho cifras. Un `<input type="date">` en
 * Android abre el mes en curso y llegar a 2008 cuesta unos cinco toques. El foco no salta solo de un campo
 * a otro. Con `error`, los tres llevan `aria-invalid` y `aria-describedby` al mensaje.
 *
 * Estados (con su sitio en `/_ui`): vacío, lleno, con error y deshabilitado.
 */

export interface DateFieldValue {
  day: string
  month: string
  year: string
}

export interface DateFieldProps {
  /** el prefijo de los ids de los tres campos (`<id>-day`, `<id>-month`, `<id>-year`): la página lleva el foco */
  id: string
  label: string
  hint?: string
  value: DateFieldValue
  onChange: (next: DateFieldValue) => void
  error?: string
  disabled?: boolean
}

export const EMPTY_DATE: DateFieldValue = { day: '', month: '', year: '' }

/** `YYYY-MM-DD` con ceros, o null si falta un trozo. No valida la fecha: eso es birthDateSchema. */
export function toIsoDate(value: DateFieldValue): string | null {
  const day = value.day.trim()
  const month = value.month.trim()
  const year = value.year.trim()
  if (day === '' || month === '' || year === '') return null
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** El primer trozo vacío, para llevarle el foco; null si están los tres. */
export function firstEmptyPart(value: DateFieldValue): keyof DateFieldValue | null {
  for (const k of ['day', 'month', 'year'] as const) if (value[k].trim() === '') return k
  return null
}

const PARTES = [
  { key: 'day', label: 'Day', max: 2, auto: 'bday-day', width: 'w-16' },
  { key: 'month', label: 'Month', max: 2, auto: 'bday-month', width: 'w-16' },
  { key: 'year', label: 'Year', max: 4, auto: 'bday-year', width: 'w-24' },
] as const

export function DateField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  disabled = false,
}: DateFieldProps) {
  const hintId = useId()
  const errorId = useId()
  const describedBy = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
    .filter((x): x is string => x !== null)
    .join(' ')
  const estado = disabled ? 'disabled' : error !== undefined ? 'error' : 'ready'
  const borde = error !== undefined ? 'border-bad' : 'border-line-strong'
  const color = disabled ? 'bg-disabled-bg text-disabled-ink' : 'bg-surface text-ink'

  return (
    <fieldset data-ui="DateField" data-state={estado} className="grid gap-1">
      <legend className="mb-1 text-meta font-semibold text-ink">{label}</legend>
      <div className="flex gap-2">
        {PARTES.map((p) => (
          <div key={p.key} className="grid gap-1">
            <label htmlFor={`${id}-${p.key}`} className="text-meta text-ink-2">
              {p.label}
            </label>
            <input
              id={`${id}-${p.key}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={p.max}
              autoComplete={p.auto}
              value={value[p.key]}
              disabled={disabled}
              {...(describedBy !== '' ? { 'aria-describedby': describedBy } : {})}
              {...(error !== undefined ? { 'aria-invalid': true as const } : {})}
              onChange={(e) => onChange({ ...value, [p.key]: e.target.value })}
              className={`${p.width} min-h-12 rounded-ui border px-3 text-body fine:min-h-10 ${FOCUS} ${borde} ${color}`}
            />
          </div>
        ))}
      </div>
      {hint !== undefined && (
        <p id={hintId} className="text-meta text-ink-2">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className="flex items-center gap-1 text-meta text-bad">
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
    </fieldset>
  )
}
