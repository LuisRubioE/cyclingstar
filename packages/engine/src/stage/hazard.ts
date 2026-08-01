/**
 * Marco de riesgos del motor (SPEC 6.8). Regla de oro: todo evento aleatorio se especifica
 * como una intensidad `λ` en eventos por kilómetro, y la probabilidad por bloque se DERIVA.
 * Así el balance se piensa en unidades humanas ("0,8 ataques por cada 10 km de puerto") y los
 * eventos son invariantes a la resolución de simulación (se verifica en 6.17).
 */
import { STAGE } from '../constants.js'
import type { Rng } from '../random.js'

/** Probabilidad de que un evento de intensidad `λ` (por km) ocurra en un bloque de `dx` km. */
export function blockProbability(lambdaPerKm: number, dx: number = STAGE.dx): number {
  return 1 - Math.exp(-lambdaPerKm * dx)
}

/** Tira si un evento de intensidad `λ` ocurre en este bloque (SPEC 6.8). */
export function rollHazard(rng: Rng, lambdaPerKm: number, dx: number = STAGE.dx): boolean {
  return rng() < blockProbability(lambdaPerKm, dx)
}
