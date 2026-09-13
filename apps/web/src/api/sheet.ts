import {
  type AttrLogSource,
  type AttrTrendRow,
  type BlockReport,
  type CeilingOpinion,
  type CoachNote,
  type CoachView,
  type PlanPreview,
  type TrainingMode,
  type TrainingPlanInput,
  blockReportResponseSchema,
  coachViewResponseSchema,
  okResponseSchema,
  planPreviewResponseSchema,
  trainingPlanResponseSchema,
  trendResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type {
  AttrLogSource,
  AttrTrendRow,
  BlockReport,
  CeilingOpinion,
  CoachNote,
  CoachView,
  PlanPreview,
  TrainingMode,
  TrainingPlanInput,
}

export type TrainingPlanResponse = {
  mode: TrainingMode
  plan: TrainingPlanInput | null
  currentDay: number
}

/**
 * The three calls behind your own rider sheet (docs/entrenamiento.md §2.3, §4.6). They only make
 * sense for the signed-in rider: nothing here exists for someone else's profile.
 */

export async function fetchTrend(): Promise<AttrTrendRow[]> {
  const res = await request('/api/riders/me/trend', trendResponseSchema, {
    errorMessage: 'Could not load your progress.',
  })
  return res.trend
}

export async function fetchCoachView(): Promise<CoachView | null> {
  const res = await request('/api/riders/me/coach-view', coachViewResponseSchema, {
    errorMessage: "Could not load your coach's view.",
  })
  return res.coachView
}

export async function fetchBlockReport(): Promise<BlockReport | null> {
  const res = await request('/api/riders/me/report', blockReportResponseSchema, {
    errorMessage: 'Could not load your block report.',
  })
  return res.report
}

/**
 * El plan por bloques (docs/entrenamiento.md §5.3). `preview` NO guarda nada: es la pregunta «si
 * hago esto, ¿cómo llego?», y la contesta el motor y no el navegador.
 */

export async function fetchTrainingPlan(): Promise<TrainingPlanResponse> {
  return request('/api/riders/me/plan', trainingPlanResponseSchema, {
    errorMessage: 'Could not load your training plan.',
  })
}

export async function saveTrainingPlan(body: {
  mode: TrainingMode
  plan: TrainingPlanInput
}): Promise<void> {
  await request('/api/riders/me/plan', okResponseSchema, {
    method: 'PUT',
    json: body,
    errorMessage: 'Could not save your training plan.',
  })
}

export async function previewTrainingPlan(body: {
  mode: TrainingMode
  plan: TrainingPlanInput
}): Promise<PlanPreview> {
  return request('/api/riders/me/plan/preview', planPreviewResponseSchema, {
    method: 'POST',
    json: body,
    errorMessage: 'Could not project your plan.',
  })
}
