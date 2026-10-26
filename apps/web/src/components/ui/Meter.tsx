import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * EL MEDIDOR (E3, docs/visual.md §4.8; PR 9b). Sustituye a las barras con cifra (`Freshness 16 / 100`,
 * `Home.tsx` l. 354), a `ProgressMark` y al TSS: cuatro segmentos de 8 px de alto con 4 de hueco, los
 * llenos en `accent` (4,29:1 contra el vacío) y los vacíos en `line`, y a su lado la palabra en `meta`:
 * `Freshness: low`. Nunca la cifra. Con cinco pasos cuenta los cerillos, `3 of 5` (decisión 4-c). Sin
 * dato, los segmentos vacíos y `No data yet`. Es un `role="meter"` con su valor en palabras.
 */

export interface MeterProps {
  /** `Freshness`, `Load this month`, `Matches` */
  readonly label: string
  /** los segmentos llenos, de 0 a `steps`; null, sin dato */
  readonly value: number | null
  /** 4 por defecto; 5, los cerillos del día */
  readonly steps?: 4 | 5
  /** la palabra: `low`, `hard`; con 5 pasos, por defecto `3 of 5` */
  readonly valueText?: string
  readonly layout?: Layout
}

export const METER_EMPTY = 'No data yet'

/** Lo que se lee del valor: la palabra, o `3 of 5`, o `No data yet` sin dato. */
export function meterText(value: number | null, steps: 4 | 5, valueText?: string): string {
  if (value === null) return METER_EMPTY
  if (valueText !== undefined) return valueText
  if (steps === 5) return `${value} of ${steps}`
  throw new Error('Meter: con cuatro pasos, la palabra es obligatoria (nunca la cifra)')
}

export function Meter({ label, value, steps = 4, valueText, layout }: MeterProps) {
  const lleno = value === null ? 0 : Math.min(steps, Math.max(0, Math.round(value)))
  const texto = meterText(value === null ? null : lleno, steps, valueText)
  return (
    <div
      data-ui="Meter"
      data-variant={steps === 5 ? 'count' : 'level'}
      data-state={value === null ? 'empty' : 'ready'}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps}
      aria-valuenow={lleno}
      aria-valuetext={texto}
      className={withLayout('flex flex-wrap items-center gap-x-2 gap-y-1', layout)}
    >
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            data-segment={i < lleno ? 'on' : 'off'}
            className={`h-2 w-5 rounded-full ${i < lleno ? 'bg-accent' : 'bg-line'}`}
          />
        ))}
      </span>
      <span aria-hidden="true" className="text-meta text-ink-2">
        {label}: {texto}
      </span>
    </div>
  )
}
