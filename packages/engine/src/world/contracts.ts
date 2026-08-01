/**
 * Contratos y salarios (SPEC 7.2, Paso 36). Fórmula de oferta pura y determinista, y utilidades de
 * mercado (fecha de ventana, valor de rescisión). La IA de ofertas vive en la capa de datos; aquí
 * están las reglas numéricas del SPEC para poder testearlas en CI.
 */
import type { Division } from './npc.js'

export type ContractRole = 'lider' | 'colider' | 'gregario' | 'libre'

/** Salario base por división, en moneda del juego por semana (SPEC 7.2). */
const S_DIV: Record<Division, number> = { WT: 900, PRS: 450, CON: 200 }

/** Multiplicador de mercado por edad (SPEC 7.2). */
export function ageMarketK(age: number): number {
  if (age <= 22) return 1.1
  if (age <= 29) return 1.0
  if (age <= 32) return 0.85
  return 0.65
}

/** Multiplicador por rol contractual (SPEC 7.2). */
const K_ROL: Record<ContractRole, number> = {
  lider: 1.25,
  colider: 1.1,
  gregario: 0.9,
  libre: 1.0,
}

export interface OfferInput {
  division: Division
  /** Percentil de puntos/nivel del corredor en [0,1]. */
  pointsPercentile: number
  age: number
  role: ContractRole
}

/**
 * Salario semanal ofertado (SPEC 7.2):
 * S_div * (0.4 + 1.6 * percentil^1.4) * K_edad * K_rol.
 */
export function offerSalary(input: OfferInput): number {
  const p = Math.max(0, Math.min(1, input.pointsPercentile))
  const base = S_DIV[input.division] * (0.4 + 1.6 * Math.pow(p, 1.4))
  return Math.round(base * ageMarketK(input.age) * K_ROL[input.role])
}

/** Cláusula de rescisión: 25% del salario restante del contrato (SPEC 7.2). */
export function releaseClause(weeklySalary: number, seasonsRemaining: number): number {
  const WEEKS_PER_SEASON = 52
  return Math.round(weeklySalary * WEEKS_PER_SEASON * seasonsRemaining * 0.25)
}

/** Duración de contrato ofertada (1..3 temporadas), sesgada al nivel del corredor. */
export function offerSeasons(pointsPercentile: number, rng: () => number): number {
  // Los mejores corredores consiguen contratos más largos.
  const bias = Math.max(0, Math.min(1, pointsPercentile))
  const r = rng()
  if (r < 0.34 - 0.2 * bias) return 1
  if (r < 0.75) return 2
  return 3
}
