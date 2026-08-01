export interface RacePref {
  raceId: string
  name: string
  level: string
  format: string
  startDay: number
  stageCount: number
  wanted: boolean
  callup: 'selected' | 'not-selected' | null
}

export async function fetchRacePrefs(): Promise<RacePref[]> {
  const res = await fetch('/api/riders/me/race-prefs')
  if (!res.ok) throw new Error('Could not load your objectives.')
  return ((await res.json()) as { races: RacePref[] }).races
}

export async function setRacePref(raceId: string, wanted: boolean): Promise<void> {
  const res = await fetch('/api/riders/me/race-prefs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raceId, wanted }),
  })
  if (!res.ok) throw new Error('Could not update your objectives.')
}
