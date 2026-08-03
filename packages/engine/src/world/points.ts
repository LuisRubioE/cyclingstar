/**
 * Puntos de ranking individual (SPEC, Paso 40). Puntos por puesto de etapa y de general, escalados
 * por la CLASE de la carrera (.WT/.Pro/.1/.2/.NC), que alimentan el ranking de la temporada. Puro y
 * determinista.
 */
import type { RaceLevel } from '../routes/calendar.js'
import type { RaceClass } from '../routes/uci.js'

const STAGE_POINTS = [25, 20, 16, 14, 12, 10, 8, 6, 4, 2]
const GC_POINTS = [200, 150, 120, 100, 80, 60, 50, 40, 30, 20]

/**
 * Factor por clase: una victoria .WT vale más que una .1. .WT/.Pro/.1 conservan los pesos históricos
 * de WT/PRS/CON; .2 es menor y el campeonato nacional (.NC) pesa por encima de una .1.
 */
const CLASS_FACTOR: Record<RaceClass, number> = { WT: 1, Pro: 0.6, '1': 0.35, '2': 0.2, NC: 0.5 }

/** Factor por nivel (compatibilidad): mapea el nivel a su clase por defecto. */
const LEVEL_FACTOR: Record<RaceLevel, number> = {
  WT: CLASS_FACTOR.WT,
  PRS: CLASS_FACTOR.Pro,
  CON: CLASS_FACTOR['1'],
}

/** Puntos de ranking por el puesto de una etapa (0 = ganador) según la clase, 0 fuera del top. */
export function stagePointsByClass(cls: RaceClass, placing: number): number {
  const base = STAGE_POINTS[placing] ?? 0
  return Math.round(base * CLASS_FACTOR[cls])
}

/** Puntos de ranking por el puesto en la general (0 = ganador) según la clase, 0 fuera del top. */
export function gcPointsByClass(cls: RaceClass, placing: number): number {
  const base = GC_POINTS[placing] ?? 0
  return Math.round(base * CLASS_FACTOR[cls])
}

/** Puntos de etapa por nivel (compatibilidad). */
export function stageResultPoints(level: RaceLevel, placing: number): number {
  const base = STAGE_POINTS[placing] ?? 0
  return Math.round(base * LEVEL_FACTOR[level])
}

/** Puntos de general por nivel (compatibilidad). */
export function gcResultPoints(level: RaceLevel, placing: number): number {
  const base = GC_POINTS[placing] ?? 0
  return Math.round(base * LEVEL_FACTOR[level])
}
