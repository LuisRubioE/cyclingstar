import { type Ref, useEffect, useId, useState } from 'react'
import { useOnline } from '../../net'
import { ButtonContent, buttonClass } from './Button'
import { useFixedPiece } from './fixedBottom'
import { Icon } from './Icon'
import { useKeyboardOpen } from './keyboard'

/**
 * LA BARRA DE GUARDAR (E3, docs/visual.md §4.3 y §4.9; PR 9a, D-12). Fija abajo, sobre la `BottomNav`
 * (en `--action-bar-bottom`, que el marco escribe con su alto medido desde el PR 11; 0 en `/_ui`), de 60:
 * a la izquierda lo que cambia al guardar, en dos renglones como mucho y entero para el lector; a la derecha
 * un botón `primary` de 48 con `data-primary-action`, el que mira la prueba del teléfono (la
 * comprobación 8). Una sola por página.
 *
 * Sin cambios no se pinta. `saving`, el botón ocupado; `saved`, `Saved` dos segundos y se va; `failed`,
 * el fallo y `Retry`; sin red pasa sola a `offline` y los cambios esperan en memoria, sin reintentarse
 * solos; con el teclado abierto se esconde (`keyboard.ts`); y deshabilitada, solo con su porqué, que va
 * en el sitio de lo que cambia.
 */

export type ActionBarStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface ActionBarProps {
  /** cambios sin guardar; con 0 e `idle` la barra no se pinta */
  readonly changes: number
  /** lo que cambia al guardar, sin el recuento: `Race Var: Fine (was Loaded)` */
  readonly consequence: string
  /** `Save plan`, `Save kit`, `Save orders` */
  readonly actionLabel: string
  readonly status: ActionBarStatus
  readonly onSave: () => void
  readonly disabledReason?: string
}

export type ActionBarState =
  'hidden' | 'dirty' | 'saving' | 'saved' | 'failed' | 'offline' | 'disabled'

/** Lo que dura `Saved`. */
export const SAVED_MS = 2000

export const ACTION_BAR_OFFLINE = "You're offline. Your changes stay here until you reconnect."
export const ACTION_BAR_FAILED = 'Could not save. Try again.'

/** `2 changes · Race Var: Fine (was Loaded)` */
export function changesText(changes: number, consequence: string): string {
  const n = `${changes} ${changes === 1 ? 'change' : 'changes'}`
  return consequence === '' ? n : `${n} · ${consequence}`
}

/** El estado de la barra, de lo que sabe la página y de la red, el teclado y el reloj de `Saved`. */
export function actionBarState(o: {
  readonly changes: number
  readonly status: ActionBarStatus
  readonly online: boolean
  readonly keyboardOpen: boolean
  readonly savedExpired: boolean
  readonly disabledReason?: string | undefined
}): ActionBarState {
  if (o.keyboardOpen) return 'hidden'
  if (o.status === 'saving') return 'saving'
  if (o.status === 'saved') return o.savedExpired ? 'hidden' : 'saved'
  if (o.changes === 0 && o.status === 'idle') return 'hidden'
  if (!o.online) return 'offline'
  if (o.status === 'failed') return 'failed'
  if (o.disabledReason !== undefined) return 'disabled'
  return 'dirty'
}

/** La barra para un estado dado: lo que pinta, sin red, teclado ni temporizadores (se prueba sola). */
export function ActionBarView({
  state,
  changes,
  consequence,
  actionLabel,
  onSave,
  disabledReason,
  ref,
}: Omit<ActionBarProps, 'status'> & {
  readonly state: ActionBarState
  /** el de lo fijo (`useFixedPiece`), que pone `ActionBar`; en `/_ui`, ninguno */
  readonly ref?: Ref<HTMLDivElement>
}) {
  const textId = useId()
  if (state === 'hidden') return null

  const bloqueado = state === 'offline' || state === 'disabled'
  const texto =
    state === 'saved' ? (
      <p
        id={textId}
        role="status"
        className="flex min-w-0 flex-1 items-center gap-2 text-meta text-ink"
      >
        <span className="inline-flex text-good">
          <Icon name="check" size={20} />
        </span>
        Saved
      </p>
    ) : (
      <p
        id={textId}
        data-clip-ok=""
        {...(state === 'failed' ? { role: 'alert' } : {})}
        className={`line-clamp-2 min-w-0 flex-1 text-meta ${state === 'failed' ? 'text-bad' : 'text-ink-2'}`}
      >
        {state === 'failed'
          ? ACTION_BAR_FAILED
          : state === 'offline'
            ? ACTION_BAR_OFFLINE
            : state === 'disabled'
              ? disabledReason
              : changesText(changes, consequence)}
      </p>
    )

  return (
    <div
      ref={ref}
      data-ui="ActionBar"
      data-variant="default"
      data-state={state}
      role="region"
      aria-label="Unsaved changes"
      aria-describedby={textId}
      className="fixed inset-x-0 bottom-[var(--action-bar-bottom)] z-30 border-t border-line bg-surface shadow-bar"
    >
      <div className="mx-auto flex min-h-15 w-full max-w-page items-center gap-3 px-3">
        {texto}
        {state !== 'saved' && (
          <button
            type="button"
            data-primary-action=""
            {...(state === 'saving' ? { 'aria-busy': true as const } : {})}
            {...(bloqueado ? { 'aria-disabled': true as const, 'aria-describedby': textId } : {})}
            onClick={state === 'dirty' || state === 'failed' ? onSave : undefined}
            className={buttonClass({
              variant: 'primary',
              size: 'default',
              iconOnly: false,
              disabled: bloqueado,
              tall: true,
            })}
          >
            <ButtonContent
              text={state === 'failed' ? 'Retry' : actionLabel}
              busy={state === 'saving'}
              busyLabel="Saving…"
            />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * La barra, con la red, el teclado y los dos segundos de `Saved`; apuntada en lo fijo, para que el marco
 * la sume a su relleno de abajo (PR 11).
 */
export function ActionBar(props: ActionBarProps) {
  const ref = useFixedPiece('bar')
  const online = useOnline()
  const keyboardOpen = useKeyboardOpen()
  const [savedExpired, setSavedExpired] = useState(false)
  useEffect(() => {
    if (props.status !== 'saved') {
      setSavedExpired(false)
      return
    }
    const t = setTimeout(() => setSavedExpired(true), SAVED_MS)
    return () => clearTimeout(t)
  }, [props.status])
  const state = actionBarState({
    changes: props.changes,
    status: props.status,
    online,
    keyboardOpen,
    savedExpired,
    disabledReason: props.disabledReason,
  })
  return <ActionBarView ref={ref} state={state} {...props} />
}
