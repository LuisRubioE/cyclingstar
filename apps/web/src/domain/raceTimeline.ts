/**
 * Lógica de la página `World → Races` (docs/navegacion.md §3.3): la línea temporal de la temporada.
 *
 * Antes había DOS páginas —`Calendar` (línea temporal con "hoy" y desplegable de etapas) y `Races`
 * (buscador, filtros y agrupación en corriendo / resultados / por venir)— y las dos respondían a las
 * MISMAS dos preguntas: "¿qué viene?" y "¿qué pasó?". Aquí se unen: una sola línea temporal, con el
 * marcador de hoy en medio, buscador y filtros.
 *
 * Todo lo de este módulo es puro (no toca React ni la red) para poder probarlo sin DOM.
 */

import type { CalendarRaceSummary, RaceFormat } from '@cyclingstar/shared'

/** Estado de una carrera respecto al día de juego actual. */
export type RaceTimelineStatus = 'ongoing' | 'finished' | 'upcoming'

/** Último día de juego que ocupa la carrera (etapas + días de descanso intercalados). */
export function endDay(race: CalendarRaceSummary): number {
  return race.startDay + Math.max(1, race.stages.length) - 1 + race.restAfter.length
}

export function statusOf(race: CalendarRaceSummary, today: number | null): RaceTimelineStatus {
  if (today == null) return 'upcoming'
  if (today > endDay(race)) return 'finished'
  if (today >= race.startDay) return 'ongoing'
  return 'upcoming'
}

export type ClassFilter = 'all' | 'WT' | 'Pro' | 'CON' | 'NC'

/**
 * ¿Encaja la carrera en el filtro de clase? Los campeonatos nacionales son 532 carreras de un día:
 * tienen filtro propio y NO entran en la línea temporal (si no, la sepultan).
 */
export function matchesClass(race: CalendarRaceSummary, filter: ClassFilter): boolean {
  if (race.championshipCountry != null) return filter === 'NC'
  if (filter === 'NC') return false
  if (filter === 'all') return true
  if (filter === 'CON') return race.raceClass === '1' || race.raceClass === '2'
  return race.raceClass === filter
}

export type FormatFilter = 'all' | RaceFormat

export function matchesFormat(race: CalendarRaceSummary, filter: FormatFilter): boolean {
  return filter === 'all' || race.format === filter
}

/** Busca por nombre, código de país o ganador (lo que el jugador recuerda de una carrera). */
export function matchesQuery(race: CalendarRaceSummary, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    race.name.toLowerCase().includes(needle) ||
    (race.country ?? '').toLowerCase().includes(needle) ||
    (race.winner ?? '').toLowerCase().includes(needle)
  )
}

/** Una fila de la línea temporal: una carrera, o el marcador de "hoy" que las separa. */
export type TimelineRow =
  | { kind: 'race'; race: CalendarRaceSummary; status: RaceTimelineStatus }
  | { kind: 'today'; day: number }

export interface Timeline {
  rows: TimelineRow[]
  /** Carreras ya terminadas que quedan ocultas por encima de la ventana reciente. */
  earlierCount: number
  /** Carreras que pasan los filtros (contando las ocultas). */
  total: number
}

export interface TimelineOptions {
  today: number | null
  query?: string
  classFilter?: ClassFilter
  formatFilter?: FormatFilter
  /**
   * Cuántas carreras ya terminadas se enseñan por encima del marcador de "hoy". El resto se pliega
   * tras un "Show earlier races" para que lo recién corrido y lo que viene entren de un vistazo —en
   * el teléfono, sin desplazarse media temporada—.
   */
  recentWindow?: number
  /** El jugador ha pedido ver también el pasado lejano. */
  showEarlier?: boolean
}

/** Cuántas carreras terminadas se ven por defecto antes del marcador de "hoy". */
export const RECENT_WINDOW = 8

/**
 * Construye la línea temporal: carreras en orden cronológico, con el marcador de "hoy" justo antes
 * de la primera que aún no ha terminado, y el pasado lejano plegado.
 *
 * El marcador va SIEMPRE que haya un "hoy", aunque no queden carreras por venir (se pone al final):
 * es la referencia que ordena la lectura de toda la página.
 */
export function buildTimeline(
  races: readonly CalendarRaceSummary[],
  options: TimelineOptions,
): Timeline {
  const {
    today,
    query = '',
    classFilter = 'all',
    formatFilter = 'all',
    recentWindow = RECENT_WINDOW,
    showEarlier = false,
  } = options

  const matching = races
    .filter(
      (race) =>
        matchesClass(race, classFilter) &&
        matchesFormat(race, formatFilter) &&
        matchesQuery(race, query),
    )
    .sort((a, b) => a.startDay - b.startDay || a.name.localeCompare(b.name))

  const withStatus = matching.map((race) => ({ race, status: statusOf(race, today) }))
  const finished = withStatus.filter((r) => r.status === 'finished')
  const rest = withStatus.filter((r) => r.status !== 'finished')

  // Con "hoy" conocido se recorta el pasado lejano; sin mundo no hay pasado que recortar.
  const hidden = today == null || showEarlier ? 0 : Math.max(0, finished.length - recentWindow)
  const shownFinished = hidden > 0 ? finished.slice(hidden) : finished

  const rows: TimelineRow[] = shownFinished.map((r) => ({ kind: 'race', ...r }))
  if (today != null) rows.push({ kind: 'today', day: today })
  for (const r of rest) rows.push({ kind: 'race', ...r })

  return { rows, earlierCount: hidden, total: matching.length }
}

// --- Campeonatos nacionales ------------------------------------------------------------------

/** Etiqueta corta de cada prueba del campeonato (Crono/Ruta, Elite/Sub-23). */
export function champEventLabel(race: CalendarRaceSummary): string {
  const itt = race.stages[0]?.timeTrial ?? race.name.includes('ITT')
  const discipline = itt ? 'ITT' : 'Road'
  return race.championshipCategory === 'u23' ? `U23 ${discipline}` : discipline
}

/** Nombre del país tal como aparece en el título de la carrera, sin el sufijo de la prueba. */
export function champCountryName(race: CalendarRaceSummary): string {
  return race.name.replace(/ (U23 )?(ITT|Road) Championship$/, '')
}

export const CHAMP_EVENT_ORDER = ['ITT', 'Road', 'U23 ITT', 'U23 Road']

/** Día de temporada del campeonato de una nación (la prueba de RUTA élite, la última de su semana). */
export function nationDay(races: readonly CalendarRaceSummary[]): number {
  return Math.max(...races.map((r) => r.startDay))
}

/**
 * Los campeonatos agrupados por nación y ordenados por fecha. No todas las pruebas de un país caen
 * el mismo día (la crono entre semana, la ruta el fin de semana), y el hemisferio sur corre los
 * suyos en enero-febrero: por eso se ordena por fecha y no alfabéticamente.
 */
export function championshipsByNation(
  races: readonly CalendarRaceSummary[],
): [string, CalendarRaceSummary[]][] {
  const byCountry = new Map<string, CalendarRaceSummary[]>()
  for (const race of races) {
    const code = race.championshipCountry
    if (!code) continue
    const list = byCountry.get(code)
    if (list) list.push(race)
    else byCountry.set(code, [race])
  }
  return [...byCountry.entries()].sort(
    ([, a], [, b]) =>
      nationDay(a) - nationDay(b) || champCountryName(a[0]!).localeCompare(champCountryName(b[0]!)),
  )
}

/** Las pruebas de una nación, agrupadas por día de juego y ordenadas dentro de cada día. */
export function champEventsByDay(
  races: readonly CalendarRaceSummary[],
): [number, CalendarRaceSummary[]][] {
  const sorted = [...races].sort(
    (a, b) =>
      a.startDay - b.startDay ||
      CHAMP_EVENT_ORDER.indexOf(champEventLabel(a)) - CHAMP_EVENT_ORDER.indexOf(champEventLabel(b)),
  )
  const byDay = new Map<number, CalendarRaceSummary[]>()
  for (const race of sorted) {
    const list = byDay.get(race.startDay)
    if (list) list.push(race)
    else byDay.set(race.startDay, [race])
  }
  return [...byDay.entries()].sort(([a], [b]) => a - b)
}
