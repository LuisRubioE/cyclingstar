export interface RankingRow {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
  points: number
}

export interface RaceHonour {
  season: number
  raceName: string
  winnerId: string
  winnerName: string
  winnerCountry: string
}

export interface PalmaresRow {
  season: number
  raceId: string
  raceName: string
  kind: string
  detail: string
}

export async function fetchRankings(): Promise<RankingRow[]> {
  const res = await fetch('/api/rankings')
  if (!res.ok) throw new Error('Could not load the rankings.')
  return ((await res.json()) as { ranking: RankingRow[] }).ranking
}

export interface HallOfFameRow {
  riderId: string
  name: string
  country: string
  isBot: boolean
  gc: number
  stage: number
  kom: number
  points: number
  total: number
}

export async function fetchHallOfFame(): Promise<HallOfFameRow[]> {
  const res = await fetch('/api/hall-of-fame')
  if (!res.ok) throw new Error('Could not load the hall of fame.')
  return ((await res.json()) as { riders: HallOfFameRow[] }).riders
}

export async function fetchRaceHistory(): Promise<RaceHonour[]> {
  const res = await fetch('/api/races/test-tour/history')
  if (!res.ok) throw new Error('Could not load the race history.')
  return ((await res.json()) as { history: RaceHonour[] }).history
}

export async function fetchPalmares(): Promise<PalmaresRow[]> {
  const res = await fetch('/api/riders/me/palmares')
  if (!res.ok) throw new Error('Could not load your palmarès.')
  return ((await res.json()) as { palmares: PalmaresRow[] }).palmares
}

const KIND_LABEL: Record<string, string> = {
  gc: 'Overall win',
  stage: 'Stage win',
  kom: 'Mountains',
  points: 'Points',
}

export function palmaresLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind
}
