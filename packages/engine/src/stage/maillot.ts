/**
 * EL MAILLOT DE LÍDER (v90): qué le hace al que lo lleva, y solo a él.
 *
 * Hasta la v89 esto vivía FUERA del motor, en `packages/db/src/stageRun.ts`, como una constante
 * suelta (`LEADER_JERSEY_BOOST` = 1,04) que multiplicaba por 1,04 los DIEZ atributos del que tenía
 * déficit 0. Tres defectos, y el tercero es el que vio el dueño:
 *
 *  1. Ni constante en `constants.ts` ni nota de balance: ningún banco la corría, así que ninguna
 *     banda la veía. El banco de carreras pequeñas medía un motor sin maillot.
 *  2. «Déficit 0» no es «el líder»: con empates a tiempo eran varios a la vez.
 *  3. Y sobre todo, subía el SPR. El velocista que gana una etapa se viste de líder por la
 *     bonificación, y desde ese día esprinta un 4 % más rápido: 90,4 de SPR pasaba a 94 contra un
 *     segundo de 85. Es la bola de nieve de Francisco Alves, que ganó la 2, la 3 y la 4.
 *
 * Lo que el dueño pide es lo contrario de una bola de nieve: el maillot «da alas» para DEFENDERLO
 * (aguantar un poco más en el puerto o en la crono), y el que lo lleva tiene un poco MENOS de
 * opciones de ganar la etapa, no más. La primera mitad vive aquí (`applyLeaderJersey`, que se
 * llama al armar el campo del día) y la segunda en el remate (`finishStage`, con `llevaMaillot`).
 */
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import type { StageRider } from './types.js'

/**
 * ¿HAY UN MAILLOT QUE LLEVAR? Solo cuando la general ya tiene diferencias: en la etapa 1 de una
 * vuelta y en una carrera de un día todos llegan a cero y nadie viste de líder. Es la misma regla
 * con la que `stageRun` encendía el viejo empujón.
 */
export function hayMaillot(riders: readonly { gcDeficitSeconds: number }[]): boolean {
  return riders.some((r) => r.gcDeficitSeconds > 0)
}

/**
 * ¿LO LLEVA ÉSTE? El puesto 1 de la general y no «déficit 0»: con empates a tiempo hay varios en
 * cero y maillot solo hay uno. Es el mismo criterio que `esMaillot` en la capa táctica.
 */
export function llevaMaillot(r: { gcRank?: number | null }, hay: boolean): boolean {
  return hay && r.gcRank === 1
}

/**
 * LAS ALAS: lo que el maillot le sube al que lo lleva. Solo los atributos del esfuerzo SOSTENIDO
 * con el que se defiende una general (`STAGE.jersey.alasAtributos`) y en `STAGE.jersey.alas`; el
 * resto, igual. Devuelve un objeto nuevo y no toca el de entrada.
 */
export function alasDelMaillot(eff0: Record<Attribute, number>): Record<Attribute, number> {
  const out = { ...eff0 }
  for (const a of STAGE.jersey.alasAtributos)
    out[a] = Math.min(100, out[a] * (1 + STAGE.jersey.alas))
  return out
}

/**
 * EL CAMPO DEL DÍA CON EL MAILLOT PUESTO. Se llama al armar los corredores de la etapa, antes de
 * `simulateStage`, en producción (`stageRun`) y en los bancos que corren carreras de varios días
 * como producción (`smallTours`, `grandTour`). Puro: devuelve corredores nuevos.
 */
export function applyLeaderJersey<R extends StageRider>(riders: readonly R[]): R[] {
  const hay = hayMaillot(riders)
  return riders.map((r) => (llevaMaillot(r, hay) ? { ...r, eff0: alasDelMaillot(r.eff0) } : r))
}
