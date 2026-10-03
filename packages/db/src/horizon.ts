/**
 * EL HORIZONTE Y EL VELO (E2, docs/retransmision.md §4.10 y §10.6; D-28 a D-32).
 *
 * Lo que un espectador conoce de cada carrera en guardia, calculado en el servidor en cada petición y
 * en un solo punto. Los tres tipos que viajan por la red (`GuardReason`, `SpoilerScope`, `StageGate`)
 * viven en `shared` (decisión 4-k); el resto, aquí, solo en el servidor.
 *
 * Nace en el PR 3a con los tipos y las funciones PURAS (decisión 17-g): `timelineForStage` recibe un
 * `Horizon` desde que existe (14-p). `computeHorizon` llega en el 7a, `veilCast` en el 7b, `veilSql`
 * en el 8a y `veilDelta` en el 8b. Hasta el 7a solo hay dos horizontes, los dos con el velo vacío:
 * el del mundo (`worldHorizon`) y el del visitante (`anonHorizon()`).
 */
import type { GuardReason, HealthState, StageGate } from '@cyclingstar/shared'

/** Vista en directo, en resumen o digest, revelada, arrastrada, caducada (D-28): una por etapa en race_watch.how. */
export type KnowledgeLetter = 'W' | 'S' | 'R' | 'A' | 'X'

/** Una etapa corrida que el espectador no conoce. */
export interface VeiledStage {
  readonly raceKey: string
  readonly stageDay: number
  /** stage_timelines.game_day, o el calendario si no hay línea */
  readonly gameDay: number
  readonly reason: GuardReason
}

/** El del tick, la administración y los bancos; el visitante; un espectador. */
export type HorizonKind = 'world' | 'anon' | 'viewer'

/** Lo que un espectador conoce. No se serializa nunca: lo que viaja es `HorizonSummary` (7a) y `rev`. */
export interface Horizon {
  readonly kind: HorizonKind
  /** null en 'world' y 'anon' */
  readonly userId: string | null
  /** viene de la cookie cs_viewer sin sesión: no escribe progreso (D-34) */
  readonly readOnly: boolean
  /** `${currentDay}.${users.horizon_rev}`: va en las claves de React Query (D-35) */
  readonly rev: string
  /** raceKey → k: lo conocido es el prefijo 1..k (D-28); solo carreras en guardia */
  readonly knownThrough: ReadonlyMap<string, number>
  /** EL VELO: las etapas corridas que este espectador no conoce */
  readonly veil: readonly VeiledStage[]
  /** raceKey → la etapa a medias */
  readonly watching: ReadonlyMap<string, { readonly stageDay: number; readonly reachedS: number }>
}

/** Lo que las etapas veladas cambiaron en el mundo: lo que el mecanismo R resta (D-32). Llega en el 8b. */
export interface VeilDelta {
  /** riderId → rider_points de etapas veladas */
  readonly points: ReadonlyMap<string, { readonly season: number; readonly window: number }>
  /** riderId → premios de transactions veladas (race_key, stage_day, 0049) */
  readonly money: ReadonlyMap<string, number>
  /** teamId → stage_team_results.prize velados (0049, D-41) */
  readonly budget: ReadonlyMap<string, number>
  /** ids de filas de palmares veladas */
  readonly palmares: ReadonlySet<string>
  /** la salud de antes, de la noticia injury velada (prevHealth, prevUntilDay) */
  readonly health: ReadonlyMap<
    string,
    { readonly health: HealthState; readonly untilDay: number | null }
  >
  /** `${raceKey}|${riderId}` con race_rosters.abandoned_day velado */
  readonly abandons: ReadonlySet<string>
  /** riderId → días de juego de carrera velados (parte y aprendizaje, sup. H4 y X1) */
  readonly raceDays: ReadonlyMap<string, readonly number[]>
}

/** De la sesión, o de cs_viewer; null sin nada. */
export type Viewer = { readonly userId: string; readonly readOnly: boolean } | null

/** game_state (schema.ts). */
export interface WorldRef {
  readonly worldId: string
  readonly currentDay: number
}

/**
 * Los dos horizontes sin espectador (10-h): el del tick, la administración y los bancos, y el del
 * visitante. Velo vacío: es lo que hace que un visitante vea resultados fuera de la etapa ([DUEÑO 8],
 * D-36). `worldHorizon` es una constante; `anonHorizon()`, una función, como la escribe §10.6.
 */
export const worldHorizon: Horizon = {
  kind: 'world',
  userId: null,
  readOnly: true,
  rev: 'world',
  knownThrough: new Map(),
  veil: [],
  watching: new Map(),
}
export function anonHorizon(): Horizon {
  return { ...worldHorizon, kind: 'anon', rev: 'anon' }
}

/*
 * LOS GEMELOS DEL PREDICADO (§10.6, punto 3), para lo que va por número de etapa. `veilSql`, el
 * predicado en SQL, llega en el 8a.
 */

/** Hasta qué etapa se puede servir una carrera (mecanismo P): la anterior a su primera velada, o lastRun. */
export function throughStage(h: Horizon, raceKey: string, lastRun: number): number {
  let first = Number.POSITIVE_INFINITY
  for (const v of h.veil) if (v.raceKey === raceKey && v.stageDay < first) first = v.stageDay
  return first === Number.POSITIVE_INFINITY ? lastRun : Math.min(lastRun, first - 1)
}

/** Si la etapa está en el velo de quien mira. */
export function isVeiled(h: Horizon, raceKey: string, stageDay: number): boolean {
  return h.veil.some((v) => v.raceKey === raceKey && v.stageDay === stageDay)
}

/**
 * La puerta de una etapa (D-37): una anterior velada manda sobre la propia (10-j), porque la previa
 * de la N destripa la N−1. null si la etapa se puede servir.
 */
export function stageGateOf(h: Horizon, raceKey: string, stageDay: number): StageGate | null {
  const before = h.veil
    .filter((v) => v.raceKey === raceKey && v.stageDay < stageDay)
    .map((v) => v.stageDay)
  if (before.length > 0) return { k: 'previous_unseen', firstUnseen: Math.min(...before) }
  return isVeiled(h, raceKey, stageDay) ? { k: 'not_seen' } : null
}
