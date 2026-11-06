import type { RiderCard, RiderIx, WornJerseyView } from '@cyclingstar/shared'

/**
 * LA LÍNEA DE EQUIPOS DE UN GRUPO (E3, docs/visual.md §14.4; PR 17a; D-00b, 14-d y 14-f). Doce maillots
 * de 28 px no caben en la barra a 360, así que un grupo de cuatro a `nameWholeGroupUpTo` lleva un `Kit`
 * por equipo con su cuenta (`×3`) en lugar de un maillot por corredor: primero, aparte y sin cuenta, cada
 * corredor que viste un maillot de líder o de campeón (el nacional, con las dos letras de su país, porque
 * a 28 px varias banderas son gemelas); después, un `Kit` por equipo, de más a menos corredores y, a
 * igualdad, por el dorsal más bajo. Los de delante no cuentan en su equipo: las cuentas y los de delante
 * suman el tamaño del grupo. Lo que no cabe en `TEAM_KIT_LINES_MAX` renglones va a `+N teams`, y cuánto
 * cabe lo dice `fitTeamChips` con el ancho medido de la línea, no una cifra fija. Desde W2a (la revisión de
 * `Watch` del dueño), la llevan los de seis a `nameWholeGroupUpTo`: uno de cuatro o cinco lleva sus nombres,
 * cada uno con su bandera y su maillot (`NamesLine` de `GroupBar`).
 */

/** Los renglones de la línea de equipos (14-d): con dos, la barra cabe en la pantalla 09 (14-g). */
export const TEAM_KIT_LINES_MAX = 2

/** Un corredor de delante: lleva un maillot de líder o de campeón, y no cuenta en su equipo. */
export interface FrontChip {
  readonly kind: 'front'
  readonly rider: RiderIx
  readonly worn: Extract<WornJerseyView, { kind: 'leader' } | { kind: 'champion' }>
  /** las dos letras del país del campeón nacional; null en el de líder y en el mundial */
  readonly letters: string | null
}

/** Un equipo del grupo con sus corredores, sin los de delante; `teamId` null, los que van sin equipo. */
export interface TeamChip {
  readonly kind: 'team'
  readonly teamId: string | null
  readonly riders: readonly RiderIx[]
}

export type LineChip = FrontChip | TeamChip

/** Las fichas de la línea de un grupo, en el orden en que se pintan. */
export function teamLineOf(
  members: readonly RiderIx[],
  cast: readonly RiderCard[],
): readonly LineChip[] {
  const front: FrontChip[] = []
  const byTeam = new Map<string | null, RiderIx[]>()
  for (const r of members) {
    const card = cast[r]
    if (card === undefined) continue
    const worn = card.worn
    if (worn.kind === 'leader' || worn.kind === 'champion') {
      const national = worn.kind === 'champion' && worn.title.scope === 'national'
      front.push({ kind: 'front', rider: r, worn, letters: national ? worn.title.country : null })
      continue
    }
    const teamId = card.team?.id ?? null
    const riders = byTeam.get(teamId)
    if (riders === undefined) byTeam.set(teamId, [r])
    else riders.push(r)
  }
  const lowestBib = (riders: readonly RiderIx[]): number =>
    Math.min(...riders.map((r) => cast[r]?.bib ?? Number.POSITIVE_INFINITY))
  const teams = [...byTeam]
    .map(([teamId, riders]): TeamChip => ({ kind: 'team', teamId, riders }))
    .sort(
      (a, b) =>
        b.riders.length - a.riders.length ||
        lowestBib(a.riders) - lowestBib(b.riders) ||
        String(a.teamId).localeCompare(String(b.teamId)),
    )
  return [...front, ...teams]
}

export interface FitOptions {
  /** el hueco entre fichas (`gap-x-1`) */
  readonly gapPx?: number
  /** lo que mide `+N teams`, más que una ficha: el `Button` `control`, 91 px a 360 con DejaVu Sans (PR 21n) */
  readonly moreWidthPx?: number
  readonly lines?: number
}

/** ¿Caben estos anchos, uno tras otro y partiendo de línea, en `lines` renglones de `widthPx`? */
function fits(widthPx: number, widths: readonly number[], gapPx: number, lines: number): boolean {
  let line = 1
  let x = 0
  for (const w of widths) {
    if (x === 0) x = w
    else if (x + gapPx + w <= widthPx) x += gapPx + w
    else {
      line += 1
      x = w
    }
    if (w > widthPx || line > lines) return false
  }
  return true
}

/**
 * Cuántas fichas se pintan (14-f): todas si caben en `lines` renglones de `widthPx`; si no, las primeras
 * que caben con `+N teams` detrás, en el último renglón. Pura: la barra la llama con lo medido.
 */
export function fitTeamChips(
  widthPx: number,
  chipWidths: readonly number[],
  { gapPx = 4, moreWidthPx = 91, lines = TEAM_KIT_LINES_MAX }: FitOptions = {},
): number {
  if (fits(widthPx, chipWidths, gapPx, lines)) return chipWidths.length
  for (let k = chipWidths.length - 1; k >= 0; k--)
    if (fits(widthPx, [...chipWidths.slice(0, k), moreWidthPx], gapPx, lines)) return k
  return 0
}
