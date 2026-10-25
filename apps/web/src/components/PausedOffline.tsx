import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { useOnline } from '../net'
import { OfflineState } from './ui/OfflineState'

/**
 * DATOS SIN PEDIR Y SIN RED (E3, docs/visual.md §12.1; PR 4, captura 51). Con el trozo de la página
 * cargado y sus datos sin pedir, React Query no lanza la consulta sin red y la deja en pausa, y la página
 * se quedaba en `Loading…` sin fin. Hasta que `QueryView` (PR 10) pinte cada consulta en su sitio, esto
 * pinta `OfflineState` encima del contenido mientras haya alguna en pausa sin nada que enseñar; al volver
 * la red, React Query las rehace solas (`refetchOnReconnect`) y desaparece.
 */

/** ¿Hay alguna consulta montada en pausa, sin datos todavía? */
export function hasPausedWithoutData(client: QueryClient): boolean {
  return client
    .getQueryCache()
    .findAll({ type: 'active' })
    .some((q) => q.state.fetchStatus === 'paused' && q.state.data === undefined)
}

export function PausedOffline() {
  const online = useOnline()
  const client = useQueryClient()
  const subscribe = useCallback(
    (onChange: () => void) => client.getQueryCache().subscribe(onChange),
    [client],
  )
  const paused = useSyncExternalStore(
    subscribe,
    () => hasPausedWithoutData(client),
    () => false,
  )
  return !online && paused ? <OfflineState /> : null
}
