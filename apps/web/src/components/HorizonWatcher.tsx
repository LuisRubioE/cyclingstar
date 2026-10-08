import type { Health } from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { writeAdminHint } from '../adminHint'
import { authClient } from '../auth/client'
import { type SessionSeen, adminHintOf, cacheOwnerChanged } from '../queryClient'

/**
 * EL VIGILANTE DE LA CACHÉ (E2, docs/retransmision.md §10.9, regla 4, y §14.11; D-35, 14-r; paso 9a).
 *
 * Hasta aquí la caché de React Query no sabía de quién era: cerrar sesión no la limpiaba, así que la
 * ficha que vio una cuenta la podía ver la siguiente en el mismo navegador (sup. X5). Montado UNA vez
 * dentro del `QueryClientProvider` (`main.tsx`), mira el id de usuario de `authClient.useSession()` y
 * llama a `queryClient.clear()` cuando cambia un valor ya resuelto: entrar (el inicio de sesión o el
 * enlace de verificación), salir y borrar la cuenta. Nunca en el paso de `isPending` al primer valor, que
 * es la carga de la página (`cacheOwnerChanged`), y un paso por pendiente en medio no borra el último
 * valor visto. No pinta nada.
 *
 * Y desde el 9b guarda la pista de administrador de este navegador (`adminHint.ts`) cada vez que una
 * respuesta dice si quien mira lo es (`adminHintOf`: `whoami`, y el horizonte con `SPOILER_MODE=admins`),
 * para que la carga siguiente no tenga que preguntarlo.
 */
export function HorizonWatcher(): null {
  const queryClient = useQueryClient()
  const { data, isPending } = authClient.useSession()
  const userId = data?.user.id ?? null
  const last = useRef<SessionSeen>({ resolved: false, userId: null })
  const owner = useRef<string | null>(null)
  useEffect(() => {
    owner.current = isPending ? null : userId
    if (isPending) return
    const next: SessionSeen = { resolved: true, userId }
    if (cacheOwnerChanged(last.current, next)) queryClient.clear()
    last.current = next
  }, [isPending, userId, queryClient])
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'success') return
        const who = owner.current
        if (who === null) return
        const mode = queryClient.getQueryData<Health>(['health'])?.features?.spoilerMode
        const admin = adminHintOf(event.query.queryKey, event.query.state.data, mode)
        if (admin !== undefined) writeAdminHint(who, admin)
      }),
    [queryClient],
  )
  return null
}
