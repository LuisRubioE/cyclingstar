/**
 * LO QUE TRAE UN ENLACE DE CORREO AL LLEGAR A SU PÁGINA DE BOTÓN (docs/cuenta.md §5.2; D-12, I-04).
 *
 * Los correos llevan el token en el fragmento (`/verify-email#token=…`, `/reset-password#token=…`), que el
 * navegador no manda al servidor. La página lo lee, lo borra de la barra (`forgetLinkToken`) y no cambia
 * nada hasta que se pulsa.
 *
 * Los enlaces viejos, enviados antes del PR 8 de E4, siguen valiendo `LEGACY_LINK_GRACE_DAYS` (hasta el PR
 * 19): pasan por la API, que confirma o comprueba y redirige aquí con `?token=…` (recuperar), con `?error=…`
 * si el enlace ya no valía, o sin nada si la confirmación fue bien. Leer eso es lógica pura, así que vive
 * aquí y no dentro de una página.
 */

/** Lo que dice un enlace de correo: trae su token, ya falló (enlace viejo), o no trae nada. */
export type EmailLink =
  | { readonly kind: 'token'; readonly token: string }
  | { readonly kind: 'error'; readonly code: string }
  | { readonly kind: 'none' }

/**
 * Lee el enlace: el token del fragmento manda; luego, los dos parámetros de los enlaces viejos (el error,
 * antes que el token).
 */
export function readEmailLink(hash: string, search: string): EmailLink {
  const fragmento = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  if (fragmento) return { kind: 'token', token: fragmento }
  const query = new URLSearchParams(search)
  const error = query.get('error')
  if (error) return { kind: 'error', code: error }
  const token = query.get('token')
  if (token) return { kind: 'token', token }
  return { kind: 'none' }
}

/**
 * Borra el token de la barra sin recargar (`history.replaceState`, §5.2): no queda en el historial ni en
 * lo que se copie de la barra. Solo si la dirección lo lleva.
 */
export function forgetLinkToken(loc: Pick<Location, 'pathname' | 'search' | 'hash'>, h: History) {
  if (/token=/.test(loc.hash) || /token=/.test(loc.search)) h.replaceState(null, '', loc.pathname)
}
