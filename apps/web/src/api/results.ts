export interface GcEntry {
  riderId: string
  name: string
  country: string
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
}

export interface PointsEntry {
  riderId: string
  name: string
  country: string
  puntos: number
}

export interface StageStatus {
  day: number
  name: string
  kind: string
  km: number
  run: boolean
}

export interface RaceResults {
  gc: GcEntry[]
  points: PointsEntry[]
  kom: PointsEntry[]
  stages: StageStatus[]
}

export interface ChronicleEntry {
  km: number
  tS: number
  plantilla: string
  protagonists: string[]
}

export interface StageResultEntry {
  riderId: string
  name: string
  country: string
  puesto: number
  tiempoS: number
  bonificacionS: number
  puntosVolante: number
  puntosMontana: number
}

export interface StageGcEntry {
  riderId: string
  name: string
  country: string
  tiempoTotalS: number
}

export interface StageReplay {
  day: number
  name: string
  km: number
  run: boolean
  altimetry: string
  results?: StageResultEntry[]
  chronicle?: ChronicleEntry[]
  gc?: StageGcEntry[]
}

export async function fetchResults(): Promise<RaceResults> {
  const res = await fetch('/api/races/test-tour/results')
  if (!res.ok) throw new Error('Could not load results.')
  return (await res.json()) as RaceResults
}

export async function fetchStageReplay(day: number): Promise<StageReplay> {
  const res = await fetch(`/api/races/test-tour/stages/${day}`)
  if (!res.ok) throw new Error('Could not load the stage.')
  return (await res.json()) as StageReplay
}

/** Adelanta el mundo N días de juego (herramienta de pruebas de la alfa). */
export async function advanceWorld(days: number): Promise<{ currentDay: number | null }> {
  const res = await fetch(`/api/world/advance?days=${days}`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not advance the world.')
  return (await res.json()) as { currentDay: number | null }
}

/** Formatea segundos como h:mm:ss o mm:ss. */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** Narra un evento del replay en inglés (i18n barato en el cliente, SPEC 6.15). */
export function narrate(plantilla: string, who: string[]): string {
  const names = who.join(', ')
  switch (plantilla) {
    case 'breakaway_formed':
      return `${names} form the breakaway`
    case 'peloton_concedes':
      return 'The peloton lets the break go'
    case 'sprinters_give_up':
      return "The sprinters' teams give up the chase"
    case 'sprint_intermediate':
      return `${names} takes the intermediate sprint`
    case 'climb_kom':
      return `${names} leads over the climb`
    case 'breakaway_caught':
      return 'The breakaway is caught'
    case 'stage_win':
      return `${names} wins the stage`
    case 'stage_win_itt':
      return `${names} wins the time trial`
    default:
      return plantilla
  }
}
