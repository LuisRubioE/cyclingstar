/**
 * LOS FINALES (docs/cuenta.md §12.4; principio 1; D-56): cada acción de la cuenta acaba con una frase, un
 * `Notice` `good` con `role="status"` en la página a la que lleva. Llega por el estado del router
 * (`{ arrival: 'password-saved' }`) o, si la página se recarga entera (borrar la cuenta), por
 * `sessionStorage`, que se lee una vez y se borra.
 */
export interface Arrival {
  readonly title: string
  readonly body: string
  /** `good` salvo que se diga; L3 cerró la sesión es `warn` (§12.4) */
  readonly tone?: 'good' | 'warn'
}

export type ArrivalKey = 'password-saved' | 'account-deleted' | 'signed-out-passwords'

export const ARRIVALS: Readonly<Record<ArrivalKey, Arrival>> = {
  'password-saved': {
    title: 'Password saved',
    body: 'Log in with your new password. You have been signed out everywhere else.',
  },
  'account-deleted': { title: 'Your account is deleted', body: 'Thanks for playing.' },
  // L3 cerró esta sesión al décimo intento malo del día (docs/cuenta.md §7.4 y §12.4)
  'signed-out-passwords': {
    title: 'Signed out',
    body: 'You were signed out after too many wrong passwords.',
    tone: 'warn',
  },
}

/** La clave de `sessionStorage` del final que cruza una recarga. */
export const ARRIVAL_STORAGE_KEY = 'cs.arrival'

const esClave = (v: unknown): v is ArrivalKey => typeof v === 'string' && v in ARRIVALS

/** El final que trae el estado del router, o ninguno. */
export function arrivalOf(state: unknown): Arrival | null {
  const key =
    typeof state === 'object' && state !== null ? (state as { arrival?: unknown }).arrival : null
  return esClave(key) ? ARRIVALS[key] : null
}

/**
 * El final guardado para después de una recarga. Se lee al montar (como estado inicial) y se borra en un
 * efecto, para que el doble montaje del modo estricto no lo pierda.
 */
export function readStoredArrival(): Arrival | null {
  try {
    const key = sessionStorage.getItem(ARRIVAL_STORAGE_KEY)
    return esClave(key) ? ARRIVALS[key] : null
  } catch {
    return null
  }
}

export function clearStoredArrival(): void {
  try {
    sessionStorage.removeItem(ARRIVAL_STORAGE_KEY)
  } catch {
    // nada que borrar
  }
}

/** Guarda el final para la página que se cargará entera. */
export function storeArrival(key: ArrivalKey): void {
  try {
    sessionStorage.setItem(ARRIVAL_STORAGE_KEY, key)
  } catch {
    // sin almacenamiento (modo privado estricto): la acción se hizo igual, solo falta la frase
  }
}
