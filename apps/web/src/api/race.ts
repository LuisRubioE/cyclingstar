export interface GcRow {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
  tiempoTotalS: number
}

export interface StageWinner {
  stageDay: number
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
}

export interface RaceHonour {
  season: number
  winnerName: string
  winnerCountry: string
}

export interface RaceStagePlan {
  index: number
  name: string
  label: string
  kind: string
  km: number
  timeTrial: boolean
  /** Ciudad de salida y de meta de la etapa, o null si no hay recorrido para el país. */
  from: string | null
  to: string | null
}

export interface RaceView {
  race: {
    id: string
    name: string
    level: string
    raceClass?: string
    format?: string
    stageCount?: number
    country?: string | null
  }
  stages: RaceStagePlan[]
  gc: GcRow[]
  stageWinners: StageWinner[]
  history: RaceHonour[]
}

export async function fetchRace(raceId: string): Promise<RaceView> {
  const res = await fetch(`/api/calendar/${raceId}`)
  if (!res.ok) throw new Error('Could not load the race.')
  return (await res.json()) as RaceView
}
