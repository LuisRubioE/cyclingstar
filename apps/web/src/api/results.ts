/**
 * Resultados y replay de etapa. Solo HTTP + validación: la narración de la crónica vive en
 * `domain/narration` y el formateo de tiempos en `domain/format`.
 */

import {
  type ChronicleEntry,
  type GcEntry,
  type PointsEntry,
  type StageClassEntry,
  type StageGcEntry,
  type StageRaceContext,
  type StageReplay,
  type StageResultEntry,
  type TeamClassEntry,
  advanceWorldResponseSchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { horizonKey } from '../queryClient'
import { request } from './request'

export type {
  ChronicleEntry,
  GcEntry,
  PointsEntry,
  StageClassEntry,
  StageGcEntry,
  StageRaceContext,
  StageReplay,
  StageResultEntry,
  TeamClassEntry,
}

/** Cómo se pide la ficha de una etapa. */
export interface CalendarStageOptions {
  /**
   * EL MODO DIAGNÓSTICO DEL DUEÑO (E2, docs/retransmision.md §11.15 y §14.11; D-40, decisión 14-s;
   * paso 7b): la página lo lleva en la URL (`?diag=1`) y la ficha lo reenvía. Un administrador con
   * sesión recibe la etapa entera aunque no la haya visto, sin gastarla; para cualquier otro la API
   * ignora el parámetro (11-h). La cabecera, los tramos y el acta lo reciben desde el 9a
   * (`api/broadcast.ts`).
   */
  readonly diag?: boolean
}

/** El `?diag=1` de la página (§11.15). Vive en `queryClient.ts` desde el 9b. */
export { diagOf } from '../queryClient'

/**
 * La clave de React Query de la ficha de una etapa: con `diag`, para que la respuesta del modo
 * diagnóstico no sirva nunca la vista normal ni al revés (§11.15, §10.9), y desde el 9a con el `rev` del
 * horizonte al final (`horizonKey`, §14.11). Con SPOILER_MODE, la ficha de una etapa que no se ha visto
 * llega sin resultado (7b): al llegar a la meta o al revelarla cambia el `rev` (la meta invalida
 * `['horizon']`, la regla 3 de §10.9) y la ficha se pide otra vez, ya con él. Sustituye a la
 * invalidación por prefijo del 7b.
 */
export function stageReplayKey(
  raceId: string,
  day: number,
  diag: boolean,
  rev: string | undefined,
): readonly unknown[] {
  return horizonKey(['stage-replay', raceId, day, diag], rev)
}

/** Crónica/journal de una etapa de calendario (pública). */
export async function fetchCalendarStage(
  raceId: string,
  day: number,
  opts: CalendarStageOptions = {},
): Promise<StageReplay> {
  const query = opts.diag === true ? '?diag=1' : ''
  return request(`/api/races/${raceId}/stages/${day}${query}`, stageReplaySchema, {
    errorMessage: 'Could not load the stage.',
  })
}

/** Adelanta el mundo N días de juego (herramienta de pruebas de la alfa). */
export async function advanceWorld(days: number): Promise<{ currentDay: number | null }> {
  const data = await request(`/api/world/advance?days=${days}`, advanceWorldResponseSchema, {
    method: 'POST',
    errorMessage: 'Could not advance the world.',
  })
  return { currentDay: data.currentDay }
}
