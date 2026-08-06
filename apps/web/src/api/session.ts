/**
 * Sesión caducada: puente entre la capa de datos (que no conoce el router) y la navegación.
 *
 * Antes no había nada global: `ProtectedRoute` solo miraba la sesión al montar, así que si la
 * sesión caducaba navegando, cada página se comportaba a su manera y nadie llevaba a /login.
 * Ahora cualquier 401 inesperado (QueryCache/MutationCache) avisa por aquí y el componente que
 * vive dentro del Router hace el `navigate`.
 */

type UnauthorizedHandler = () => void

let handler: UnauthorizedHandler | null = null

/** Registra quién sabe navegar. Devuelve la función para darse de baja (cleanup del efecto). */
export function setUnauthorizedHandler(next: UnauthorizedHandler): () => void {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

/** Avisa de una sesión ausente o caducada. Sin router registrado, recarga en /login. */
export function notifyUnauthorized(): void {
  if (handler) {
    handler()
    return
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}
