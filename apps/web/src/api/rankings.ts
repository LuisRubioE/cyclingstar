import {
  type AllTimeRecords,
  type AwardWinner,
  type HallOfFameRow,
  type PalmaresRow,
  type RankingRow,
  type RecordEntry,
  type RiderRaceResult,
  type SeasonAwards,
  hallOfFameResponseSchema,
  palmaresResponseSchema,
  rankingResponseSchema,
  recordsResponseSchema,
  riderResultsResponseSchema,
  seasonAwardsResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type {
  AllTimeRecords,
  AwardWinner,
  HallOfFameRow,
  PalmaresRow,
  RankingRow,
  RecordEntry,
  RiderRaceResult,
  SeasonAwards,
}

export async function fetchRankings(): Promise<RankingRow[]> {
  const data = await request('/api/rankings', rankingResponseSchema, {
    errorMessage: 'Could not load the rankings.',
  })
  return data.ranking
}

export async function fetchYoungRankings(): Promise<RankingRow[]> {
  const data = await request('/api/rankings/young', rankingResponseSchema, {
    errorMessage: 'Could not load the young riders ranking.',
  })
  return data.ranking
}

export async function fetchSeasonAwards(): Promise<SeasonAwards | null> {
  const data = await request('/api/season-awards', seasonAwardsResponseSchema, {
    errorMessage: 'Could not load the season awards.',
  })
  return data.awards
}

export async function fetchHallOfFame(): Promise<HallOfFameRow[]> {
  const data = await request('/api/hall-of-fame', hallOfFameResponseSchema, {
    errorMessage: 'Could not load the hall of fame.',
  })
  return data.riders
}

export async function fetchRecords(): Promise<AllTimeRecords | null> {
  const data = await request('/api/records', recordsResponseSchema, {
    errorMessage: 'Could not load records.',
  })
  return data.records
}

export async function fetchPalmares(): Promise<PalmaresRow[]> {
  const data = await request('/api/riders/me/palmares', palmaresResponseSchema, {
    errorMessage: 'Could not load your palmarès.',
  })
  return data.palmares
}

/** Palmarés público de cualquier corredor (para su ficha). */
export async function fetchRiderPalmares(id: string): Promise<PalmaresRow[]> {
  const data = await request(`/api/riders/${id}/palmares`, palmaresResponseSchema, {
    errorMessage: 'Could not load the palmarès.',
  })
  return data.palmares
}

/**
 * Resultados públicos de cualquier corredor, agrupados por carrera: su puesto en la general (se
 * gane o no) con las etapas como desglose.
 */
export async function fetchRiderResults(id: string): Promise<RiderRaceResult[]> {
  const data = await request(`/api/riders/${id}/results`, riderResultsResponseSchema, {
    errorMessage: 'Could not load the results.',
  })
  return data.results
}
