import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * LA RED Y LA SESIÓN (E3, docs/visual.md §12.1; PR 4, D-47). Hoy, cuando la página llega y la respuesta
 * de la sesión no (una red que se cae a mitad de carga, un túnel), quien tiene sesión ve `Log in`:
 * `ProtectedRoute` leía una sesión que no llega como «sin sesión» (X-03). La sesión tiene tres estados, y
 * el tercero, `unknown`, no lleva nunca a `/login`.
 *
 * Sin el cliente de better-auth a propósito: `api/request.ts` importa de aquí, y no tiene por qué cargarlo.
 * El hook que lee la sesión está en `auth/useSessionState.ts`.
 */

/** La sesión, vista desde la web: la hay, no la hay o no se sabe (la red no la trajo). */
export type SessionState = 'signed-in' | 'signed-out' | 'unknown'

/** Toda petición a la API se corta a los 15 s (`AbortSignal.timeout` en `api/request.ts`; §4.2). */
export const REQUEST_TIMEOUT_MS = 15_000

/** Lo que `authClient.useSession()` da y la regla necesita. */
export interface SessionAnswer {
  readonly data: unknown
  readonly error: unknown
}

/**
 * La regla, de cómo responde better-auth 1.6.25 (§12.1): sin sesión, `get-session` contesta 200 con
 * `null` (`api/routes/session.mjs` l. 191), y un fallo de red deja `data` como estaba (`null` en una
 * carga en frío) con `error` lleno (`client/session-atom.mjs` l. 88-98 y 110-122). Así que hay sesión si
 * hay datos; no la hay si no hay datos ni error, o si el error es un 401; y cualquier otra cosa no se sabe.
 */
export function sessionStateOf({ data, error }: SessionAnswer): SessionState {
  if (data !== null && data !== undefined) return 'signed-in'
  if (error === null || error === undefined) return 'signed-out'
  return statusOf(error) === 401 ? 'signed-out' : 'unknown'
}

/** El `status` de un error de better-auth (`BetterFetchError`), si lo trae. */
function statusOf(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null
  const status = (error as { status: unknown }).status
  return typeof status === 'number' ? status : null
}

/**
 * LA MARCA `cs:signed-in`: este navegador tuvo sesión la última vez que se supo. Se pone con `signed-in`
 * y se quita con `signed-out`; con `unknown` no se toca. La lee la cabecera, que con `unknown` y la marca
 * pinta la del jugador, sin nada de la cuenta. Es una comodidad del navegador, no un dato: el servidor
 * mira la sesión en cada petición.
 */
export const SIGNED_IN_MARK = 'cs:signed-in'

/** Lo que la marca necesita del almacenamiento: `localStorage` en el navegador; un doble en los tests. */
export type MarkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** El `localStorage` del navegador, o null: en una ventana privada o bloqueado, leerlo puede lanzar. */
function browserStorage(): MarkStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Apunta lo que se supo de la sesión: `signed-in` pone la marca, `signed-out` la quita. Nunca lanza. */
export function writeSignedInMark(
  state: SessionState,
  storage: MarkStorage | null = browserStorage(),
): void {
  try {
    if (state === 'signed-in') storage?.setItem(SIGNED_IN_MARK, '1')
    else if (state === 'signed-out') storage?.removeItem(SIGNED_IN_MARK)
  } catch {
    // sin almacenamiento, sin marca: la cabecera pinta la del visitante con `unknown`
  }
}

/** ¿Tuvo sesión este navegador la última vez que se supo? Nunca lanza. */
export function readSignedInMark(storage: MarkStorage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(SIGNED_IN_MARK) === '1'
  } catch {
    return false
  }
}

/** ¿Hay red? La de React Query (`onlineManager`), que escucha `online` y `offline` del navegador. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  )
}
