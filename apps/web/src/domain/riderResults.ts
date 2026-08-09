import type { RiderRaceResult } from '@cyclingstar/shared'

/**
 * Presentación de los resultados de un corredor (docs/navegacion.md §3.6).
 *
 * Criterio: en una carrera POR ETAPAS el resultado del corredor ES la general; las etapas son el
 * desglose. Así que la línea principal de cada carrera es siempre su puesto en la general —se gane
 * o no—, y las etapas se pliegan debajo. En una carrera de un día no hay tal distinción: la única
 * etapa es la carrera.
 */

/** Número ordinal en inglés (1st, 2nd, 3rd, 4th… 11th, 21st). */
export function ordinal(n: number): string {
  const resto100 = n % 100
  if (resto100 >= 11 && resto100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** El resultado del corredor en la carrera, en una palabra: "3rd", "DNF" o "—" si no hay general. */
export function raceResultPlace(r: RiderRaceResult): string {
  if (r.dnf) return 'DNF'
  if (r.gcPuesto == null) return '—'
  return ordinal(r.gcPuesto)
}

/**
 * Qué es ese puesto: la general de una vuelta (terminada o en marcha) o el resultado de una clásica.
 * Se dice "so far" mientras la carrera sigue viva, para no vender como definitivo lo que aún cambia.
 */
export function raceResultKind(r: RiderRaceResult): string {
  if (r.isOneDay) return 'One-day race'
  if (r.dnf) return 'Overall — abandoned'
  return r.finished ? 'Overall' : 'Overall so far'
}

/** Resumen del desglose de etapas: "7 stages · 4 wins". Vacío en una carrera de un día. */
export function stagesSummary(r: RiderRaceResult): string {
  if (r.isOneDay || r.stages.length === 0) return ''
  const wins = r.stages.filter((s) => s.puesto === 1).length
  const etapas = `${r.stages.length} stage${r.stages.length === 1 ? '' : 's'}`
  if (wins === 0) return etapas
  return `${etapas} · ${wins} win${wins === 1 ? '' : 's'}`
}

/** ¿Merece la pena ofrecer el desglose? Solo si hay etapas que desglosar. */
export function hasStageBreakdown(r: RiderRaceResult): boolean {
  return !r.isOneDay && r.stages.length > 0
}

/**
 * Color del puesto en la ficha: el oro solo para la victoria, el podio destacado y el resto sobrio.
 * Vive aquí porque lo comparten la lista de la ficha y la tabla de `My races`, y una divergencia
 * haría que el mismo 1.º se pintara distinto en dos pantallas.
 */
export function placeTone(r: RiderRaceResult): string {
  if (r.dnf || r.gcPuesto == null) return 'text-slate-400'
  if (r.gcPuesto === 1) return 'text-amber-500'
  if (r.gcPuesto <= 3) return 'text-slate-700'
  return 'text-slate-500'
}

/** Clave estable de una carrera del historial (una carrera puede repetirse cada temporada). */
export function raceResultKey(r: RiderRaceResult): string {
  return `${r.raceId}:s${r.season}`
}
