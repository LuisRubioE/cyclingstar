/**
 * Salud del corredor: etiquetas y "hasta cuándo" (presentación pura, sin HTTP ni React).
 *
 * El estado de salud es PÚBLICO (docs/navegacion.md §3.6): en el ciclismo real una lesión es
 * noticia, y un rival querría saberla. Lo privado sigue siendo el detalle fino —frescura, fatiga,
 * forma—, que solo se pinta en modo propietario.
 *
 * Aquí viven las etiquetas para que la insignia de la ficha, la del bloque de condición y las de la
 * plantilla digan exactamente lo mismo (antes había dos mapas copiados).
 */

import { type HealthState, type RiderHealth, seasonPosition } from '@cyclingstar/shared'

export interface HealthLook {
  /** Texto visible de la insignia (inglés, como toda la interfaz). */
  label: string
  /** Clases del distintivo (fondo, texto y anillo). */
  cls: string
  /** Explicación de una línea: qué significa para el corredor. */
  note: string
}

export const HEALTH_LOOK: Record<HealthState, HealthLook> = {
  sano: {
    label: 'Healthy',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    note: 'Fit to race and train.',
  },
  molestias: {
    label: 'Niggle',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    note: 'Can race, but at a slight disadvantage until it clears.',
  },
  enfermo: {
    label: 'Ill',
    cls: 'bg-orange-50 text-orange-700 ring-orange-200',
    note: "Resting to recover — won't be called up until fit again.",
  },
  lesionado: {
    label: 'Injured',
    cls: 'bg-red-50 text-red-700 ring-red-200',
    note: "Out with an injury — can't race until recovered.",
  },
}

/** Estados que dejan al corredor fuera de combate (los que tienen fecha de vuelta). */
export function isOut(state: HealthState): boolean {
  return state === 'enfermo' || state === 'lesionado'
}

/**
 * Días de baja que quedan, contando HOY: el motor recupera al corredor cuando el día de juego
 * SUPERA `untilDay` (`progression.ts`), así que el último día de baja es `untilDay` incluido.
 * `null` si no hay baja, no hay fecha o no hay mundo contra el que medir.
 */
export function healthDaysLeft(health: RiderHealth | null, gameDay: number | null): number | null {
  if (!health || !isOut(health.state) || health.untilDay == null || gameDay == null) return null
  const left = health.untilDay - gameDay + 1
  return left > 0 ? left : null
}

/**
 * Hasta cuándo dura la baja, en el mismo lenguaje que el reloj del mundo ("GD 143", día de la
 * temporada). Devuelve `null` cuando no hay nada que decir: sano, molestias, sin fecha, o una fecha
 * ya pasada (el corredor vuelve en el próximo tick).
 */
export function healthUntilLabel(
  health: RiderHealth | null,
  gameDay: number | null,
): string | null {
  if (!health || !isOut(health.state) || health.untilDay == null) return null
  const gd = seasonPosition(health.untilDay).dayOfSeason
  const left = healthDaysLeft(health, gameDay)
  if (left == null) return gameDay == null ? `out until GD ${gd}` : null
  return `out until GD ${gd} · ~${left} ${left === 1 ? 'day' : 'days'}`
}
