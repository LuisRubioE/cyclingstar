export type RaceLevel = 'WT' | 'PRS' | 'CON'
export type RaceFormat = 'gran-vuelta' | 'una-semana' | 'un-dia'

export interface CalendarStageSummary {
  index: number
  name: string
  label: string
  kind: string
  km: number
  timeTrial: boolean
}

export interface CalendarRaceSummary {
  id: string
  name: string
  level: RaceLevel
  format: RaceFormat
  startDay: number
  openTo: RaceLevel[]
  stages: CalendarStageSummary[]
}

export interface Calendar {
  races: CalendarRaceSummary[]
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
