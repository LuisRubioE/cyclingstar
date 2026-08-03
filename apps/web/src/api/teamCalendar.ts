export interface TeamCalendarRace {
  raceId: string
  name: string
  country: string | null
  startDay: number
  level: string
  raceClass: string
  format: string
  travelPerRider: number
  squad: number
  drafted: boolean
  natural: boolean
}

export interface TeamCalendar {
  teamId: string
  teamName: string
  teamCountry: string | null
  hasPlan: boolean
  races: TeamCalendarRace[]
}

export async function fetchTeamCalendar(): Promise<TeamCalendar | null> {
  const res = await fetch('/api/teams/me/calendar')
  if (!res.ok) return null
  return ((await res.json()) as { calendar: TeamCalendar | null }).calendar
}

export async function draftRace(raceId: string): Promise<void> {
  const res = await fetch(`/api/teams/me/calendar/${raceId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not add the race to the plan.')
}

export async function undraftRace(raceId: string): Promise<void> {
  const res = await fetch(`/api/teams/me/calendar/${raceId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not remove the race from the plan.')
}
