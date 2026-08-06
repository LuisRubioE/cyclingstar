/**
 * Explorar el mundo: equipos, ficha de equipo, ficha pública de corredor, países y agentes libres.
 * Todas las respuestas se validan con los esquemas compartidos (los tipos salen de ahí).
 */

import {
  type Badge,
  type CountryRider,
  type CountrySummary,
  type FreeAgent,
  type PublicRiderDetail,
  type TeamControl,
  type TeamDetail,
  type TeamListItem,
  type TeamNewsItem,
  type TeamRider,
  badgesResponseSchema,
  countriesResponseSchema,
  countryRidersResponseSchema,
  freeAgentsResponseSchema,
  okResponseSchema,
  publicRiderDetailResponseSchema,
  takeOverResponseSchema,
  teamControlResponseSchema,
  teamNewsResponseSchema,
  teamResponseSchema,
  teamsResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

export type {
  Badge,
  CountryRider,
  CountrySummary,
  FreeAgent,
  PublicRiderDetail,
  TeamControl,
  TeamDetail,
  TeamListItem,
  TeamNewsItem,
  TeamRider,
}

/** Estado de control de equipo. Sin sesión (401) no hay nada que mostrar: null. */
export async function fetchTeamControl(): Promise<TeamControl | null> {
  const data = await requestOptionalAuth('/api/me/team-control', teamControlResponseSchema, {
    errorMessage: 'Could not load team control.',
  })
  return data?.control ?? null
}

export async function takeOverTeam(): Promise<{ teamId: string; teamName: string }> {
  const data = await request('/api/teams/take-over', takeOverResponseSchema, {
    method: 'POST',
    errorMessage: 'take_over_failed',
  })
  return { teamId: data.teamId, teamName: data.teamName }
}

export interface TeamEdit {
  name?: string | undefined
  country?: string | undefined
  jerseySeed?: string | undefined
}

/** Edita el equipo que gestiona el usuario. Lanza con el código de error del servidor. */
export async function updateMyTeam(edit: TeamEdit): Promise<void> {
  await request('/api/teams/me', okResponseSchema, {
    method: 'PUT',
    json: edit,
    errorMessage: 'update_failed',
  })
}

export async function fetchTeams(): Promise<TeamListItem[]> {
  const data = await request('/api/teams', teamsResponseSchema, {
    errorMessage: 'Could not load teams.',
  })
  return data.teams
}

export async function fetchTeam(id: string): Promise<TeamDetail> {
  const data = await request(`/api/teams/${id}`, teamResponseSchema, {
    errorMessage: 'Could not load the team.',
  })
  return data.team
}

export async function fetchTeamNews(id: string): Promise<TeamNewsItem[]> {
  const data = await request(`/api/teams/${id}/news`, teamNewsResponseSchema, {
    errorMessage: 'Could not load team news.',
  })
  return data.news
}

export async function fetchPublicRider(id: string): Promise<PublicRiderDetail> {
  const data = await request(`/api/riders/${id}`, publicRiderDetailResponseSchema, {
    errorMessage: 'Could not load the rider.',
  })
  return data.rider
}

export async function fetchRiderBadges(id: string): Promise<Badge[]> {
  const data = await request(`/api/riders/${id}/badges`, badgesResponseSchema, {
    errorMessage: 'Could not load badges.',
  })
  return data.badges
}

export async function fetchCountries(): Promise<CountrySummary[]> {
  const data = await request('/api/countries', countriesResponseSchema, {
    errorMessage: 'Could not load countries.',
  })
  return data.countries
}

export async function fetchCountryRiders(code: string): Promise<CountryRider[]> {
  const data = await request(`/api/countries/${code}`, countryRidersResponseSchema, {
    errorMessage: 'Could not load the country.',
  })
  return data.riders
}

export async function fetchFreeAgents(filters: {
  country?: string
  vocation?: string
}): Promise<FreeAgent[]> {
  const params = new URLSearchParams()
  if (filters.country) params.set('country', filters.country)
  if (filters.vocation) params.set('vocation', filters.vocation)
  const qs = params.toString()
  const data = await request(`/api/free-agents${qs ? `?${qs}` : ''}`, freeAgentsResponseSchema, {
    errorMessage: 'Could not load free agents.',
  })
  return data.riders
}
