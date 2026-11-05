import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { FOCUS, withLayout } from './styles'
import type { IconName, Layout } from './types'

/**
 * EL BOTÓN (E3, docs/visual.md §4.3 y §4.1; PR 9a). `min-h-11` (44), `rounded-ui`, `text-body` 600, con
 * un icono de 20 delante o solo el icono, de 44 × 44, con su nombre en `ariaLabel`. Cinco variantes:
 * `primary`, `secondary` (la de por defecto), `quiet`, `danger` y, desde el PR 21n, `control`, el mando de
 * una barra (`meta`, más estrecho, encendido en `accent`); `sm` baja a 32 solo con ratón (`fine:`).
 *
 * - **Deshabilitado** solo con su porqué (`disabledReason`): `aria-disabled` y no `disabled`, para que se
 *   pueda enfocar y el lector diga el porqué, que va debajo enlazado con `aria-describedby`. Nunca en un
 *   `title` (regla `ui/4`).
 * - **Ocupado** (`busy`): `aria-busy`, el indicador de 16 que gira (quieto con `prefers-reduced-motion`)
 *   y `busyLabel`; el texto en reposo se queda en su caja, invisible, para que el ancho no cambie.
 * - Con `to`, un enlace con aspecto de botón.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'control'

interface ButtonBase {
  /** `sm` pinta 32 px solo con `fine:`; con el dedo sigue en 44 */
  readonly size?: 'default' | 'sm'
  readonly busy?: boolean
  /** `Saving…`; por defecto, el mismo texto (o el `ariaLabel`) */
  readonly busyLabel?: string
  /** si está, el botón está deshabilitado y lo dice debajo; no hay otra forma de deshabilitarlo */
  readonly disabledReason?: string
  /**
   * el porqué, solo para el lector: en una barra de mandos cuya disposición fija E2 (los de `Watch`), donde
   * escrito debajo partiría la fila; el ojo ve el mando apagado y el lector oye por qué (PR 21n)
   */
  readonly reasonHidden?: boolean
  /** lo que despliega otra cosa: `aria-expanded`, con `controls`, su `aria-controls` (PR 21n) */
  readonly expanded?: boolean
  readonly controls?: string
  readonly type?: 'button' | 'submit'
  readonly onClick?: () => void
  readonly layout?: Layout
}

/**
 * La variante, y con ella si se conmuta y si es un enlace. Un mando que se conmuta (`pressed`: `aria-pressed`,
 * y encendido con el relleno de `accent`) es un `control`, y nunca un enlace: con otra variante se anunciaría
 * pulsado sin verse distinto, y en un enlace `aria-pressed` no vale (revisión del 21n).
 */
type ButtonKind =
  | { readonly variant: 'control'; readonly pressed?: boolean; readonly to?: never }
  | {
      /** por defecto, `secondary` */
      readonly variant?: Exclude<ButtonVariant, 'control'>
      readonly pressed?: never
      /** enlace con aspecto de botón */
      readonly to?: string
    }

/** Con texto (y un icono opcional delante), o solo icono, de 44 × 44, con su nombre en `ariaLabel`. */
export type ButtonProps = ButtonBase &
  ButtonKind &
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
  // el mando de una barra (PR 21n): apagado, la tinta del ámbito y su fondo al pasar
  control: 'text-ink hover:bg-surface-2 active:bg-surface-2',
}

/**
 * El mando encendido, el de la opción activa de un `Segmented` (§4.3), nunca junto al apagado: de dos clases del
 * mismo estado gana la que Tailwind pone después en la hoja, no la de después en el atributo (PR 20).
 */
const ENCENDIDO = 'bg-accent text-on-accent hover:bg-accent-strong active:bg-accent-strong'

/** El aspecto de un botón del catálogo; `tall` es el de la `ActionBar`, de 48 (§4.3). */
export function buttonClass(o: {
  readonly variant: ButtonVariant
  readonly size: 'default' | 'sm'
  readonly iconOnly: boolean
  readonly disabled: boolean
  readonly tall?: boolean
  readonly pressed?: boolean
}): string {
  const alto = o.tall
    ? 'min-h-12'
    : o.size === 'sm'
      ? `min-h-11 fine:min-h-8${o.iconOnly ? ' fine:min-w-8' : ''}`
      : 'min-h-11'
  // el mando de una barra, más estrecho y en `meta`, para que la fila parta lo menos posible (PR 21n)
  const control = o.variant === 'control'
  const ancho = control
    ? 'min-w-11 px-2 sm:px-3'
    : o.iconOnly
      ? 'min-w-11'
      : o.size === 'sm'
        ? 'px-4 fine:px-3'
        : 'px-4'
  const color = o.disabled
    ? control
      ? 'text-disabled-ink'
      : `bg-disabled-bg text-disabled-ink${o.variant === 'secondary' ? ' border border-line' : ''}`
    : control && o.pressed === true
      ? ENCENDIDO
      : VARIANTES[o.variant]
  const letra = control ? 'text-meta' : 'text-body'
  return `relative inline-flex shrink-0 items-center justify-center rounded-ui ${letra} font-semibold ${alto} ${ancho} ${color} ${FOCUS}`
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
  const clases = buttonClass({
    variant,
    size,
    iconOnly,
    disabled,
    ...(props.pressed !== undefined ? { pressed: props.pressed } : {}),
  })
  // lo que dice el botón de sí mismo: si se conmuta y si despliega algo (PR 21n)
  const aria = {
    ...(props.pressed !== undefined ? { 'aria-pressed': props.pressed } : {}),
    ...(props.expanded !== undefined ? { 'aria-expanded': props.expanded } : {}),
    ...(props.controls !== undefined ? { 'aria-controls': props.controls } : {}),
  }
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
  // su estado, como el de las piezas que hacen lo mismo (revisión del 21n): el que se conmuta, `active` o
  // `inactive`, como `Segmented` y `Checkbox`; el que despliega, `open` o `closed`, como `Disclosure`
  const estado = disabled
    ? 'disabled'
    : busy
      ? 'busy'
      : props.pressed !== undefined
        ? props.pressed
          ? 'active'
          : 'inactive'
        : props.expanded !== undefined
          ? props.expanded
            ? 'open'
            : 'closed'
          : 'ready'

  // EL PORQUÉ SOLO PARA EL LECTOR (revisión del 21n): la raíz es el mismo `button` que encendido, para que
  // React lo reutilice y el foco no caiga al `body` cuando un mando se apaga con el foco encima (Next action
  // al entrar en el último km); y el porqué va detrás, con `hidden`, que `aria-describedby` lee igual y que
  // no se oye otra vez al recorrer la página
  if (disabled && props.reasonHidden === true)
    return (
      <>
        <button
          type={props.type ?? 'button'}
          data-ui="Button"
          data-variant={variant}
          data-state="disabled"
          aria-disabled="true"
          aria-describedby={reasonId}
          className={withLayout(clases, layout)}
          {...nombre}
          {...aria}
        >
          {contenido}
        </button>
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      </>
    )

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
          {...aria}
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
    ...aria,
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
