/**
 * Tabla de premios de carrera (SPEC 9, Paso 38). Puro y determinista. Premio de etapa por nivel y
 * reparto decreciente de la general al pódium/top de la clasificación. La moneda es del juego.
 */
import type { RaceLevel } from '../routes/calendar.js'

/** Premio al ganador de etapa por nivel (SPEC 9: etapa WT 300). */
const STAGE_PRIZE: Record<RaceLevel, number> = { WT: 300, PRS: 150, CON: 60 }

/** Bote de la general por nivel (SPEC 9: general WT 5.000 al líder con reparto decreciente). */
const GC_TOP_PRIZE: Record<RaceLevel, number> = { WT: 5000, PRS: 2500, CON: 1000 }

/** Reparto decreciente del bote de la general entre los primeros puestos. */
const GC_SHARES = [1, 0.5, 0.25, 0.15, 0.1]

export function stagePrize(level: RaceLevel): number {
  return STAGE_PRIZE[level]
}

/** Premios de la general: array indexado por puesto (0 = líder), decreciente (SPEC 9). */
export function gcPrizes(level: RaceLevel): number[] {
  const top = GC_TOP_PRIZE[level]
  return GC_SHARES.map((share) => Math.round(top * share))
}
