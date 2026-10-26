import { type ReactNode, useId } from 'react'
import { Link } from 'react-router-dom'
import { type ButtonVariant, ButtonContent, buttonClass } from './Button'
import { Chip } from './Chip'
import { FOCUS_INSET, withLayout } from './styles'
import type { Layout, Tone } from './types'

/**
 * UNA FILA CON SU ACCIÓN (E3, docs/visual.md §4.5; PR 9b). Sustituye a las filas de `TeamCalendar` y de
 * `MyRaces`, que hoy se recortan sin `Add` ni `Drop` (captura 15). Dos renglones de 64 al menos: el
 * primero en `row` `ink` (la carrera y su clase), el segundo en `meta` `ink-2` (`Day 59 · FR · Travel 336
 * · 2 days out, 2 back`), que parte de línea si no cabe; y a la derecha, a 8 px, un botón de 44 de alto y
 * 72 de ancho al menos, con el nombre entero (`Add Race Ardèche`). Con `href`, **el enlace es el bloque de
 * los dos renglones** y el botón queda fuera: un enlace de solo el primer renglón mediría 20 de alto, y
 * la comprobación 5 lo contaría (Ruso-009).
 *
 * Deshabilitado, el porqué en un tercer renglón enlazado al botón (`Not enough money for the trip`);
 * ocupado, el botón con su indicador; hecha, un `Chip` en lugar del botón (`Called up`). Es un `<li>`:
 * va en un `<ul>`.
 */

export interface ActionRowProps {
  /** `Race Ardèche` y su clase */
  readonly title: ReactNode
  /** el segundo renglón */
  readonly meta: ReactNode
  /** los dos renglones enlazan, en bloque, a la carrera */
  readonly href?: string
  readonly action?: {
    /** `Add` */
    readonly label: string
    /** `Add Race Ardèche` */
    readonly ariaLabel: string
    readonly onClick: () => void
    readonly variant?: 'primary' | 'secondary' | 'danger'
    readonly busy?: boolean
    readonly busyLabel?: string
    readonly disabledReason?: string
  }
  /** lo ya hecho, en lugar del botón: `{ text: 'Called up', tone: 'good' }` */
  readonly done?: { readonly text: string; readonly tone: Tone }
  readonly layout?: Layout
}

export function ActionRow({ title, meta, href, action, done, layout }: ActionRowProps) {
  const reasonId = useId()
  const disabled = action?.disabledReason !== undefined
  const busy = action?.busy === true && !disabled
  const state = done !== undefined ? 'ready' : disabled ? 'disabled' : busy ? 'busy' : 'ready'
  const variant: ButtonVariant | 'done' =
    done !== undefined ? 'done' : (action?.variant ?? 'secondary')
  const renglones = (
    <>
      <span className="block text-row text-ink">{title}</span>
      <span className="block text-meta text-ink-2">{meta}</span>
    </>
  )

  return (
    <li
      data-ui="ActionRow"
      data-variant={variant}
      data-state={state}
      className={withLayout('flex items-center gap-2', layout)}
    >
      <div className="min-w-0 flex-1">
        {href === undefined ? (
          <div className="flex min-h-16 flex-col justify-center py-2 fine:min-h-12">
            {renglones}
          </div>
        ) : (
          <Link
            to={href}
            className={`flex min-h-16 flex-col justify-center rounded-ui py-2 fine:min-h-12 ${FOCUS_INSET}`}
          >
            {renglones}
          </Link>
        )}
        {disabled && (
          <p id={reasonId} className="pb-2 text-meta text-ink-2">
            {action?.disabledReason}
          </p>
        )}
      </div>
      {done !== undefined ? (
        <Chip tone={done.tone}>{done.text}</Chip>
      ) : (
        action !== undefined && (
          <button
            type="button"
            aria-label={
              busy && action.busyLabel !== undefined ? action.busyLabel : action.ariaLabel
            }
            {...(disabled ? { 'aria-disabled': true as const, 'aria-describedby': reasonId } : {})}
            {...(busy ? { 'aria-busy': true as const } : {})}
            onClick={disabled || busy ? undefined : action.onClick}
            className={`min-w-18 ${buttonClass({
              variant: action.variant ?? 'secondary',
              size: 'default',
              iconOnly: false,
              disabled,
            })}`}
          >
            <ButtonContent text={action.label} busy={busy} busyLabel={action.busyLabel} />
          </button>
        )
      )}
    </li>
  )
}
