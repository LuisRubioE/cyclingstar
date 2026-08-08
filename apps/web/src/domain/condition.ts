/**
 * La condición del corredor tal como se le enseña al jugador.
 *
 * Regla del proyecto (MVP.md Paso 20 y packages/shared/src/rider.ts): «la forma en estrellas y la
 * frescura en barra, NUNCA números internos». El diario del Banister viaja con `ctl`/`atl`/`tsb`
 * porque la web los necesita para calcular los cerillos del día con las mismas funciones del motor,
 * pero esos valores son carga acumulada en unidades arbitrarias: un ATL de 118 no significa nada
 * para el dueño del corredor y encima se sale de cualquier escala 0-100 que se le suponga.
 *
 * Aquí se traducen a las dos magnitudes que sí entiende un jugador, ambas acotadas a 0-100 por el
 * propio motor: FITNESS (el fondo construido, `fitnessFactor`) y FRESHNESS (lo descansado que está
 * hoy, `freshnessBar`). La fatiga desaparece como número porque la frescura ya la cuenta: es su
 * cara legible. Lógica pura y probada; la página solo pinta.
 */

import { fitnessFactor, freshnessBar } from '@cyclingstar/engine'

/** Un punto del diario, reducido a lo que hace falta aquí. */
export interface ConditionPoint {
  gameDay: number
  ctl: number
  tsb: number
}

/** Las dos barras 0-100 de un día del diario. */
export interface ConditionBars {
  fitness: number
  freshness: number
}

/** Fondo (0-100): el mismo `fitnessFactor` del motor, que ya acota, en porcentaje. */
export function fitnessBar(ctl: number): number {
  return Math.round(100 * fitnessFactor(ctl))
}

/** Las dos barras de un punto del diario, listas para pintar. */
export function conditionBars(point: ConditionPoint): ConditionBars {
  return { fitness: fitnessBar(point.ctl), freshness: Math.round(freshnessBar(point.tsb)) }
}

/**
 * Etiqueta cualitativa de una magnitud 0-100. Cinco escalones, para que el jugador lea una palabra
 * y no un número: es lo que hace legible «freshness 34» sin inventarse una escala nueva.
 */
export function conditionLabel(value: number): string {
  if (value >= 80) return 'Excellent'
  if (value >= 60) return 'Good'
  if (value >= 40) return 'Fair'
  if (value >= 20) return 'Low'
  return 'Very low'
}

/** La serie del gráfico: el diario traducido a las dos barras, día a día. */
export function conditionSeries(
  log: readonly ConditionPoint[],
): (ConditionBars & { gameDay: number })[] {
  return log.map((p) => ({ gameDay: p.gameDay, ...conditionBars(p) }))
}
