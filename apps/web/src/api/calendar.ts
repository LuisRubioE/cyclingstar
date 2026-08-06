/** Calendario de temporada (SPEC 8). Las etiquetas visibles viven en `domain/labels`. */

import {
  type Calendar,
  type CalendarRaceSummary,
  type CalendarStageSummary,
  type RaceClass,
  type RaceFormat,
  type RaceLevel,
  calendarResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type {
  Calendar,
  CalendarRaceSummary,
  CalendarStageSummary,
  RaceClass,
  RaceFormat,
  RaceLevel,
}

export async function fetchCalendar(): Promise<Calendar> {
  return request('/api/calendar', calendarResponseSchema, {
    errorMessage: 'Could not load the calendar.',
  })
}
