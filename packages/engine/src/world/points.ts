/**
 * Puntos de ranking individual (SPEC, Paso 40). Puntos por puesto de etapa y de general, escalados
 * por el nivel de la carrera, que alimentan el ranking de la temporada. Puro y determinista.
 */
import type { RaceLevel } from '../routes/calendar.js'

const STAGE_POINTS = [25, 20, 16, 14, 12, 10, 8, 6, 4, 2]
const GC_POINTS = [200, 150, 120, 100, 80, 60, 50, 40, 30, 20]

/** Factor por nivel: una victoria WorldTour vale más que una Continental. */
const LEVEL_FACTOR: Record<RaceLevel, number> = { WT: 1, PRS: 0.6, CON: 0.35 }

/** Puntos de ranking por el puesto de una etapa (0 = ganador), 0 fuera del top. */
export function stageResultPoints(level: RaceLevel, placing: number): number {
  const base = STAGE_POINTS[placing] ?? 0
  return Math.round(base * LEVEL_FACTOR[level])
}

/** Puntos de ranking por el puesto en la general (0 = ganador), 0 fuera del top. */
export function gcResultPoints(level: RaceLevel, placing: number): number {
  const base = GC_POINTS[placing] ?? 0
  return Math.round(base * LEVEL_FACTOR[level])
}
