export interface GcEntry {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
  /** Abandonó la carrera: se muestra como DNF (fuera de la general). */
  dnf?: boolean
}

export interface PointsEntry {
  riderId: string
  name: string
  country: string
  isBot: boolean
  puntos: number
}

export interface TeamGcEntry {
  teamName: string
  tiempoTotalS: number
  riderCount: number
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
  teamsGc: TeamGcEntry[]
  stages: StageStatus[]
}

export interface ChronicleEntry {
  km: number
  tS: number
  plantilla: string
  protagonists: string[]
  /** Datos numéricos del evento (p.ej. gapS = ventaja de la fuga en segundos; trend = -1/0/1). */
  datos?: Record<string, number | string>
  /** Equipos de los protagonistas (nombres, sin repetir), para nombrarlos en la crónica. */
  protagonistTeams?: string[]
}

export interface StageResultEntry {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
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
  teamName: string | null
  isBot: boolean
  tiempoTotalS: number
}

export interface StageClassEntry {
  riderId: string
  name: string
  country: string
  isBot: boolean
  puntos: number
}

export interface StageReplay {
  day: number
  name: string
  km: number
  run: boolean
  /** La etapa es una contrarreloj: el journal cuenta la historia del crono (mejor tiempo, diferencias). */
  timeTrial?: boolean
  altimetry: string
  results?: StageResultEntry[]
  chronicle?: ChronicleEntry[]
  gc?: StageGcEntry[]
  /** Clasificación de la montaña (KOM) tras esta etapa. */
  kom?: StageClassEntry[]
  /** Clasificación por puntos (metas volantes) tras esta etapa. */
  points?: StageClassEntry[]
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

/** Crónica/journal de una etapa de calendario (pública). */
export async function fetchCalendarStage(raceId: string, day: number): Promise<StageReplay> {
  const res = await fetch(`/api/races/${raceId}/stages/${day}`)
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

/**
 * Plantillas de crónica (#79): varias redacciones por evento para que el relato no repita siempre
 * la misma frase. La variante es determinista (misma semilla ⇒ misma frase), así que re-renderizar
 * la etapa cuenta la misma historia.
 */
const CHRONICLE: Record<string, ((n: string) => string)[]> = {
  breakaway_formed: [
    (n) => `${n} attack and open a gap`,
    (n) => `${n} jump clear off the front`,
    (n) => `A move goes clear — ${n} force the pace`,
    (n) => `${n} slip away and the break is on`,
  ],
  peloton_concedes: [
    () => 'The peloton lets the move go',
    () => 'The bunch eases and grants the break its leash',
    () => 'No panic behind — the peloton concedes the gap',
    () => 'The favourites nod the move up the road',
  ],
  sprinters_give_up: [
    () => "The sprinters' teams give up the chase",
    () => 'The lead-out trains sit up — the catch looks unlikely',
    () => 'Behind, the fast men wave the white flag',
    () => 'The chase falters as the sprinters run out of legs',
  ],
  sprint_intermediate: [
    (n) => `${n} takes the intermediate sprint`,
    (n) => `${n} kicks first at the intermediate`,
    (n) => `${n} grabs the bonus points at the sprint`,
    (n) => `${n} pips the rest to the intermediate line`,
  ],
  climb_kom: [
    (n) => `${n} crests the climb first`,
    (n) => `${n} leads over the top for the KOM points`,
    (n) => `${n} dances away to top the climb`,
    (n) => `${n} is first to the summit`,
  ],
  break_cooperation: [(n) => `${n} start working together up front`],
  bunch_sprint: [
    (n) => `Into the final kilometre it's a bunch sprint — ${n} fight it out`,
    (n) => `The trains wind up for a mass gallop; ${n} in the mix`,
  ],
  final_km: [
    (n) => `Into the final kilometre ${n || 'the leaders'} are clear at the front`,
    (n) => `${n || 'The leaders'} hit the last kilometre in front`,
  ],
  time_gap: [() => 'Out front, the break presses on with its advantage'],
  sprinters_chase: [
    () => "The sprinters' teams hit the front to chase",
    () => 'The bunch organises behind — the chase is on',
  ],
  peloton_split: [
    (n) => `${n || 'The front'} lifts the tempo on the climb and the group thins`,
    (n) => `Selection on the climb as ${n || 'the leaders'} press the pace`,
    (n) => `${n || 'The pace'} bites on the climb — riders slip off the back`,
  ],
  breakaway_caught: [
    () => 'The peloton reels the breakaway back in',
    () => 'It all comes back together — the break is caught',
    () => 'The elastic snaps: the bunch swallows the move',
    () => 'Game over for the break as the peloton surges up',
  ],
  breakaway_consolidated: [
    (n) => `${n} settle into a rhythm with a healthy lead`,
    (n) => `The gap stabilises as ${n} commit to the move`,
    (n) => `${n} build their advantage out front`,
  ],
  crash: [
    (n) => `Chaos in the bunch — ${n} hit the deck`,
    (n) => `A touch of wheels brings down ${n}`,
    (n) => `Riders down: ${n} caught in a crash`,
  ],
  dropped: [
    (n) => `${n} can't hold the pace and slip back`,
    (n) => `The rhythm proves too much — ${n} are distanced`,
    (n) => `${n} lose contact with the group`,
  ],
  stage_win: [
    (n) => `${n} wins the stage`,
    (n) => `${n} throws up the arms — stage victory`,
    (n) => `${n} takes it at the line`,
    (n) => `Nobody could answer ${n} — the stage is theirs`,
  ],
  stage_win_itt: [
    (n) => `${n} wins the time trial`,
    (n) => `${n} sets the best time against the clock`,
    (n) => `${n} stops the clock fastest to take the TT`,
  ],
}

function pickVariant(key: string, seed: number, names: string, count: number): number {
  let h = 2166136261
  const s = `${key}:${seed}:${names}`
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h % count
}

/** Narra un evento del replay en inglés, variando la frase de forma determinista (SPEC 6.15, #79). */
export function narrate(plantilla: string, who: string[], seed = 0): string {
  const names = who.join(', ')
  const options = CHRONICLE[plantilla]
  if (!options) return plantilla
  const variant = options[pickVariant(plantilla, seed, names, options.length)]!
  return variant(names)
}
