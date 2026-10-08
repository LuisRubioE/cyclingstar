/**
 * Cliente de TanStack Query del juego.
 *
 * Por qué no vale el `new QueryClient()` pelado: con `staleTime: 0` toda consulta se considera
 * caducada al instante y la web repregunta a la API en cada montaje/foco… en un juego cuyo mundo
 * SOLO cambia cuando corre el tick (6 horas reales por día de juego). Y `retry: 3` retrasa varios
 * segundos el mostrar un error. Aquí se fija un `staleTime` por dominio de dato y un solo reintento.
 *
 * Y, desde E2 (pasos 9a y 9b; docs/retransmision.md §10.9 y §14.11), lo que la web sabe de quien mira: el
 * horizonte y el `rev` de las claves, si es administrador (con la pista de este navegador, `adminHint.ts`),
 * si tiene `Watch` (`useWatchOn`), el modo diagnóstico (`diagOf`) y revelar (`useRevealActions`). Viven
 * aquí, y no cada uno en su fichero, porque toda página carga este al arrancar: lo que va con él no es un
 * fichero más que pedir en cada carga completa, y las cargas cuentan para el límite de 300 peticiones por
 * minuto e IP (`security.ts`; la nota del 9a). Por lo mismo importa `domain/veil.ts` y `api/watch.ts`.
 */

import {
  type AdminWhoami,
  type Health,
  type HorizonSummary,
  type SwitchMode,
  adminWhoamiResponseSchema,
} from '@cyclingstar/shared'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { readAdminHint } from './adminHint'
import { fetchHealth } from './api/health'
import { fetchHorizon } from './api/horizon'
import { isUnauthorized, requestOptionalAuth } from './api/request'
import { notifyUnauthorized } from './api/session'
import { postReveal, putSpoilerScope } from './api/watch'
import { authClient } from './auth/client'
import type { RevealActions } from './components/StageGate'
import { veilApplies } from './domain/veil'

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

/**
 * ¿Soy admin con mi sesión? `null` si no. Usa la variante que NO propaga el 401: un jugador que
 * no es admin no ha perdido la sesión, y el manejador global lo mandaría al login. Vive aquí desde el 9b
 * (antes en `api/admin.ts`, que lo reexporta): la página que solo quiere saber quién mira no carga todo el
 * cliente del panel.
 */
export async function fetchAdminWhoami(): Promise<AdminWhoami | null> {
  return requestOptionalAuth('/api/admin/whoami', adminWhoamiResponseSchema)
}

/**
 * El `?diag=1` de la página (§11.15): solo su valor exacto lo activa, como en la API (`stageQuerySchema`).
 * Va en las claves de lo que pide el modo diagnóstico; vive aquí desde el 9b (antes en `api/results.ts`,
 * que lo reexporta), para que el feed y la ficha de un equipo no carguen el cliente de la etapa.
 */
export function diagOf(search: URLSearchParams): boolean {
  return search.get('diag') === '1'
}

/** `GET /health`: el reloj del mundo y los interruptores. La pide ya la cabecera en toda página. */
export function useHealth(): UseQueryResult<Health> {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth })
}

/**
 * ¿ES ADMINISTRADOR QUIEN MIRA? (9b; §14.6). Con `BROADCAST_WATCH` o `SPOILER_MODE` en `admins` es lo que
 * decide lo que pinta la web, y lo que se sabe sin preguntar es esto: `pending` mientras no se sabe si hay
 * sesión; `no` sin ella (los dos interruptores en `admins` solo valen para un administrador con sesión), o
 * si `whoami` (en la caché) o la pista de este navegador (`adminHint.ts`) dicen que no; `yes` si dicen que
 * sí; y `unknown` con sesión y sin nada que lo diga: entonces se pregunta, una vez por cuenta y navegador.
 */
export type AdminStatus = 'pending' | 'no' | 'yes' | 'unknown'

/** Puro: lo que se sabe de quien mira (arriba), de su sesión, de `whoami` y de la pista. */
export function adminStatusOf(
  session: { readonly isPending: boolean; readonly userId: string | null },
  whoami: AdminWhoami | null | undefined,
  hint: boolean | undefined,
): AdminStatus {
  if (session.isPending) return 'pending'
  if (session.userId === null) return 'no'
  if (whoami !== undefined) return whoami?.via === 'session' ? 'yes' : 'no'
  if (hint === undefined) return 'unknown'
  return hint ? 'yes' : 'no'
}

/**
 * Lo que una respuesta dice de quien mira, para la pista: `whoami` siempre; el horizonte, solo con
 * `SPOILER_MODE=admins`, donde su `rev` es de espectador solo para un administrador con sesión (10-h); con
 * `on` el velo es de todos y no dice nada. Undefined si la respuesta no dice nada.
 */
export function adminHintOf(
  queryKey: readonly unknown[],
  data: unknown,
  spoilerMode: SwitchMode | undefined,
): boolean | undefined {
  if (queryKey[0] === 'admin-whoami') return (data as AdminWhoami | null)?.via === 'session'
  if (queryKey[0] === 'horizon' && spoilerMode === 'admins' && data != null)
    return veilApplies((data as HorizonSummary).rev)
  return undefined
}

/**
 * El estado de quien mira (`adminStatusOf`): su sesión, el `whoami` que ya esté en la caché (sin pedirlo:
 * lo pide quien lo necesita, `useWatchOn`) y la pista de este navegador.
 */
export function useAdminStatus(): AdminStatus {
  const session = authClient.useSession()
  const userId = session.data?.user.id ?? null
  const whoami = useQuery({
    queryKey: ['admin-whoami'],
    queryFn: fetchAdminWhoami,
    retry: false,
    enabled: false,
  })
  const hint = useMemo(() => (userId === null ? undefined : readAdminHint(userId)), [userId])
  return adminStatusOf({ isPending: session.isPending, userId }, whoami.data, hint)
}

/**
 * ¿Hace falta pedir el horizonte? Con `SPOILER_MODE=off`, nunca: el horizonte de todos es el del mundo
 * (`rev` `'world'`, listas vacías) y pedirlo sería una petición más en cada página para nada; una API sin
 * interruptores (`features` ausente) es como `off`. Con `on`, siempre. Con `admins`, el velo solo vale para
 * un administrador con sesión: se pide para él y para quien todavía no se sabe (`unknown`), cuya respuesta
 * lo dice; a los demás, no. Hasta saber el modo, no.
 */
export function horizonWanted(health: Health | undefined, admin: AdminStatus): boolean {
  if (health === undefined) return false
  const mode = health.features?.spoilerMode ?? 'off'
  if (mode === 'off') return false
  if (mode === 'on') return true
  return admin === 'yes' || admin === 'unknown'
}

/**
 * La consulta del horizonte de quien mira: `null` es el 401 del visitante sin sesión ni `cs_viewer`. Solo
 * se pide cuando hace falta (`horizonWanted`); si no, `data` se queda en undefined, como sin velo.
 */
export function useHorizon(): UseQueryResult<HorizonSummary | null> {
  const health = useHealth()
  const admin = useAdminStatus()
  return useQuery({
    queryKey: ['horizon'],
    queryFn: fetchHorizon,
    enabled: horizonWanted(health.data, admin),
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
 * esperando para siempre, y lo que sirve cada ruta lo sigue decidiendo el servidor. Desde el 9b, `'world'`
 * sin pedir el horizonte cuando no hace falta (`horizonWanted`), que es el `rev` que el servidor daría
 * (10-h): con `SPOILER_MODE=off`, y con `admins` a quien no es administrador. Así, con el velo apagado para
 * quien mira, la web no pide nada más que antes del velo.
 */
export function revOf(
  health: Settled<Health>,
  horizon: Settled<HorizonSummary | null>,
  admin: AdminStatus,
): string | undefined {
  if (health.data === undefined) return health.isError ? 'unavailable' : undefined
  const mode = health.data.features?.spoilerMode ?? 'off'
  if (mode === 'off') return 'world'
  if (mode === 'admins' && admin === 'pending') return undefined
  if (mode === 'admins' && admin === 'no') return 'world'
  if (horizon.data === undefined) return horizon.isError ? 'unavailable' : undefined
  return horizon.data === null ? 'anon' : horizon.data.rev
}

/** El `rev` de quien mira (`revOf` sobre `/health`, el horizonte y lo que se sabe de quien mira). */
export function useHorizonRev(): string | undefined {
  const health = useHealth()
  const horizon = useHorizon()
  const admin = useAdminStatus()
  return revOf(health, horizon, admin)
}

// ------------------------------------------------- `Watch` encendido para quien mira (§11.17; 9a y 9b)

/** Lo que `useWatchOn` sabe del interruptor de `Watch` y de quien mira. */
export interface WatchSwitch {
  /** `Watch` encendido para quien mira */
  readonly watchOn: boolean
  /** un administrador con sesión: el de `admins` y el del modo diagnóstico (§11.15) */
  readonly isAdmin: boolean
  /** ya se sabe `watchOn`: el interruptor y, con `admins`, quién mira */
  readonly settled: boolean
  /** ya se sabe `isAdmin` (o no se ha pedido) */
  readonly adminSettled: boolean
}

/**
 * `WATCH` ENCENDIDO PARA QUIEN MIRA (E2, docs/retransmision.md §11.17 y §14.6; 11-h): lo mismo que decide
 * `request.broadcastOn()` en la API. `BROADCAST_WATCH` viene en `/health` (`features.broadcastWatch`):
 * `on`, para todos; `admins`, solo para un administrador con sesión, que la web sabe por
 * `GET /api/admin/whoami`; `off` o una API sin interruptores, para nadie. Nació en la página de etapa
 * (9a) y el 9b lo usa también en la ficha de carrera, la de una carrera de un día, el acta, el feed y las
 * órdenes: la pestaña `Report` se llama `Story` y la carrera de un día terminada abre en `Result` mientras
 * `Watch` esté apagado para quien mira (§20.5).
 *
 * `needAdmin`: saber si es administrador aunque el interruptor no lo pida (el modo diagnóstico, una puerta
 * o un velo que ofrece `Diagnostic view`). `needWatch`: la página pinta algo distinto con `Watch` encendido
 * (las pestañas, un enlace); el feed y la ficha de un equipo solo quieren `isAdmin`, y pasan `false`. El
 * `whoami` se pide solo entonces, y nunca a quien ya se sabe que no es administrador (`useAdminStatus`): con
 * `admins` era una petición más en cada página de etapa para todos los jugadores (9a), y lo habría sido en
 * la ficha de carrera, el feed y la de un equipo. A un jugador, la API le responde 401, que la web lee como
 * nadie (`requestOptionalAuth`).
 */
export function useWatchOn(needAdmin = false, needWatch = true): WatchSwitch {
  const health = useHealth()
  const admin = useAdminStatus()
  const watchSwitch = health.data?.features?.broadcastWatch ?? 'off'
  const asks = (needWatch && watchSwitch === 'admins') || needAdmin
  const whoami = useQuery({
    queryKey: ['admin-whoami'],
    queryFn: fetchAdminWhoami,
    retry: false,
    enabled: asks && (admin === 'yes' || admin === 'unknown'),
  })
  const isAdmin = admin !== 'no' && whoami.data?.via === 'session'
  // quién mira ya se sabe: sin sesión o por la pista, sin preguntar; si no, cuando responde `whoami`
  const known = admin === 'no' || (admin !== 'pending' && !whoami.isPending)
  return {
    watchOn: watchSwitch === 'on' || (watchSwitch === 'admins' && isAdmin),
    isAdmin,
    settled: !health.isPending && (watchSwitch !== 'admins' || !needWatch || known),
    adminSettled: !needAdmin || known,
  }
}

/** ¿Lo que se ve está cortado por el velo de quien mira? (`domain/veil.ts`) */
export { veilApplies } from './domain/veil'

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

// ------------------------------------------------- revelar desde la puerta (§11.11; 9a y 9b)

/**
 * REVELAR DESDE LA PUERTA (§10.3, §11.11; D-38, DD-17): `POST /api/me/reveal/:raceKey/:day`, que escribe
 * `R` en la etapa y `A` en las anteriores que faltaran, y el `rev` que devuelve en `['horizon']`: con él
 * cambian de una vez las claves de la ficha, la cabecera y el acta (regla 3 de §10.9), y la página se
 * pide otra vez ya conocida. `Don't ask again` guarda `users.reveal_confirm = false` con el alcance que
 * ya tenía (`PUT /api/me/spoiler-scope`). Null sin la clave de la carrera, o para quien lee con
 * `cs_viewer` sin sesión (pasa `null`): las escrituras piden sesión (§10.8).
 *
 * Nació en `StageReplay.tsx` con el 9a; el 9b la usa también en la ficha de una carrera de un día, la
 * portada y las órdenes, y la trae aquí, junto a la caché del horizonte que cambia: así el cliente de lo
 * visto (`api/watch.ts`) va con este fichero, que toda página carga al arrancar (ver la cabecera).
 */
export function useRevealActions(
  raceKey: string | null,
  onRevealed: () => void,
): RevealActions | null {
  const queryClient = useQueryClient()
  const horizon = useHorizon()
  if (raceKey === null) return null
  const withRev = (rev: string, patch: Partial<HorizonSummary> = {}): void => {
    queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
      old == null ? old : { ...old, ...patch, rev },
    )
  }
  return {
    askFirst: horizon.data?.revealConfirm ?? true,
    reveal: async (stageDay) => {
      const { rev } = await postReveal(raceKey, stageDay)
      onRevealed()
      withRev(rev)
      // las listas del horizonte (lo que queda por ver) también cambian: se piden otra vez
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
    dontAskAgain: async () => {
      const { rev } = await putSpoilerScope(horizon.data?.scope ?? 'guarded', false)
      withRev(rev, { revealConfirm: false })
    },
  }
}
