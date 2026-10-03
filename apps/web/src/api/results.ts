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

/** Crónica/journal de una etapa de calendario (pública). */
export async function fetchCalendarStage(raceId: string, day: number): Promise<StageReplay> {
  return request(`/api/races/${raceId}/stages/${day}`, stageReplaySchema, {
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
