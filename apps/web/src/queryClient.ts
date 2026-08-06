/**
 * Cliente de TanStack Query del juego.
 *
 * Por qué no vale el `new QueryClient()` pelado: con `staleTime: 0` toda consulta se considera
 * caducada al instante y la web repregunta a la API en cada montaje/foco… en un juego cuyo mundo
 * SOLO cambia cuando corre el tick (6 horas reales por día de juego). Y `retry: 3` retrasa varios
 * segundos el mostrar un error. Aquí se fija un `staleTime` por dominio de dato y un solo reintento.
 */

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isUnauthorized } from './api/request'
import { notifyUnauthorized } from './api/session'

const MINUTE = 60_000

/** Cuánto vale un dato antes de volver a pedirlo, según cada cuánto puede cambiar de verdad. */
export const STALE_TIME = {
  /** Inmutable dentro de una sesión: recorridos, catálogo del calendario. */
  static: 60 * MINUTE,
  /** Solo cambia con el tick del mundo: clasificaciones, equipos, noticias, resultados. */
  world: 30 * MINUTE,
  /** Lo que el propio jugador edita desde la web: órdenes, objetivos, finanzas. */
  personal: 2 * MINUTE,
  /** El reloj del mundo: se refresca solo al vencer la cuenta atrás (WorldClock lo invalida). */
  health: 5 * MINUTE,
} as const

/** Datos del mundo: cambian con el tick, no mientras el jugador navega. */
const WORLD_KEYS = [
  ['calendar'],
  ['teams'],
  ['team'],
  ['team-news'],
  ['countries'],
  ['country'],
  ['rankings'],
  ['rankings-young'],
  ['season-awards'],
  ['hall-of-fame'],
  ['records'],
  ['race-history'],
  ['news'],
  ['race'],
  ['stage-replay'],
  ['public-rider'],
  ['badges'],
]

/** Datos propios editables: conviene refrescarlos antes, pero tampoco en cada montaje. */
const PERSONAL_KEYS = [
  ['rider'],
  ['rider-summary'],
  ['orders'],
  ['team-training'],
  ['race-orders'],
  ['race-prefs'],
  ['race-entries'],
  ['team-calendar'],
  ['team-control'],
  ['ledger'],
  ['market'],
]

/** Un 401 inesperado significa sesión caducada: se avisa una sola vez, en el nivel global. */
function handleGlobalError(error: unknown): void {
  if (isUnauthorized(error)) notifyUnauthorized()
}

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // El mundo avanza por ticks lentos: no tiene sentido repreguntar constantemente.
        staleTime: STALE_TIME.world,
        gcTime: 60 * MINUTE,
        // Un solo reintento: con 3 el usuario se come varios segundos antes de ver el error.
        retry: 1,
        retryDelay: 500,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: { retry: 0 },
    },
    queryCache: new QueryCache({ onError: handleGlobalError }),
    mutationCache: new MutationCache({ onError: handleGlobalError }),
  })

  client.setQueryDefaults(['health'], { staleTime: STALE_TIME.health })
  for (const key of WORLD_KEYS) client.setQueryDefaults(key, { staleTime: STALE_TIME.world })
  for (const key of PERSONAL_KEYS) client.setQueryDefaults(key, { staleTime: STALE_TIME.personal })
  // La lista de bloqueo y la salud del mundo del panel de admin no deben reintentar (401 = token malo).
  client.setQueryDefaults(['admin-health'], { staleTime: 0, retry: false })
  client.setQueryDefaults(['blocklist'], { staleTime: 0, retry: false })

  return client
}
