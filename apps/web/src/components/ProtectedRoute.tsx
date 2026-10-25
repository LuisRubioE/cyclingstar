import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSessionState } from '../auth/useSessionState'

/**
 * Guarda de rutas: exige sesión iniciada; sin ella, redirige a /login. Con la sesión sin saber
 * (`unknown`: la red no trajo su respuesta) pinta la página y no lleva a /login (E3, docs/visual.md
 * §12.1; PR 4, X-03): antes, quien tenía sesión y perdía la red a mitad de carga veía `Log in`.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state, isPending } = useSessionState()

  if (isPending) {
    return <p className="text-slate-500">Loading…</p>
  }
  if (state === 'signed-out') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
