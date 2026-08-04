/**
 * Informe personal de la última carrera (qué ordené vs qué pasó). El servidor reconstruye la
 * crónica desde el snapshot sellado; aquí solo damos tipos y frases en segunda persona.
 */

export interface RaceReportOrders {
  role: string
  mentality: string
  contestSprints: boolean
  contestClimbs: boolean
}

export interface RaceReportEvent {
  km: number
  plantilla: string
}

export interface RiderRaceReport {
  raceName: string
  stageName: string
  raceId: string
  stageDay: number
  orders: RaceReportOrders | null
  position: number
  fieldSize: number
  timeGapToWinnerS: number
  sprintPoints: number
  komPoints: number
  bonusS: number
  winnerName: string | null
  personalEvents: RaceReportEvent[]
  story: RaceReportEvent[]
}

export async function fetchLastRace(): Promise<RiderRaceReport | null> {
  const res = await fetch('/api/riders/me/last-race')
  if (!res.ok) return null
  return ((await res.json()) as { report: RiderRaceReport | null }).report
}

const ROLE_LABEL: Record<string, string> = {
  lider: 'Leader',
  colider: 'Co-leader',
  gregario: 'Domestique',
  libre: 'Free role',
  lanzador: 'Lead-out',
  cazaetapas: 'Break hunter',
  marcador: 'Marker',
}
const MENTALITY_LABEL: Record<string, string> = {
  reservon: 'conservative',
  oportunista: 'opportunistic',
  combativo: 'aggressive',
  supercombativo: 'all-out aggressive',
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}
export function mentalityLabel(m: string): string {
  return MENTALITY_LABEL[m] ?? m
}

/** Frase en segunda persona para un momento en el que el corredor fue protagonista. */
export function personalNarration(plantilla: string): string {
  switch (plantilla) {
    case 'breakaway_formed':
      return 'You attacked and made the breakaway'
    case 'sprint_intermediate':
      return 'You took the intermediate sprint'
    case 'climb_kom':
      return 'You crested the climb first — KOM points'
    case 'breakaway_caught':
      return 'Your breakaway was reeled back in'
    case 'stage_win':
      return 'You won the stage! 🏆'
    case 'stage_win_itt':
      return 'You won the time trial! 🏆'
    default:
      return plantilla
  }
}

/** Veredicto corto comparando lo ordenado con lo sucedido. */
export function raceVerdict(r: RiderRaceReport): string {
  const top = r.fieldSize > 0 ? r.position / r.fieldSize : 1
  if (r.position === 1) return 'Perfect execution — you took the win.'
  if (r.position <= 3) return 'A podium — the plan came together.'
  if (r.orders?.contestSprints && r.position <= 8)
    return 'You went for the sprint and were right in the mix.'
  if (r.orders?.contestClimbs && r.komPoints > 0)
    return 'You animated the climbs and grabbed mountain points.'
  if (r.orders?.role === 'gregario') return 'A domestique day — work done for the team.'
  if (top <= 0.15) return 'A strong ride near the front.'
  if (top <= 0.4) return 'A solid day in the bunch.'
  return 'A quiet day — the race got away from you.'
}
