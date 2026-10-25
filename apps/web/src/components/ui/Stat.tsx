import { money } from '../../domain/format'
import { withLayout } from './styles'
import type { Layout } from './types'

/**
 * UNA CIFRA CON SU RÓTULO (E3, docs/visual.md §4.4; PR 9a). El rótulo en versales `caption` 600
 * `ink-3`; la cifra en `text-display` con `tabular-nums`. El dinero con signo (`signed`) va en `good` o
 * `bad` y siempre con su signo (`+780`, `−80`, D-13); el cero, sin signo y en `ink` (hoy, `−0` en rosa,
 * captura 03). Un `<dl>` con su `<dt>` y su `<dd>`: hoy fallan `dlitem` y `definition-list` en las
 * fichas (mapa 05 §11). Cargando, la cifra es un esqueleto de 40 (el de `Skeleton`, en el PR 10).
 */

export interface StatProps {
  /** `Balance` */
  readonly label: string
  readonly value: string | number
  /** dinero con signo: `+780` en `good`, `−80` en `bad`, `0` en `ink` */
  readonly signed?: boolean
  readonly loading?: boolean
  readonly layout?: Layout
}

/** Lo que se lee y su color. */
export function statFigure(value: string | number, signed: boolean): { text: string; tone: string } {
  if (typeof value === 'string') return { text: value, tone: 'text-ink' }
  if (!signed) return { text: value.toLocaleString('en-US'), tone: 'text-ink' }
  return { text: money(value), tone: value > 0 ? 'text-good' : value < 0 ? 'text-bad' : 'text-ink' }
}

export function Stat({ label, value, signed = false, loading = false, layout }: StatProps) {
  const { text, tone } = statFigure(value, signed)
  return (
    <dl
      data-ui="Stat"
      data-variant={signed ? 'signed' : 'default'}
      data-state={loading ? 'loading' : 'ready'}
      className={withLayout('grid gap-1', layout)}
    >
      <dt className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{label}</dt>
      <dd className={`text-display tabular-nums ${tone}`}>
        {loading ? (
          <span
            aria-hidden="true"
            className="block h-10 w-32 animate-pulse rounded-ui bg-surface-2 motion-reduce:animate-none"
          />
        ) : (
          text
        )}
      </dd>
    </dl>
  )
}
