/**
 * LA PISTA DE ADMINISTRADOR (E2, docs/retransmision.md §14.6 y §10.13; paso 9b). Con `BROADCAST_WATCH` o
 * `SPOILER_MODE` en `admins`, lo que pinta la web depende de si quien mira es administrador, y la web solo lo
 * sabe preguntando: `GET /api/admin/whoami` (`useWatchOn`), o el `rev` de `GET /api/me/horizon`, que con
 * `SPOILER_MODE=admins` solo es de espectador para un administrador con sesión (10-h). Preguntarlo en cada
 * carga sería una petición más para todos los jugadores en cada página del mundo, y el límite es de 300 por
 * minuto e IP; así que la respuesta se guarda en este navegador, con la cuenta a la que se refiere, y la
 * siguiente carga no pregunta a quien ya se sabe que no lo es.
 *
 * Es una comodidad del navegador, no un dato: sin almacenamiento (una ventana privada, el almacenamiento
 * bloqueado) o con otra cuenta, la web pregunta como antes, y una pista vieja (un jugador al que hacen
 * administrador) solo cambia lo que pinta la web, nunca lo que sirve el servidor, que mira la sesión en
 * cada petición; la corrige la siguiente respuesta de `whoami` (la cuenta y el panel la piden siempre).
 */

/** `cs.adminHint`: `{ userId, admin }`, la última cuenta de este navegador de la que se supo. */
export const ADMIN_HINT_KEY = 'cs.adminHint'

/** Lo que la pista necesita del almacenamiento: `localStorage` en el navegador; un doble en los tests. */
export type HintStorage = Pick<Storage, 'getItem' | 'setItem'>

/** El `localStorage` del navegador, o null: en una ventana privada o bloqueado, leerlo puede lanzar. */
function browserStorage(): HintStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Lo que dice la pista de esa cuenta: undefined si no dice nada de ella. Nunca lanza. */
export function readAdminHint(
  userId: string,
  storage: HintStorage | null = browserStorage(),
): boolean | undefined {
  try {
    const raw = storage?.getItem(ADMIN_HINT_KEY)
    if (raw == null) return undefined
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return undefined
    const { userId: who, admin } = v as { userId?: unknown; admin?: unknown }
    return who === userId && typeof admin === 'boolean' ? admin : undefined
  } catch {
    return undefined
  }
}

/** Guarda lo que se acaba de saber de esa cuenta. Nunca lanza: lleno o bloqueado, se volverá a preguntar. */
export function writeAdminHint(
  userId: string,
  admin: boolean,
  storage: HintStorage | null = browserStorage(),
): void {
  try {
    if (readAdminHint(userId, storage) === admin) return
    storage?.setItem(ADMIN_HINT_KEY, JSON.stringify({ userId, admin }))
  } catch {
    // lleno o bloqueado: la próxima carga preguntará otra vez
  }
}
