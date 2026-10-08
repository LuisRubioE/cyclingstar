/**
 * Cliente de TanStack Query del juego.
 *
 * Por qué no vale el `new QueryClient()` pelado: con `staleTime: 0` toda consulta se considera
 * caducada al instante y la web repregunta a la API en cada montaje/foco… en un juego cuyo mundo
 * SOLO cambia cuando corre el tick (6 horas reales por día de juego). Y `retry: 3` retrasa varios
 * segundos el mostrar un error. Aquí se fija un `staleTime` por dominio de dato y un solo reintento.
 */

import type { HorizonSummary } from '@cyclingstar/shared'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query'
import { fetchHorizon } from './api/horizon'
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

// --------------------------------------------- el horizonte en las claves (E2, §10.9 y §14.11; 9a)

/**
 * LAS FAMILIAS CON HORIZONTE: las consultas de las rutas `horizon` o `watch` de la página de etapa
 * (§11.3): la ficha de la etapa, la cabecera de la retransmisión y el acta. Su clave lleva el `rev` del
 * horizonte como ÚLTIMO elemento (regla 1 de §10.9), así que `setQueryDefaults` por prefijo sigue
 * valiendo, y con otro `rev` la clave es otra y la consulta se rehace sola. Las del mundo (la ficha de
 * carrera, las noticias, los rankings…) entran en el 9b, con las pantallas que las pintan bajo el velo.
 * `queryKeys.test.ts` falla si una clave de estas familias no sale de `horizonKey`.
 */
export const HORIZON_KEYS = [['stage-replay'], ['broadcast-head'], ['stage-report']] as const

/**
 * La única forma de construir una clave de esas familias: `horizonKey(['stage-replay', raceId, day,
 * diag], rev)`. `rev` es undefined mientras `['horizon']` no responde, y entonces la consulta va con
 * `enabled: rev !== undefined` (regla 4 de §10.9, 14-r): esa clave no se pide nunca.
 */
export function horizonKey(base: readonly unknown[], rev: string | undefined): readonly unknown[] {
  return [...base, rev]
}

/** Lo que el vigilante sabe de la sesión: si `useSession()` ya resolvió y de quién es. */
export interface SessionSeen {
  /** `useSession()` ya no está `isPending` */
  readonly resolved: boolean
  readonly userId: string | null
}

/**
 * Si el cambio de sesión obliga a `clear()` (regla 4 de §10.9, 14-r): solo un valor ya resuelto que
 * cambia (un id a otro, un id a nada o nada a un id), nunca el paso de pendiente al primero, que es la
 * carga de la página y tiraría lo que la página ya había pedido (Rcoste-018).
 */
export function cacheOwnerChanged(prev: SessionSeen, next: SessionSeen): boolean {
  return prev.resolved && next.resolved && prev.userId !== next.userId
}

/** La consulta del horizonte de quien mira: `null` es el 401 del visitante sin sesión ni `cs_viewer`. */
export function useHorizon(): UseQueryResult<HorizonSummary | null> {
  return useQuery({ queryKey: ['horizon'], queryFn: fetchHorizon })
}

/**
 * EL `rev` DE LAS CLAVES (§10.9, 14-r): el de `GET /api/me/horizon`; `'anon'` si la respuesta es el 401
 * de quien no tiene sesión ni `cs_viewer`; `undefined` mientras no ha respondido, y entonces las
 * consultas con horizonte esperan. Si la petición falla, `'unavailable'`: la página no se queda
 * esperando para siempre, y lo que sirve cada ruta lo sigue decidiendo el servidor.
 */
export function useHorizonRev(): string | undefined {
  const q = useHorizon()
  if (q.data === undefined) return q.isError ? 'unavailable' : undefined
  return q.data === null ? 'anon' : q.data.rev
}

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
  // LA RETRANSMISIÓN (docs/retransmision.md §14.11). Un tramo no cambia nunca y no lleva `rev`: se
  // guarda para siempre (14-m), y no se reintenta solo, porque un fallo lo resuelve el reproductor
  // (`Connection lost · Retry`, un 429 que espera su `retry-after`, un 409 que informa y repite).
  client.setQueryDefaults(['broadcast-chunk'], { staleTime: Infinity, retry: false })
  // La cabecera y el acta: un 403 (la puerta) o un 404 (`broadcast_off`, `broadcast_unavailable`) no se
  // reintentan (hoy, `retry: 1` para todo).
  client.setQueryDefaults(['broadcast-head'], { retry: false })
  client.setQueryDefaults(['stage-report'], { retry: false })
  // EL HORIZONTE (regla 2 de §10.9; 9a): siempre caduco y se pide otra vez al enfocar la ventana (el
  // único que lo hace: está apagado para todo). De él sale el `rev` de las claves de HORIZON_KEYS, y así
  // una pestaña que vuelve al primer plano ve lo que se vio o se reveló en otro dispositivo (D-57).
  client.setQueryDefaults(['horizon'], { staleTime: 0, refetchOnWindowFocus: true })

  return client
}
