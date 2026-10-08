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
   * ignora el parámetro (11-h). La cabecera, los tramos y el acta lo reciben en el 9a.
   */
  readonly diag?: boolean
}

/** El `?diag=1` de la página (§11.15): solo su valor exacto lo activa, como en la API (`stageQuerySchema`). */
export function diagOf(search: URLSearchParams): boolean {
  return search.get('diag') === '1'
}

/**
 * La clave de React Query de la ficha de una etapa: con `diag`, para que la respuesta del modo
 * diagnóstico no sirva nunca la vista normal ni al revés (§11.15, §10.9). Desde el 9a llevará además el
 * `rev` del horizonte al final (`horizonKey`, §14.11).
 */
export function stageReplayKey(raceId: string, day: number, diag: boolean): readonly unknown[] {
  return ['stage-replay', raceId, day, diag]
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
