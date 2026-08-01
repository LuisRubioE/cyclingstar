/**
 * Semilla y subflujos nominales del motor (SPEC 6.1). La semilla de la etapa se deriva de
 * (worldSeed, raceId, stageDay, engineVersion) y cada fase pide su propio flujo por nombre:
 * `rng("hazard")`, `rng("sprint")`, `rng("crash")`. Así, refactorizar una fase no altera la
 * secuencia de las demás. Puro y determinista: sin Date.now ni Math.random.
 */
import { seededRng } from '@cyclingstar/shared'
import type { Rng } from '../random.js'

export interface StageSeedParts {
  worldSeed: string
  raceId: string
  stageDay: number
  engineVersion: number
}

/**
 * Semilla determinista de una etapa. El SPEC la enuncia como sha256(...); usamos el mismo
 * hasheo sembrado del resto del juego (cyrb) para no meter node:crypto en el motor puro: lo
 * que importa es que sea estable y que cambie con cualquiera de sus partes.
 */
export function stageSeed(parts: StageSeedParts): string {
  return `${parts.worldSeed}|${parts.raceId}|${parts.stageDay}|v${parts.engineVersion}`
}

/** Fábrica de subflujos: cada nombre produce un RNG independiente y reproducible. */
export function stageRng(seed: string): (subflow: string) => Rng {
  return (subflow: string) => seededRng(`${seed}::${subflow}`)
}
