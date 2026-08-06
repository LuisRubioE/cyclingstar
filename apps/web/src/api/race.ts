import {
  type GcRow,
  type RaceHonour,
  type RaceStagePlan,
  type RaceStartlist,
  type RaceView,
  type StageWinner,
  type StartlistRider,
  type StartlistTeam,
  raceStartlistSchema,
  raceViewSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type {
  GcRow,
  RaceHonour,
  RaceStagePlan,
  RaceStartlist,
  RaceView,
  StageWinner,
  StartlistRider,
  StartlistTeam,
}

export async function fetchRace(raceId: string): Promise<RaceView> {
  return request(`/api/calendar/${raceId}`, raceViewSchema, {
    errorMessage: 'Could not load the race.',
  })
}

export async function fetchStartlist(raceId: string): Promise<RaceStartlist> {
  return request(`/api/calendar/${raceId}/startlist`, raceStartlistSchema, {
    errorMessage: 'Could not load the startlist.',
  })
}
