export interface TeamListItem {
  id: string
  name: string
  country: string | null
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
  riderCount: number
}

export interface TeamRider {
  id: string
  name: string
  country: string
  archetype: string
  isBot: boolean
  seasonPoints: number
}

export interface TeamDetail {
  id: string
  name: string
  country: string | null
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
  human: boolean
  roster: TeamRider[]
}

export interface TeamControl {
  premium: boolean
  isAdmin: boolean
  team: { id: string; name: string; isBot: boolean; ownedByMe: boolean } | null
}

export async function fetchTeamControl(): Promise<TeamControl | null> {
  const res = await fetch('/api/me/team-control')
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Could not load team control.')
  return ((await res.json()) as { control: TeamControl | null }).control
}

export async function takeOverTeam(): Promise<{ teamId: string; teamName: string }> {
  const res = await fetch('/api/teams/take-over', { method: 'POST' })
  const body = (await res.json().catch(() => ({}))) as {
    teamId?: string
    teamName?: string
    error?: string
  }
  if (!res.ok) throw new Error(body.error ?? 'take_over_failed')
  return { teamId: body.teamId!, teamName: body.teamName! }
}

export interface PublicRiderDetail {
  id: string
  name: string
  country: string
  archetype: string
  age: number
  isBot: boolean
  teamId: string | null
  teamName: string | null
  seasonPoints: number
  seasonRank: number
  fieldSize: number
  fame: number
  attributes: Record<string, number>
}

export async function fetchTeams(): Promise<TeamListItem[]> {
  const res = await fetch('/api/teams')
  if (!res.ok) throw new Error('Could not load teams.')
  return ((await res.json()) as { teams: TeamListItem[] }).teams
}

export async function fetchTeam(id: string): Promise<TeamDetail> {
  const res = await fetch(`/api/teams/${id}`)
  if (!res.ok) throw new Error('Could not load the team.')
  return ((await res.json()) as { team: TeamDetail }).team
}

export async function fetchPublicRider(id: string): Promise<PublicRiderDetail> {
  const res = await fetch(`/api/riders/${id}`)
  if (!res.ok) throw new Error('Could not load the rider.')
  return ((await res.json()) as { rider: PublicRiderDetail }).rider
}

export interface CountrySummary {
  country: string
  riderCount: number
}

export interface CountryRider {
  id: string
  name: string
  archetype: string
  isBot: boolean
  teamId: string | null
  teamName: string | null
  seasonPoints: number
  fame: number
}

export async function fetchCountries(): Promise<CountrySummary[]> {
  const res = await fetch('/api/countries')
  if (!res.ok) throw new Error('Could not load countries.')
  return ((await res.json()) as { countries: CountrySummary[] }).countries
}

export async function fetchCountryRiders(code: string): Promise<CountryRider[]> {
  const res = await fetch(`/api/countries/${code}`)
  if (!res.ok) throw new Error('Could not load the country.')
  return ((await res.json()) as { riders: CountryRider[] }).riders
}
