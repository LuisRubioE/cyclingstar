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
  /** Localidad de salida y de meta de la etapa (recorrido real), o null si no está definido. */
  from: string | null
  to: string | null
  /** Altimetría de la etapa: SVG autocontenido del perfil (relieve, puertos y categorías). */
  altimetry: string
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
  /** Índices de etapa (1-based) tras los que hay día de descanso (vacío si no tiene). */
  restAfter: number[]
  gc: GcRow[]
  stageWinners: StageWinner[]
  history: RaceHonour[]
}

export async function fetchRace(raceId: string): Promise<RaceView> {
  const res = await fetch(`/api/calendar/${raceId}`)
  if (!res.ok) throw new Error('Could not load the race.')
  return (await res.json()) as RaceView
}

export interface StartlistRider {
  id: string
  name: string
  country: string
  isBot: boolean
  /** Dorsal (número de corredor); null en rosters sin dorsales. */
  bib: number | null
}

export interface StartlistTeam {
  id: string
  name: string
  country: string | null
  division: string
  /** Semilla del maillot del equipo (para pintar su kit). */
  jerseySeed: string
  /** Corredores de la escuadra; lleno solo cuando ya está congelada (`frozen`). */
  riders: StartlistRider[]
}

export interface RaceStartlist {
  /** La carrera está próxima a empezar (dentro de la ventana) y aún no se ha corrido. */
  upcoming: boolean
  /** Días de juego que faltan para la salida. */
  daysUntil?: number
  /** La escuadra ya está congelada (cierre de inscripciones pasado): se muestran corredores reales. */
  frozen?: boolean
  teams: StartlistTeam[]
  freeAgents: StartlistRider[]
}

export async function fetchStartlist(raceId: string): Promise<RaceStartlist> {
  const res = await fetch(`/api/calendar/${raceId}/startlist`)
  if (!res.ok) throw new Error('Could not load the startlist.')
  return (await res.json()) as RaceStartlist
}
