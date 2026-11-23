import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getMeAccount } from '../api/account'
import { useSessionState } from '../auth/useSessionState'
import { LoadingState } from './ui/QueryView'

/** La clave de `GET /api/me/account`: la puerta de la fecha la invalida al guardar. */
export const ME_ACCOUNT_KEY = ['me-account'] as const

/** La página de la puerta de la fecha (docs/cuenta.md §4.5). */
export const BIRTH_DATE_PAGE = '/account/birth-date'

/**
 * Las páginas privadas que la puerta de la fecha no cierra (D-09): borrar la cuenta y la propia puerta.
 * `/privacy` y `/terms` son públicas y `Sign out` está en la cabecera, así que tampoco las cierra.
 */
const SIN_PUERTA: ReadonlySet<string> = new Set([BIRTH_DATE_PAGE, '/account/delete'])

/** ¿Lleva la ruta a la puerta de la fecha? Solo si la cuenta dice que no tiene fecha y la página no es de las de fuera. */
export function needsBirthDate(birthDateSet: boolean | undefined, pathname: string): boolean {
  return birthDateSet === false && !SIN_PUERTA.has(pathname.replace(/\/+$/, ''))
}

/**
 * Guarda de rutas: exige sesión iniciada; sin ella, redirige a /login. Con la sesión sin saber
 * (`unknown`: la red no trajo su respuesta) pinta la página y no lleva a /login (E3, docs/visual.md
 * §12.1; PR 4, X-03): antes, quien tenía sesión y perdía la red a mitad de carga veía `Log in`.
 *
 * Y LA PUERTA DE LA FECHA (docs/cuenta.md §4.5; D-09, 4-f; PR 9 de E4): una cuenta sin fecha de nacimiento
 * (las de antes del PR 9) va a `/account/birth-date` antes de nada. Lo dice `GET /api/me/account`, porque la
 * fecha ya no viaja en la sesión. Si esa consulta falla (sin red), la página se pinta: la API tiene su propia
 * puerta (403 `BIRTH_DATE_REQUIRED`).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state, isPending } = useSessionState()
  const { pathname } = useLocation()
  const cuenta = useQuery({
    queryKey: ME_ACCOUNT_KEY,
    queryFn: getMeAccount,
    enabled: state === 'signed-in',
    staleTime: Infinity,
    retry: false,
  })

  // mientras llega, el esqueleto de `QueryView` (E3, PR 10)
  if (isPending) return <LoadingState label="your session" />
  if (state === 'signed-out') {
    return <Navigate to="/login" replace />
  }
  if (state === 'signed-in' && cuenta.isPending) return <LoadingState label="your account" />
  if (needsBirthDate(cuenta.data?.birthDateSet, pathname)) {
    return <Navigate to={BIRTH_DATE_PAGE} replace state={{ from: pathname }} />
  }
  return <>{children}</>
}
