import type { RaceS, RiderIx, SprintFrame, SprintRole } from '@cyclingstar/shared'

/**
 * EL ÚLTIMO KM EN PANTALLA (W5c, la revisión de `Watch`; docs/diseno/e3-visual/implementacion.md): los
 * fotogramas del final del primer grupo (W5b, `ServedLine.sprint`) a la hora del reloj de `Watch`, y sus
 * palabras. Entre dos fotogramas, cada uno se mueve en línea recta por la hora; antes del primero, el
 * primero, y después del último, el último: la línea la trae la meta (D-06). Puro.
 */

/** Un corredor del panel: sus metros tras el primero, a décimas, y lo que hace. */
export interface SprintRow {
  readonly rider: RiderIx
  readonly behindM: number
  readonly role: SprintRole
}

/** El final a una hora: los metros que le quedan a la cabeza del grupo y los de delante, en orden. */
export interface SprintNow {
  /** a la decena hacia abajo, como la capa fija (§6.2) */
  readonly toGoM: number
  readonly rows: readonly SprintRow[]
  /**
   * alguien tira de su velocista, lanza, cede o va encerrado: un sprint, y el panel lo dice. Sale de lo
   * que se ve, no del tipo de final, que diría antes de tiempo si cazan a la fuga (D-06)
   */
  readonly sprint: boolean
}

/** ¿Se ve un sprint? Alguien que no va sin más en el grupo. */
const sprinting = (rows: readonly SprintRow[]): boolean => rows.some((r) => r.role !== 'bunch')

const round1 = (x: number): number => Math.round(x * 10) / 10 + 0

/** Un fotograma tal cual, en filas. */
function rowsOf(f: SprintFrame): SprintNow {
  const rows = f.spots.map((s) => ({ rider: s.rider, behindM: s.behindM, role: s.role }))
  return { toGoM: Math.floor(f.toGoM / 10) * 10, rows, sprint: sprinting(rows) }
}

/**
 * EL FINAL A LA HORA `tS` (s de carrera): entre los dos fotogramas que la rodean, los del más cercano,
 * cada uno a sus metros por la hora (el que solo sale en uno, con los de ese) y con el papel del más
 * cercano; en el orden de la carretera. Justo en la hora de un fotograma, el fotograma. Null sin
 * fotogramas.
 */
export function sprintNowAt(frames: readonly SprintFrame[], tS: RaceS): SprintNow | null {
  if (frames.length === 0) return null
  const sorted = [...frames].sort((a, b) => a.atDs - b.atDs)
  const tDs = tS * 10
  const next = sorted.findIndex((f) => f.atDs > tDs)
  if (next === 0) return rowsOf(sorted[0]!)
  if (next === -1) return rowsOf(sorted.at(-1)!)
  const a = sorted[next - 1]!
  const b = sorted[next]!
  const w = (tDs - a.atDs) / (b.atDs - a.atDs)
  const before = new Map(a.spots.map((s) => [s.rider, s] as const))
  const after = new Map(b.spots.map((s) => [s.rider, s] as const))
  // quién sale, lo dice el fotograma más cercano: nadie entra antes de tiempo ni se queda de más
  const riders = (w < 0.5 ? a : b).spots.map((s) => s.rider)
  const rows = riders
    .map((rider): SprintRow => {
      const x = before.get(rider)
      const y = after.get(rider)
      const from = (x ?? y)!.behindM
      const to = (y ?? x)!.behindM
      const role = (w < 0.5 ? (x ?? y) : (y ?? x))!.role
      return { rider, behindM: round1(from + (to - from) * w), role }
    })
    .sort((p, q) => p.behindM - q.behindM || p.rider - q.rider)
  const head = rows[0]?.behindM ?? 0
  return {
    toGoM: Math.floor((a.toGoM + (b.toGoM - a.toGoM) * w) / 10) * 10,
    rows: rows.map((r) => ({ ...r, behindM: round1(r.behindM - head) })),
    sprint: sprinting(rows),
  }
}

/** Dónde está el reproductor, lo que decide si sale el panel. */
export interface SprintPanelAt {
  readonly lastKm: boolean
  readonly phase: string
  readonly timeTrial: boolean
  /** los km a meta de la capa fija a esa hora (`Instant.toGoKm`): el panel dice la misma distancia */
  readonly toGoKm: number
}

/**
 * Los metros a meta como los escribe la capa fija (`toGoText`: a la decena hacia abajo). La capa pone la
 * cabeza en el centro de su bloque y los fotogramas, en la marca de su final, así que sus metros no
 * casan: el panel dice los de la capa, que se leen arriba en grande.
 */
const overlayMetres = (toGoKm: number): number => Math.floor(Math.max(0, toGoKm) * 100 + 1e-9) * 10

/**
 * EL PANEL DEL FINAL, SI SALE (W5c): en el último km de una etapa en línea, antes de la llegada y del
 * cierre (allí manda la meta), y solo con fotogramas, los de una etapa grabada con su final (W5a-2), y
 * con dos o más delante: el que llega solo se ve mejor en la barra de grupos, con lo que les saca a los
 * de detrás. En otro caso, null, y la barra de grupos como siempre.
 */
export function sprintPanelAt(
  frames: readonly SprintFrame[],
  tS: RaceS,
  at: SprintPanelAt,
): SprintNow | null {
  if (at.timeTrial || !at.lastKm || at.phase === 'arrival' || at.phase === 'closing') return null
  const now = sprintNowAt(frames, tS)
  return now !== null && now.rows.length >= 2 ? { ...now, toGoM: overlayMetres(at.toGoKm) } : null
}

/** Lo que hace cada uno, en la pantalla; en el grupo, nada. */
export const SPRINT_ROLE_WORD: Readonly<Record<SprintRole, string | null>> = {
  bunch: null,
  leadOut: 'Lead-out',
  launched: 'Sprinting',
  fading: 'Fading',
  boxed: 'Boxed in',
}

/** El hueco en la carretera, en metros: `+1.4 m`; el primero, nada. */
export function sprintGapText(behindM: number): string {
  return behindM <= 0 ? '' : `+${behindM.toFixed(1)} m`
}

/**
 * EL MARGEN DE LA LLEGADA, como lo dice la tele: `by a tyre`, `by half a wheel`, `by a wheel`, `by a
 * bike length` y, desde ahí, `by 3 bike lengths` (una bicicleta, 1,8 m).
 */
export function marginWords(m: number): string {
  if (m < 0.25) return 'by a tyre'
  if (m < 0.5) return 'by half a wheel'
  if (m < 1) return 'by a wheel'
  if (m < 2.7) return 'by a bike length'
  return `by ${Math.round(m / 1.8)} bike lengths`
}

/** Lo mismo en pantalla: la misma distancia y las mismas filas (para no repintar, como la barra, §18.5). */
export function sameSprint(a: SprintNow | null, b: SprintNow | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.toGoM === b.toGoM &&
    a.sprint === b.sprint &&
    a.rows.length === b.rows.length &&
    a.rows.every((r, i) => {
      const o = b.rows[i]!
      return r.rider === o.rider && r.behindM === o.behindM && r.role === o.role
    })
  )
}
