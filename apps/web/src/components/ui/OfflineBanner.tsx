import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useOnline } from '../../net'
import { OfflineIcon } from './OfflineState'

/**
 * EL AVISO DE QUE NO HAY RED (E3, docs/visual.md §4.7 y §12.1; PR 4, D-47 e I-29). Una franja de 32 px
 * bajo la cabecera, en el flujo y no fija: `You're offline. Showing what you saw at 14:02.`, con la hora
 * de lo que la página enseña, porque en el teléfono no se distingue una general de esta mañana de una de
 * ayer; al volver la red, `Back online` dos segundos. Sin red y sin nada visto, `You're offline.`
 *
 * Nace con las clases de hoy y pasa a los tokens en el PR 9a (17-c); su test mira `data-*` y ARIA.
 */

/** Lo que pinta la franja: nada, sin red (con la hora de lo visto, si la hay) o de vuelta. */
export type OfflineBannerState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'offline'; readonly seenAt: number | null }
  | { readonly kind: 'ready' }

/** Los milisegundos que dura `Back online`. */
export const BACK_ONLINE_MS = 2000

/** La hora de un instante en el reloj del jugador, `14:02`. */
export const clockTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/**
 * Lo que la cabecera monta en toda página y no dice nada de lo que la página enseña: el reloj del mundo,
 * el horizonte, quién mira y el resumen del corredor. Se refrescan solos, y contarlos haría parecer más
 * reciente lo que se ve.
 */
const SHELL_KEYS: readonly QueryKey[] = [
  ['health'],
  ['horizon'],
  ['admin-whoami'],
  ['rider', 'summary'],
]

const isShell = (key: QueryKey): boolean =>
  SHELL_KEYS.some((shell) => shell.every((part, i) => key[i] === part))

/**
 * Cuándo llegó lo que la página enseña: la respuesta más reciente de las consultas que tiene montadas,
 * sin las de la cabecera. Hasta que `QueryView` (PR 10) diga cuál es la principal, la más reciente es
 * la mejor medida de «lo que viste». `null` si no hay ninguna con datos.
 */
export function lastSeenAt(client: QueryClient): number | null {
  let last = 0
  for (const q of client.getQueryCache().findAll({ type: 'active' }))
    if (q.state.data !== undefined && !isShell(q.queryKey))
      last = Math.max(last, q.state.dataUpdatedAt)
  return last > 0 ? last : null
}

/** La franja para un estado dado: lo que pinta, sin red ni temporizadores (se prueba sola). */
export function OfflineBannerView({ state }: { state: OfflineBannerState }) {
  if (state.kind === 'hidden') return null
  if (state.kind === 'ready')
    return (
      <div
        role="status"
        data-ui="OfflineBanner"
        data-state="ready"
        className="flex min-h-8 items-center gap-2 bg-emerald-50 px-4 text-sm text-slate-900"
      >
        <CheckIcon />
        <span>Back online</span>
      </div>
    )
  return (
    <div
      role="status"
      data-ui="OfflineBanner"
      data-state="offline"
      className="flex min-h-8 items-center gap-2 bg-amber-50 px-4 text-sm text-slate-900"
    >
      <OfflineIcon size={16} className="shrink-0 text-amber-700" />
      <span>
        You&apos;re offline.
        {state.seenAt !== null && <> Showing what you saw at {clockTime(state.seenAt)}.</>}
      </span>
    </div>
  )
}

/**
 * La franja, con la red de React Query: aparece al perderla y dice `Back online` al volver. La hora se
 * sigue mientras no hay red: navegar a otra página vista cambia lo que se enseña, y con ello su hora.
 */
export function OfflineBanner() {
  const online = useOnline()
  const client = useQueryClient()
  const subscribe = useCallback(
    (onChange: () => void) => client.getQueryCache().subscribe(onChange),
    [client],
  )
  const seenAt = useSyncExternalStore(
    subscribe,
    () => lastSeenAt(client),
    () => null,
  )
  const [backOnline, setBackOnline] = useState(false)
  const wasOffline = useRef(false)
  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      setBackOnline(false)
      return
    }
    if (!wasOffline.current) return
    wasOffline.current = false
    setBackOnline(true)
    const t = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS)
    return () => clearTimeout(t)
  }, [online])
  const state: OfflineBannerState = !online
    ? { kind: 'offline', seenAt }
    : backOnline
      ? { kind: 'ready' }
      : { kind: 'hidden' }
  return <OfflineBannerView state={state} />
}

/** El icono `check` hasta los iconos del catálogo, en el 9a. */
function CheckIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-emerald-700"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}
