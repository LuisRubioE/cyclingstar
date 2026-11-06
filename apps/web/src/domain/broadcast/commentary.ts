/**
 * `Commentary`, COMO LO DEJÓ CADA ESPECTADOR (W2a, la revisión de `Watch` del dueño, su punto 7: «no se ve lo
 * de atrás»): abierto o cerrado, en el `localStorage` del navegador, para que la próxima etapa se abra igual.
 * Sin nada guardado, cerrado, como lo diseñó E2 (§6.1). Es una comodidad de quien mira, no un dato: si no hay
 * almacenamiento (una ventana privada, el bloqueado), cerrado y sin recordar, y nunca lanza.
 */

/** La clave: fuera de `cs.watch.<raceKey>.<day>`, la de lo alcanzado (11-p). */
export const COMMENTARY_KEY = 'cs.commentary'

/** Lo que se usa de `Storage`: `localStorage` en la web, un doble en los tests. */
export type CommentaryStorage = Pick<Storage, 'getItem' | 'setItem'>

/** El `localStorage` del navegador, o null: en una ventana privada o bloqueado, leerlo puede lanzar. */
function browserStorage(): CommentaryStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** ¿Lo dejó abierto? Sin nada guardado o sin almacenamiento, no. Nunca lanza. */
export function readCommentaryOpen(storage: CommentaryStorage | null = browserStorage()): boolean {
  try {
    return storage?.getItem(COMMENTARY_KEY) === '1'
  } catch {
    return false
  }
}

/** Lo apunta, abierto o cerrado. Nunca lanza. */
export function writeCommentaryOpen(
  open: boolean,
  storage: CommentaryStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(COMMENTARY_KEY, open ? '1' : '0')
  } catch {
    // sin almacenamiento, sin recuerdo: la próxima vez se abre cerrado
  }
}
