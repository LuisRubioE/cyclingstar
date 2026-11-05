/**
 * Salud del corredor: etiquetas y "hasta cuándo" (presentación pura, sin HTTP ni React).
 *
 * El estado de salud es PÚBLICO (docs/navegacion.md §3.6): en el ciclismo real una lesión es
 * noticia, y un rival querría saberla. Lo privado sigue siendo el detalle fino —frescura, fatiga,
 * forma—, que solo se pinta en modo propietario.
 *
 * Aquí viven las etiquetas para que la insignia de la ficha, la del bloque de condición y las de la
 * plantilla digan exactamente lo mismo (antes había dos mapas copiados). Desde el 21h de E3, sin las clases
 * de color de la ficha de antes: el aspecto es el tono de su `Chip` (`healthTone`, §3.2).
 */

import { type HealthState, type RiderHealth, seasonPosition } from '@cyclingstar/shared'
import type { Tone } from '../components/ui/types'

export interface HealthLook {
  /** Texto visible de la insignia (inglés, como toda la interfaz). */
  label: string
  /** Explicación de una línea: qué significa para el corredor. */
  note: string
}

export const HEALTH_LOOK: Record<HealthState, HealthLook> = {
  sano: { label: 'Healthy', note: 'Fit to race and train.' },
  molestias: { label: 'Niggle', note: 'Can race, but at a slight disadvantage until it clears.' },
  enfermo: { label: 'Ill', note: "Resting to recover — won't be called up until fit again." },
  lesionado: { label: 'Injured', note: "Out with an injury — can't race until recovered." },
}

/** El tono de su `Chip` (E3, §3.2; PR 21h): sano, `good`; con molestias, `warn`; fuera de combate, `bad`. */
export function healthTone(state: HealthState): Extract<Tone, 'good' | 'warn' | 'bad'> {
  if (state === 'sano') return 'good'
  return isOut(state) ? 'bad' : 'warn'
}

/**
 * Frescura por debajo de la cual "sano" deja de significar "listo para correr".
 *
 * Salud y frescura son ejes distintos —sano/enfermo/lesionado por un lado, TSB por otro— y por eso
 * la insignia decía «Healthy · Fit to race and train» encima de una barra de frescura a cero, que
 * es exactamente lo contrario de lo que pasaba. La insignia sigue contando la SALUD, que es lo suyo,
 * pero cuando el corredor está fundido la nota lo dice: es un aviso real, porque el riesgo diario de
 * enfermar crece con la fatiga acumulada y el jugador no tiene otra forma de verlo venir.
 */
export const SPENT_FRESHNESS = 20

/**
 * La nota de la insignia de salud. Para un corredor sano depende de lo descansado que llegue; para
 * el resto es la de su estado. `freshness` es privada (solo la ve el dueño): sin ella se devuelve la
 * nota de siempre, que es lo correcto en la ficha pública.
 */
export function healthNote(state: HealthState, freshness: number | null): string {
  if (state !== 'sano' || freshness == null || freshness >= SPENT_FRESHNESS) {
    return HEALTH_LOOK[state].note
  }
  return 'No injury or illness, but deeply fatigued: racing now means poor legs and a real risk of falling ill.'
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
 * Hasta cuándo dura la baja, en el mismo lenguaje que el reloj del mundo: el día de la temporada, `Day 143`,
 * y nunca `GD 143` (E3, §4.10; PR 21h). Devuelve `null` cuando no hay nada que decir: sano, molestias, sin
 * fecha, o una fecha ya pasada (el corredor vuelve en el próximo tick).
 */
export function healthUntilLabel(
  health: RiderHealth | null,
  gameDay: number | null,
): string | null {
  if (!health || !isOut(health.state) || health.untilDay == null) return null
  const gd = seasonPosition(health.untilDay).dayOfSeason
  const left = healthDaysLeft(health, gameDay)
  if (left == null) return gameDay == null ? `out until Day ${gd}` : null
  return `out until Day ${gd} · ~${left} ${left === 1 ? 'day' : 'days'}`
}

/**
 * La chapa de salud de `RiderHeader` (E3, §4.6; PR 21h): solo si no está sano, con su estado, hasta cuándo si
 * está fuera (`Injured · out until Day 143 · ~6 days`) y su tono. Es pública, como el estado.
 */
export function healthChip(
  health: RiderHealth,
  gameDay: number | null,
): { readonly text: string; readonly tone: Tone } | null {
  if (health.state === 'sano') return null
  const until = healthUntilLabel(health, gameDay)
  const label = HEALTH_LOOK[health.state].label
  return { text: until === null ? label : `${label} · ${until}`, tone: healthTone(health.state) }
}
