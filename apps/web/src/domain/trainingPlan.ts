/**
 * Plan semanal de entrenamiento: cómo se combina lo que dice el servidor con lo que el jugador
 * está editando y aún no ha guardado.
 *
 * Antes la página copiaba `query.data` a estado con un `useEffect`, así que CUALQUIER refetch en
 * segundo plano borraba las ediciones sin guardar. Aquí el plan del servidor es un valor DERIVADO
 * (se recalcula solo cuando cambian los datos) y las ediciones viven aparte, indexadas por día de
 * juego: un refetch cambia la base, nunca lo que el jugador ha tocado.
 */

import { type Intensity, type Session, defaultCoachPlan } from '@cyclingstar/shared'
import type { OrdersResponse } from '../api/training'

export interface DayPlan {
  gameDay: number
  session: Session
  intensity: Intensity
}

/** Edición pendiente de un día (lo que el jugador ha cambiado y aún no ha guardado). */
export type DayEdit = Partial<Pick<DayPlan, 'session' | 'intensity'>>

/**
 * Plan que propone el servidor para los próximos `horizon` días: sus órdenes guardadas y, donde no
 * hay ninguna, el plan por defecto del entrenador. Los días con carrera se saltan (#6), y los de
 * VIAJE también: el corredor que mañana sale en otro continente hoy está de camino, no entrenando.
 */
export function buildServerPlan(data: OrdersResponse, horizon: number): DayPlan[] {
  const raceDays = new Set(data.raceDays)
  const travelDays = new Set(data.travelDays.map((t) => t.gameDay))
  const byDay = new Map(data.orders.map((order) => [order.gameDay, order]))
  const plan: DayPlan[] = []
  for (let i = 1; i <= horizon; i++) {
    const gameDay = data.currentDay + i
    if (raceDays.has(gameDay) || travelDays.has(gameDay)) continue
    const existing = byDay.get(gameDay)
    const fallback = defaultCoachPlan(gameDay)
    plan.push({
      gameDay,
      session: existing?.session ?? fallback.session,
      intensity: existing?.intensity ?? fallback.intensity,
    })
  }
  return plan
}

/** Plan visible: el del servidor con las ediciones sin guardar encima. */
export function applyEdits(plan: DayPlan[], edits: Record<number, DayEdit>): DayPlan[] {
  return plan.map((day) => {
    const edit = edits[day.gameDay]
    return edit ? { ...day, ...edit } : day
  })
}

/** Añade (o completa) la edición de un día sin tocar las de los demás. */
export function withEdit(
  edits: Record<number, DayEdit>,
  gameDay: number,
  patch: DayEdit,
): Record<number, DayEdit> {
  return { ...edits, [gameDay]: { ...edits[gameDay], ...patch } }
}

/** Adopta el plan del equipo como edición pendiente para los días que el equipo sugiere. */
export function adoptTeamSuggestions(
  plan: DayPlan[],
  edits: Record<number, DayEdit>,
  suggestions: Map<number, DayPlan>,
): Record<number, DayEdit> {
  let next = edits
  for (const day of plan) {
    const suggestion = suggestions.get(day.gameDay)
    if (!suggestion) continue
    next = withEdit(next, day.gameDay, {
      session: suggestion.session,
      intensity: suggestion.intensity,
    })
  }
  return next
}
