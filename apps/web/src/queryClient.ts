/**
 * Cliente de TanStack Query del juego.
 *
 * Por qué no vale el `new QueryClient()` pelado: con `staleTime: 0` toda consulta se considera
 * caducada al instante y la web repregunta a la API en cada montaje/foco… en un juego cuyo mundo
 * SOLO cambia cuando corre el tick (6 horas reales por día de juego). Y `retry: 3` retrasa varios
 * segundos el mostrar un error. Aquí se fija un `staleTime` por dominio de dato y un solo reintento.
 */

import type { Health, HorizonSummary } from '@cyclingstar/shared'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query'
import { fetchHealth } from './api/health'
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
 * LAS FAMILIAS CON HORIZONTE: las consultas de las rutas `horizon` o `watch` (§11.3) cuya respuesta
 * cambia con lo que ha visto quien mira. Su clave lleva el `rev` del horizonte como ÚLTIMO elemento
 * (regla 1 de §10.9), así que `setQueryDefaults` por prefijo sigue valiendo, y con otro `rev` la clave es
 * otra y la consulta se rehace sola: al ver una etapa, al revelarla, al seguir una carrera, con el día
 * nuevo y al cambiar `SPOILER_MODE` (los tres `rev` no coinciden nunca, §10.13), nada de lo guardado con
 * el horizonte de antes se enseña con el de ahora. `queryKeys.test.ts` falla si una clave de estas
 * familias no sale de `horizonKey`.
 *
 * - La etapa (9a): la ficha, la cabecera de la retransmisión y el acta.
 * - El mundo (9b): la ficha de carrera (`['race']`) y el calendario (P), los dos feeds (F), los agregados
 *   (R y M, desde el 8b), las fichas de corredor y de equipo, y lo propio (`['rider', …]`, el resumen, el
 *   libro de cuentas, el informe del bloque, la tendencia, el plan de días y su proyección). Las rutas
 *   que solo son L o `safe` (la lista de salida, las ofertas, las convocatorias, las órdenes de carrera, el
 *   programa del equipo) no cambian con lo visto y quedan fuera.
 */
export const HORIZON_KEYS = [
  // la etapa (9a)
  ['stage-replay'],
  ['broadcast-head'],
  ['stage-report'],
  // el mundo (9b): P y F
  ['race'],
  ['calendar'],
  ['news'],
  ['team-news'],
  // los agregados: R y M
  ['rankings'],
  ['rankings-young'],
  ['season-awards'],
  ['hall-of-fame'],
  ['records'],
  ['countries'],
  ['country'],
  ['teams'],
  ['team'],
  ['team-calendar'],
  // las fichas de corredor y lo propio: R, M, F, P y G
  ['public-rider'],
  ['badges'],
  ['rider'],
  ['rider-summary'],
  ['ledger'],
  ['block-report'],
  ['rider-trend'],
  ['orders'],
  ['plan-preview'],
] as const

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

/** `GET /health`: el reloj del mundo y los interruptores. La pide ya la cabecera en toda página. */
export function useHealth(): UseQueryResult<Health> {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth })
}

/**
 * ¿Hace falta pedir el horizonte? Solo si `SPOILER_MODE` no está apagado (9b; §10.13): apagado, el
 * horizonte de todos es el del mundo (`rev` `'world'`, listas vacías) y pedirlo sería una petición más en
 * cada página para nada. Una API sin interruptores (`features` ausente) es como `off`. Hasta saber el
 * modo, no.
 */
export function horizonWanted(health: Health | undefined): boolean {
  return health !== undefined && (health.features?.spoilerMode ?? 'off') !== 'off'
}

/**
 * La consulta del horizonte de quien mira: `null` es el 401 del visitante sin sesión ni `cs_viewer`. Con
 * `SPOILER_MODE=off` no se pide (`horizonWanted`): `data` se queda en undefined, como sin velo.
 */
export function useHorizon(): UseQueryResult<HorizonSummary | null> {
  const health = useHealth()
  return useQuery({
    queryKey: ['horizon'],
    queryFn: fetchHorizon,
    enabled: horizonWanted(health.data),
  })
}

/** Lo que `revOf` lee de una consulta: su dato y si falló. */
interface Settled<T> {
  readonly data: T | undefined
  readonly isError: boolean
}

/**
 * EL `rev` DE LAS CLAVES (§10.9, 14-r), puro: el de `GET /api/me/horizon`; `'anon'` si la respuesta es
 * el 401 de quien no tiene sesión ni `cs_viewer`; `undefined` mientras no ha respondido, y entonces las
 * consultas con horizonte esperan. Si la petición falla, `'unavailable'`: la página no se queda
 * esperando para siempre, y lo que sirve cada ruta lo sigue decidiendo el servidor. Desde el 9b, con
 * `SPOILER_MODE=off`, `'world'` sin pedir el horizonte, que es el `rev` que el servidor daría (10-h): así,
 * con el interruptor apagado, la web no pide nada más que antes del velo.
 */
export function revOf(
  health: Settled<Health>,
  horizon: Settled<HorizonSummary | null>,
): string | undefined {
  if (health.data === undefined) return health.isError ? 'unavailable' : undefined
  if (!horizonWanted(health.data)) return 'world'
  if (horizon.data === undefined) return horizon.isError ? 'unavailable' : undefined
  return horizon.data === null ? 'anon' : horizon.data.rev
}

/** El `rev` de quien mira (`revOf` sobre `/health` y el horizonte). */
export function useHorizonRev(): string | undefined {
  const health = useHealth()
  const horizon = useHorizon()
  return revOf(health, horizon)
}

/**
 * ¿Lo que se ve está cortado por el velo de quien mira? Solo con un `rev` de espectador,
 * `${currentDay}.${horizon_rev}` (10-h): `'world'` (sin velo para él), `'anon'` (el visitante) y
 * `'unavailable'` no lo están. Es lo que enciende los avisos y los botones del velo en el mundo (9b): con
 * `SPOILER_MODE` apagado, o en `admins` para un jugador, la web es la de hoy.
 */
export function veilApplies(rev: string | undefined): boolean {
  return rev !== undefined && /^\d+\.\d+$/.test(rev)
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
  // Desde el 9b casi toda página lleva el `rev` en sus claves, y pedir el horizonte al montar cada una
  // sería una petición más por navegación: al montar solo se pide si algo lo invalidó (la meta, revelar,
  // el progreso que sigue la carrera, seguirla o soltarla, el alcance, el día nuevo del reloj).
  client.setQueryDefaults(['horizon'], {
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: (query) => query.state.isInvalidated,
  })

  return client
}
