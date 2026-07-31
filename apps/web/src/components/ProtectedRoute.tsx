import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { authClient } from '../auth/client'

/** Guarda de rutas: exige sesión iniciada; si no, redirige a /acceso. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return <p className="text-slate-500">Cargando…</p>
  }
  if (!data) {
    return <Navigate to="/acceso" replace />
  }
  return <>{children}</>
}
