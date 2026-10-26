import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { FOCUS, withLayout } from './styles'
import type { IconName, Layout } from './types'

/**
 * EL BOTÓN (E3, docs/visual.md §4.3 y §4.1; PR 9a). `min-h-11` (44), `rounded-ui`, `text-body` 600, con
 * un icono de 20 delante o solo el icono, de 44 × 44, con su nombre en `ariaLabel`. Cuatro variantes:
 * `primary`, `secondary` (la de por defecto), `quiet` y `danger`; `sm` baja a 32 solo con ratón (`fine:`).
 *
 * - **Deshabilitado** solo con su porqué (`disabledReason`): `aria-disabled` y no `disabled`, para que se
 *   pueda enfocar y el lector diga el porqué, que va debajo enlazado con `aria-describedby`. Nunca en un
 *   `title` (regla `ui/4`).
 * - **Ocupado** (`busy`): `aria-busy`, el indicador de 16 que gira (quieto con `prefers-reduced-motion`)
 *   y `busyLabel`; el texto en reposo se queda en su caja, invisible, para que el ancho no cambie.
 * - Con `to`, un enlace con aspecto de botón.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

interface ButtonBase {
  /** por defecto, `secondary` */
  readonly variant?: ButtonVariant
  /** `sm` pinta 32 px solo con `fine:`; con el dedo sigue en 44 */
  readonly size?: 'default' | 'sm'
  readonly busy?: boolean
  /** `Saving…`; por defecto, el mismo texto (o el `ariaLabel`) */
  readonly busyLabel?: string
  /** si está, el botón está deshabilitado y lo dice debajo; no hay otra forma de deshabilitarlo */
  readonly disabledReason?: string
  readonly type?: 'button' | 'submit'
  readonly onClick?: () => void
  /** enlace con aspecto de botón */
  readonly to?: string
  readonly layout?: Layout
}

/** Con texto (y un icono opcional delante), o solo icono, de 44 × 44, con su nombre en `ariaLabel`. */
export type ButtonProps = ButtonBase &
  (
    | {
        readonly children: string
        readonly icon?: IconName
        /** el nombre entero cuando el texto es corto: `Add Race Ardèche` */
        readonly ariaLabel?: string
      }
    | {
        readonly children?: never
        readonly icon: IconName
        /** `Account`, `Close`, `Next stage` */
        readonly ariaLabel: string
      }
  )

const VARIANTES: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong active:bg-accent-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2 active:bg-surface-2',
  quiet: 'text-accent hover:bg-surface-2 active:bg-surface-2',
  danger: 'bg-bad text-on-bad hover:brightness-90 active:brightness-90',
}

/** El aspecto de un botón del catálogo; `tall` es el de la `ActionBar`, de 48 (§4.3). */
export function buttonClass(o: {
  readonly variant: ButtonVariant
  readonly size: 'default' | 'sm'
  readonly iconOnly: boolean
  readonly disabled: boolean
  readonly tall?: boolean
}): string {
  const alto = o.tall
    ? 'min-h-12'
    : o.size === 'sm'
      ? `min-h-11 fine:min-h-8${o.iconOnly ? ' fine:min-w-8' : ''}`
      : 'min-h-11'
  const ancho = o.iconOnly ? 'min-w-11' : o.size === 'sm' ? 'px-4 fine:px-3' : 'px-4'
  const color = o.disabled
    ? `bg-disabled-bg text-disabled-ink${o.variant === 'secondary' ? ' border border-line' : ''}`
    : VARIANTES[o.variant]
  return `relative inline-flex shrink-0 items-center justify-center rounded-ui text-body font-semibold ${alto} ${ancho} ${color} ${FOCUS}`
}

/** El indicador de ocupado, de 16 px. */
function Spinner() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 animate-spin motion-reduce:animate-none"
    >
      <circle cx="12" cy="12" r="9" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  )
}

/** Lo de dentro: el icono y el texto; ocupado, el texto en reposo invisible y encima el indicador. */
export function ButtonContent({
  icon,
  text,
  busy,
  busyLabel,
}: {
  readonly icon?: IconName | undefined
  readonly text?: string | undefined
  readonly busy: boolean
  readonly busyLabel?: string | undefined
}) {
  const reposo = (
    <span className={`inline-flex items-center gap-2${busy ? ' invisible' : ''}`}>
      {icon !== undefined && <Icon name={icon} size={20} />}
      {text}
    </span>
  )
  if (!busy) return reposo
  return (
    <>
      {reposo}
      <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
        <Spinner />
        {text !== undefined && <span>{busyLabel ?? text}</span>}
      </span>
    </>
  )
}

export function Button(props: ButtonProps) {
  const { variant = 'secondary', size = 'default', busy = false, disabledReason, layout } = props
  const reasonId = useId()
  const iconOnly = props.children === undefined
  const disabled = disabledReason !== undefined
  const clases = buttonClass({ variant, size, iconOnly, disabled })
  const nombre =
    props.ariaLabel === undefined
      ? {}
      : { 'aria-label': busy && props.busyLabel !== undefined ? props.busyLabel : props.ariaLabel }
  const contenido = (
    <ButtonContent
      icon={props.icon}
      text={props.children}
      busy={busy}
      busyLabel={props.busyLabel}
    />
  )
  const estado = disabled ? 'disabled' : busy ? 'busy' : 'ready'

  if (disabled)
    return (
      <span
        data-ui="Button"
        data-variant={variant}
        data-state="disabled"
        className={withLayout('inline-flex flex-col items-start gap-1', layout)}
      >
        <button
          type={props.type ?? 'button'}
          aria-disabled="true"
          aria-describedby={reasonId}
          className={clases}
          {...nombre}
        >
          {contenido}
        </button>
        <span id={reasonId} className="text-meta text-ink-2">
          {disabledReason}
        </span>
      </span>
    )

  const comun = {
    'data-ui': 'Button',
    'data-variant': variant,
    'data-state': estado,
    ...(busy ? { 'aria-busy': true as const } : {}),
    ...nombre,
    className: withLayout(clases, layout),
  }
  if (props.to !== undefined && !busy)
    return (
      <Link to={props.to} {...comun}>
        {contenido}
      </Link>
    )
  return (
    <button type={props.type ?? 'button'} onClick={busy ? undefined : props.onClick} {...comun}>
      {contenido}
    </button>
  )
}
