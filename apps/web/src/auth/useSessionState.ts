import { useEffect, useState } from 'react'
import { type SessionState, readSignedInMark, sessionStateOf, writeSignedInMark } from '../net'
import { authClient } from './client'

/**
 * LA SESIÓN EN TRES ESTADOS, CON LA MARCA AL DÍA (E3, docs/visual.md §12.1; PR 4). `signedIn` es lo que
 * pinta la navegación: con sesión, o sin saberlo (`unknown`, la red no trajo la sesión) y con la marca
 * `cs:signed-in` de este navegador. Lo que pide datos de la cuenta mira `state === 'signed-in'`, nunca
 * `signedIn`: con una marca vieja (la sesión caducó), una consulta de la cuenta daría un 401, y el 401
 * lleva a `/login` (`SessionExpiryWatcher`) a quien solo miraba una página pública.
 *
 * `isPending` es la primera carga, antes de ninguna respuesta. Cuando better-auth vuelve a pedir la
 * sesión sin datos (al volver la red y al volver a la pestaña, `client/session-refresh.mjs` l. 58-68),
 * su `isPending` vuelve a ser cierto y su `error`, nulo (`client/session-atom.mjs` l. 49-60), y leído
 * tal cual daría `signed-out` un momento: la cabecera parpadearía a `Log in` y `ProtectedRoute`
 * desmontaría la página. Mientras tanto vale la última respuesta que se supo.
 */
export function useSessionState(): {
  readonly state: SessionState
  readonly isPending: boolean
  readonly signedIn: boolean
} {
  const { data, error, isPending } = authClient.useSession()
  const answer = isPending ? null : sessionStateOf({ data, error })
  const [last, setLast] = useState<SessionState | null>(null)
  useEffect(() => {
    if (answer === null) return
    writeSignedInMark(answer)
    setLast(answer)
  }, [answer])
  const state = answer ?? last ?? 'unknown'
  const pending = answer === null && last === null
  return {
    state,
    isPending: pending,
    // en la primera carga, la del visitante, como siempre: la marca solo cuenta con la sesión sin saber
    signedIn: state === 'signed-in' || (state === 'unknown' && !pending && readSignedInMark()),
  }
}
