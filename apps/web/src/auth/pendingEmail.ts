/**
 * EL CORREO QUE ESPERA CONFIRMACIÓN (docs/cuenta.md §5.3): tras registrarse, la web lo guarda en
 * `sessionStorage` (`cs.pendingEmail`) y `Register` enseña `CheckInbox`, que así sobrevive a recargar y a
 * volver atrás. `Start again` y entrar lo borran. Sin almacenamiento, `CheckInbox` sigue, sin sobrevivir.
 */
export const PENDING_EMAIL_KEY = 'cs.pendingEmail'

export function readPendingEmail(): string | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(PENDING_EMAIL_KEY)
  } catch {
    return null
  }
}

export function writePendingEmail(email: string): void {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email)
  } catch {
    // sin almacenamiento: CheckInbox se ve, pero no sobrevive a recargar
  }
}

export function clearPendingEmail(): void {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // nada que borrar
  }
}
