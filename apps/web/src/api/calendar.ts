export type RaceLevel = 'WT' | 'PRS' | 'CON'
export type RaceFormat = 'gran-vuelta' | 'una-semana' | 'un-dia'
export type RaceClass = 'WT' | 'Pro' | '1' | '2' | 'NC'

const RACE_CLASS_LABEL: Record<RaceClass, string> = {
  WT: '.WT',
  Pro: '.Pro',
  '1': '.1',
  '2': '.2',
  NC: '.NC',
}

export function raceClassLabel(cls: RaceClass): string {
  return RACE_CLASS_LABEL[cls] ?? cls
}

export interface CalendarStageSummary {
  index: number
  name: string
  label: string
  kind: string
  km: number
  timeTrial: boolean
  /** Ciudad de salida y de meta de la etapa (país anfitrión), o null si no hay recorrido. */
  from: string | null
  to: string | null
}

export interface CalendarRaceSummary {
  id: string
  name: string
  level: RaceLevel
  raceClass: RaceClass
  championshipCountry: string | null
  championshipCategory: 'elite' | 'u23' | null
  country: string | null
  format: RaceFormat
  startDay: number
  openTo: RaceLevel[]
  winner: string | null
  stages: CalendarStageSummary[]
}

export interface Calendar {
  races: CalendarRaceSummary[]
  /** Día actual de la temporada (0..363), o null si aún no hay mundo. */
  dayOfSeason: number | null
}

export async function fetchCalendar(): Promise<Calendar> {
  const res = await fetch('/api/calendar')
  if (!res.ok) throw new Error('Could not load the calendar.')
  return (await res.json()) as Calendar
}

const FORMAT_LABEL: Record<RaceFormat, string> = {
  'gran-vuelta': 'Grand tour',
  'una-semana': 'Stage race',
  'un-dia': 'One-day',
}

export function formatLabel(format: RaceFormat): string {
  return FORMAT_LABEL[format]
}
