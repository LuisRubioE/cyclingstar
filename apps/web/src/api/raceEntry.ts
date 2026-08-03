export interface EnterableRace {
  raceId: string
  name: string
  country: string | null
  startDay: number
  raceClass: string
  travelMoney: number
  travelDays: number
  entered: boolean
  enrolled: boolean
  affordable: boolean
}

export async function fetchEnterableRaces(): Promise<EnterableRace[]> {
  const res = await fetch('/api/riders/me/race-entries')
  if (!res.ok) return []
  return ((await res.json()) as { races: EnterableRace[] }).races
}

export async function enterRace(raceId: string): Promise<void> {
  const res = await fetch(`/api/riders/me/race-entries/${raceId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not enter the race.')
}

export async function withdrawRace(raceId: string): Promise<void> {
  const res = await fetch(`/api/riders/me/race-entries/${raceId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not withdraw from the race.')
}
