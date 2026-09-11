import {
  type AttrLogSource,
  type AttrTrendRow,
  type BlockReport,
  type CeilingOpinion,
  type CoachNote,
  type CoachView,
  blockReportResponseSchema,
  coachViewResponseSchema,
  trendResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type { AttrLogSource, AttrTrendRow, BlockReport, CeilingOpinion, CoachNote, CoachView }

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
