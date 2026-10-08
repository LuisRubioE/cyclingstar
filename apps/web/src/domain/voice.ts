/**
 * Qué dice la voz de `Watch` (docs/retransmision.md §12.2 y §12.5; D-43, punto 5; D-44). Pura.
 *
 * La voz es la crónica causal que la API construye para cada tramo (`buildChronicle` con `live`). La
 * web calla lo que ya dice el estado: la barra y la capa fija enseñan siempre quién va dónde y con
 * cuánto. Todo lo que se calla aquí sigue en el acta (`Report`). Desde el 6b la web pone además lo suyo
 * (§12.5): la frase de la fuga en lugar de la línea de `breakaway_formed` (12-e), la tendencia del
 * hueco (`gap_trend`) y los nombres de una caída en un segundo tiempo (`crash_names`).
 */

import {
  BROADCAST,
  CUE_OF_TEMPLATE,
  type ChronicleEntry,
  type Instant,
  type InstantContext,
  type LiveLine,
  type RaceS,
  type RiderCard,
  type TimelineCore,
  gapTrendLine,
  instantAt,
  namedRidersOf,
} from '@cyclingstar/shared'

/**
 * ¿Dice la voz esta línea? `unnamed(id)`: el corredor no estaba nombrado en su grupo un instante antes
 * de la línea (`namedRidersOf`, §7.7), es decir, con los sucesos revelados ANTES de ella (12-m): si
 * contara el propio descuelgue, todo el que se descuelga estaría nombrado por descolgarse. Lo que va
 * solo al acta lo dice `CUE_OF_TEMPLATE` (§6.6): el parte de cabeza y el de ventaja (`report_only`).
 */
export function inVoice(line: LiveLine, unnamed: (riderId: string) => boolean): boolean {
  if (CUE_OF_TEMPLATE[line.plantilla] === 'report_only') return false // front_group, time_gap (§6.6)
  if (line.plantilla === 'time_gap_run') return false // solo lo crea groupGapRuns, apagada en vivo
  // El descuelgue suelto de un corredor sin rótulo lo cuenta la barra (`GRUPPETTO · 23`).
  if (line.plantilla === 'rider_sits_up')
    return line.protagonists.some((p) => p.id == null || !unnamed(p.id))
  return true
}

/**
 * A QUIÉN NOMBRA LA VOZ (§7.7; 12-m; sustituye al criterio provisional `unnamedFor` del 3c): para cada
 * línea, el corredor está nombrado si `namedRidersOf` lo nombra en su grupo un instante antes de la
 * línea, con los sucesos revelados antes de ella; sin grupo (ya no corre), sin nombrar. Una vez por
 * línea (la voz la pinta a `overlayHz`): un instante por descuelgue, y no por fotograma.
 */
export function unnamedBefore(
  tl: TimelineCore,
  cast: readonly RiderCard[],
  ctx: InstantContext,
): (line: LiveLine) => (riderId: string) => boolean {
  const ixOf = new Map(cast.map((c) => [c.id, c.ix] as const))
  const memo = new WeakMap<LiveLine, (riderId: string) => boolean>()
  return (line) => {
    const hit = memo.get(line)
    if (hit !== undefined) return hit
    let before: Instant | null = null
    const answer = new Map<string, boolean>()
    const unnamed = (riderId: string): boolean => {
      const known = answer.get(riderId)
      if (known !== undefined) return known
      const r = ixOf.get(riderId)
      before ??= instantAt(tl, Math.max(0, line.revealS - 0.1), ctx)
      const from = r === undefined ? undefined : before.inTransit.find((x) => x.rider === r)?.from
      const g =
        r === undefined
          ? undefined
          : before.groups.find((x) => x.g === from || x.members.includes(r))
      const revealed = tl.events.filter((e) => e.revealS < line.revealS)
      const out =
        g === undefined || r === undefined
          ? true
          : !namedRidersOf(g, cast, revealed, ctx).named.includes(r)
      answer.set(riderId, out)
      return out
    }
    memo.set(line, unnamed)
    return unnamed
  }
}

/** Lo que la voz pinta: una línea de la crónica (con sus banderas) o una frase de estado de la web. */
export type VoiceItem =
  | {
      readonly k: 'entry'
      readonly revealS: RaceS
      readonly km: number
      readonly e: ChronicleEntry
    }
  | { readonly k: 'text'; readonly revealS: RaceS; readonly km: number; readonly text: string }

/** Lo que la web pone en la voz además de las líneas de la API (§12.5). */
export interface VoiceExtras {
  /** la frase de la fuga para la línea de `breakaway_formed` (12-e); null, la de la línea */
  readonly present?: (line: LiveLine) => string | null
  /** las líneas de estado ya dichas (la tendencia del hueco), por hora */
  readonly state?: readonly {
    readonly revealS: RaceS
    readonly km: number
    readonly text: string
  }[]
  /** s de carrera entre la caída y sus nombres: `crashNamesDelayS` de pared al ritmo de ahora */
  readonly namesDelayS?: number
}

/**
 * LA VOZ HASTA t (§12.2, §12.5): las líneas ya dichas que dice la voz (`inVoice`), con la frase de la
 * fuga en lugar de la de `breakaway_formed` (12-e), la caída y sus nombres en un segundo tiempo
 * (`linesOf`, D-13), y las líneas de estado de la web, todo por hora. Nunca una con hora mayor que t.
 */
export function voiceItemsOf(
  lines: readonly LiveLine[],
  t: RaceS,
  unnamed: (line: LiveLine) => (riderId: string) => boolean,
  extras: VoiceExtras = {},
): VoiceItem[] {
  const out: VoiceItem[] = []
  for (const l of lines) {
    if (l.revealS > t || !inVoice(l, unnamed(l))) continue
    const phrase = l.plantilla === 'breakaway_formed' ? (extras.present?.(l) ?? null) : null
    if (phrase !== null) {
      out.push({ k: 'text', revealS: l.revealS, km: l.km, text: phrase })
      continue
    }
    out.push({ k: 'entry', revealS: l.revealS, km: l.km, e: l })
    const namesAt = l.revealS + (extras.namesDelayS ?? 0)
    if (l.plantilla === 'crash' && l.protagonists.length > 0 && namesAt <= t)
      out.push({ k: 'entry', revealS: namesAt, km: l.km, e: { ...l, plantilla: 'crash_names' } })
  }
  for (const x of extras.state ?? [])
    if (x.revealS <= t) out.push({ k: 'text', revealS: x.revealS, km: x.km, text: x.text })
  // estable: a igual hora, la línea de la API antes que la de estado
  return out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => a.x.revealS - b.x.revealS || a.i - b.i)
    .map(({ x }) => x)
}

/**
 * LA TENDENCIA DEL HUECO EN LA VOZ (`gap_trend`, §12.5): una línea cuando la flecha de la diferencia
 * principal pasa a subir o a bajar (`trendMinS` en `trendWindowKm`), como mucho una por cada
 * `trendWindowKm` que avanza la cabeza, y nunca al cambiar la pareja de la diferencia (§6.2). Un estado
 * que la pantalla avanza con el instante que pinta; si la hora va hacia atrás, se queda con lo de antes.
 */
export interface GapTrendVoice {
  readonly lines: readonly { readonly revealS: RaceS; readonly km: number; readonly text: string }[]
  readonly pair: string | null
  readonly arrow: 'up' | 'down' | 'flat' | null
  /** la cabeza en la última línea; −∞ antes de la primera */
  readonly atKm: number
  readonly t: RaceS
}

export const GAP_TREND_INIT: GapTrendVoice = {
  lines: [],
  pair: null,
  arrow: null,
  atKm: Number.NEGATIVE_INFINITY,
  t: -1,
}

export function gapTrendStep(s: GapTrendVoice, i: Instant): GapTrendVoice {
  if (i.t < s.t)
    return { ...GAP_TREND_INIT, lines: s.lines.filter((l) => l.revealS <= i.t), t: i.t }
  const gap = i.mainGap
  const pair = gap === null ? null : `${gap.ahead}>${gap.behind}`
  const arrow = gap?.trend?.arrow ?? null
  if (pair !== s.pair) return { ...s, pair, arrow, t: i.t } // la pareja cambia: la flecha vuelve a empezar
  if (
    gap !== null &&
    gap.trend !== null &&
    arrow !== s.arrow &&
    arrow !== 'flat' &&
    i.headKm - s.atKm >= BROADCAST.trendWindowKm
  ) {
    const text = gapTrendLine('en', gap.trend)
    if (text !== null)
      return {
        lines: [...s.lines, { revealS: i.t, km: Math.round(i.headKm * 10) / 10, text }],
        pair,
        arrow,
        atKm: i.headKm,
        t: i.t,
      }
  }
  return { ...s, arrow, t: i.t }
}
