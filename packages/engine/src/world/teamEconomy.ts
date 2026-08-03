import type { Division } from './npc.js'

/**
 * Economía del equipo (finanzas semanales). El presupuesto (`teams.budget`) es una cuenta viva: cada
 * semana entra el PATROCINIO y salen los SALARIOS de la plantilla y el ALQUILER de vivienda que el
 * equipo asuma; además, al acudir a una carrera, el equipo paga el VIAJE de sus corredores.
 *
 * El patrocinio se dimensiona para cubrir a grandes rasgos la masa salarial de una plantilla al
 * completo, con un pequeño margen para los viajes: así los presupuestos se mantienen estables (los
 * equipos fuertes aguantan; los que se sobrepasan en fichajes o viajan mucho aprietan). Es una
 * calibración conservadora —sin ingresos por resultados ni gastos de staff todavía—, toda tunable
 * aquí. Puro y determinista; la capa de datos aplica los apuntes.
 */

/** Patrocinio semanal por división (ingreso fijo al presupuesto del equipo). */
export const SPONSOR_INCOME_PER_WEEK: Record<Division, number> = {
  WT: 26_000,
  PRS: 9_600,
  CON: 2_800,
}

/**
 * Salario semanal medio por corredor y división: estimación de la masa salarial de los corredores NPC
 * (que no llevan contrato en la base). Cuadra con la escala del mercado (S_div del salario ofertado).
 */
export const AVG_WEEKLY_WAGE: Record<Division, number> = {
  WT: 900,
  PRS: 450,
  CON: 200,
}

/** Masa salarial semanal estimada de una plantilla de NPCs (sin contrato) de una división. */
export function npcWageBill(division: Division, npcCount: number): number {
  return AVG_WEEKLY_WAGE[division] * Math.max(0, npcCount)
}
