import { type ReactNode, useEffectEvent, useId, useLayoutEffect, useRef } from 'react'
import { Button } from './Button'

/**
 * LA HOJA A PANTALLA COMPLETA (E3, docs/visual.md §4.4 y §8.10; PR 17c; 8-w). Un `<dialog>` modal con fondo
 * `surface`, una cabecera de 48 con el título en `text-title` y `close` de 44 × 44, y el cuerpo debajo, a
 * todo lo ancho: lo de dentro pone su margen, y el maillot de 320 cabe a 320 px sin él. Al abrirse, el
 * foco va a `close` y se añade una entrada de historial, para que el «atrás» del sistema la cierre; la
 * cierran `close`, `Escape` y el «atrás», y al cerrarse el foco vuelve a lo que la abrió.
 *
 * Quien la pinta la abre y la cierra (`open`, `onClose`). Cerrar con `close` o `Escape` es volver atrás en
 * el historial, y la vuelta avisa a `onClose`: así la entrada nunca se queda detrás. La conducta vive en
 * funciones puras (`sheetEntry`, `isSheetEntry` y `sheetReaction`), que se prueban sin DOM.
 */

export interface SheetProps {
  readonly open: boolean
  /** el título de la hoja, que la nombra (`aria-labelledby`) */
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
}

/** La clave con que la entrada de historial de una hoja guarda su id, junto al estado del router. */
const SHEET_KEY = 'cyclingstarSheet'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** La entrada que añade la hoja: el estado de hoy, que el router necesita intacto, con su id. */
export function sheetEntry(state: unknown, id: string): Record<string, unknown> {
  return { ...(isRecord(state) ? state : {}), [SHEET_KEY]: id }
}

/** Si la entrada de historial de ahora es la de esa hoja. */
export function isSheetEntry(state: unknown, id: string): boolean {
  return isRecord(state) && state[SHEET_KEY] === id
}

/** Lo que pasa: `close` o `Escape`, el «atrás» del sistema (`popstate`) o que quien la pinta la quite. */
export type SheetCause = 'close' | 'escape' | 'back' | 'gone'
/** Lo que hace la hoja: volver atrás en el historial, avisar a `onClose`, o nada. */
export type SheetReaction = 'historyBack' | 'notify' | 'none'

/**
 * Qué hace la hoja ante cada cosa, sabiendo si su entrada sigue arriba. `close` y `Escape` vuelven atrás si
 * la entrada sigue, y el «atrás» que eso provoca avisa; sin entrada, avisan ya. El «atrás» avisa cuando la
 * entrada se ha ido. Si quien la pinta la quita con la entrada arriba, la hoja la quita sin avisar.
 */
export function sheetReaction(cause: SheetCause, entryOnTop: boolean): SheetReaction {
  if (cause === 'back') return entryOnTop ? 'none' : 'notify'
  if (cause === 'gone') return entryOnTop ? 'historyBack' : 'none'
  return entryOnTop ? 'historyBack' : 'notify'
}

/** Las hojas montadas: en `StrictMode` el efecto se desmonta y se monta seguido, y la entrada se queda. */
const montadas = new Set<string>()

function OpenSheet({ title, onClose, children }: Omit<SheetProps, 'open'>) {
  const id = useId()
  const titleId = `${id}-title`
  const dialog = useRef<HTMLDialogElement>(null)
  const avisa = useEffectEvent(onClose)

  useLayoutEffect(() => {
    const el = dialog.current
    if (el === null) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    montadas.add(id)
    if (!el.open) el.showModal()
    if (!isSheetEntry(history.state, id)) history.pushState(sheetEntry(history.state, id), '')
    el.querySelector<HTMLElement>('header button')?.focus()
    const onPop = () => {
      if (sheetReaction('back', isSheetEntry(history.state, id)) === 'notify') avisa()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      montadas.delete(id)
      if (el.open) el.close()
      if (opener?.isConnected === true) opener.focus()
      // tras el desmontaje de `StrictMode`, que vuelve a montarla en el acto, la entrada se queda
      setTimeout(() => {
        if (montadas.has(id)) return
        if (sheetReaction('gone', isSheetEntry(history.state, id)) === 'historyBack') history.back()
      }, 0)
    }
  }, [id])

  const cierra = (cause: 'close' | 'escape') => {
    if (sheetReaction(cause, isSheetEntry(history.state, id)) === 'historyBack') history.back()
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      data-ui="Sheet"
      data-variant="default"
      data-state="open"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        cierra('escape')
      }}
      className="m-0 hidden h-dvh max-h-none w-full max-w-none flex-col border-0 bg-surface p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-ink open:flex"
    >
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-line pr-1 pl-3">
        <h2 id={titleId} className="min-w-0 text-title text-ink">
          {title}
        </h2>
        <Button variant="quiet" icon="close" ariaLabel="Close" onClick={() => cierra('close')} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-3">{children}</div>
    </dialog>
  )
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  if (!open) return null
  return (
    <OpenSheet title={title} onClose={onClose}>
      {children}
    </OpenSheet>
  )
}
