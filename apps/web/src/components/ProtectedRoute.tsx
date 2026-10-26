import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionState } from '../auth/useSessionState'
import { LoadingState } from './ui/QueryView'

/**
 * Guarda de rutas: exige sesión iniciada; sin ella, redirige a /login. Con la sesión sin saber
 * (`unknown`: la red no trajo su respuesta) pinta la página y no lleva a /login (E3, docs/visual.md
 * §12.1; PR 4, X-03): antes, quien tenía sesión y perdía la red a mitad de carga veía `Log in`.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state, isPending } = useSessionState()

  // mientras llega, el esqueleto de `QueryView` (E3, PR 10)
  if (isPending) return <LoadingState label="your session" />
  if (state === 'signed-out') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
