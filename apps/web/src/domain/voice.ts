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
 * Las respuestas ya dadas, por contexto y reparto, y dentro por línea (10b, los arreglos). La de una
 * línea no depende de cuánto se ha servido mientras lo servido la traiga: el instante es causal (B9) y
 * los sucesos revelados antes de ella llegan con ella o antes. Así un tramo nuevo, que cambia la línea
 * servida, no la rehace. Antes el memo era de cada línea servida, y cada tramo rehacía de golpe, al
 * pintar la voz, un instante por cada descuelgue de la etapa: de 26 a 44 ms con la CPU a ×4 al final de
 * Colombia e5, la mitad de las tareas largas de `Highlights`. Solo guarda respuestas, no la línea servida.
 */
const answersOf = new WeakMap<
  InstantContext,
  WeakMap<readonly RiderCard[], WeakMap<LiveLine, Map<string, boolean>>>
>()

/**
 * A QUIÉN NOMBRA LA VOZ (§7.7; 12-m; sustituye al criterio provisional `unnamedFor` del 3c): para cada
 * línea, el corredor está nombrado si `namedRidersOf` lo nombra en su grupo un instante antes de la
 * línea, con los sucesos revelados antes de ella; sin grupo (ya no corre), sin nombrar. Una vez por
 * línea (la voz la pinta a `overlayHz`): un instante por descuelgue, y no por fotograma. Desde el 10b,
 * una vez por línea y contexto, con cualquier línea servida que la traiga (`answersOf`).
 */
export function unnamedBefore(
  tl: TimelineCore,
  cast: readonly RiderCard[],
  ctx: InstantContext,
): (line: LiveLine) => (riderId: string) => boolean {
  const ixOf = new Map(cast.map((c) => [c.id, c.ix] as const))
  let byCast = answersOf.get(ctx)
  if (byCast === undefined) answersOf.set(ctx, (byCast = new WeakMap()))
  let byLine = byCast.get(cast)
  if (byLine === undefined) byCast.set(cast, (byLine = new WeakMap()))
  const answers = byLine
  const memo = new WeakMap<LiveLine, (riderId: string) => boolean>()
  return (line) => {
    const hit = memo.get(line)
    if (hit !== undefined) return hit
    let before: Instant | null = null
    let given = answers.get(line)
    if (given === undefined) answers.set(line, (given = new Map<string, boolean>()))
    const answer = given
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

/**
 * LA VOZ CALCULADA ANTES DE PINTARLA (10b, los arreglos; §18.5): a quién nombra cada descuelgue nuevo (los
 * de un tramo, o los muchos de un salto), lo mismo que `inVoice` pedirá al pintarlo, en tareas de como
 * mucho `sliceMs`: `next` cede el hilo antes de empezar (lo de antes en la tarea fue juntar la línea) y
 * entre una y otra. Se guarda en `answersOf`, y la voz lo encuentra hecho: tras un salto de 130 km, la
 * primera pintura de la voz calculaba todos de golpe (38 ms con la CPU a ×4). Las demás líneas no piden
 * nada (`inVoice`).
 */
export async function answerAhead(
  tl: TimelineCore,
  cast: readonly RiderCard[],
  ctx: InstantContext,
  lines: readonly LiveLine[],
  next: () => Promise<void>,
  sliceMs = 8,
  now: () => number = () => performance.now(),
): Promise<void> {
  const asking = lines.filter((l) => l.plantilla === 'rider_sits_up')
  if (asking.length === 0) return
  const unnamed = unnamedBefore(tl, cast, ctx)
  await next()
  let start = now()
  for (const line of asking) {
    inVoice(line, unnamed(line))
    if (now() - start >= sliceMs) {
      await next()
      start = now()
    }
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
  let said = saidOf.get(lines)
  if (
    said === undefined ||
    said.unnamed !== unnamed ||
    said.present !== extras.present ||
    said.state !== extras.state ||
    said.namesDelayS !== extras.namesDelayS
  ) {
    said = {
      unnamed,
      present: extras.present,
      state: extras.state,
      namesDelayS: extras.namesDelayS,
      items: allSaid(lines, unnamed, extras),
    }
    saidOf.set(lines, said)
  }
  // lo dicho hasta t: el principio de lo dicho en toda la línea, lo de hora ≤ t
  const items = said.items
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (items[mid]!.revealS <= t) lo = mid + 1
    else hi = mid
  }
  return items.slice(0, lo)
}

/**
 * LO DICHO EN TODA LA LÍNEA SERVIDA, POR HORA (10b, los arreglos; §18.5), y con qué se contó. La voz
 * hasta t es su principio: cada elemento entra si su hora es ≤ t (una línea, su hora; los nombres de una
 * caída, la suya, que es posterior; una de estado, la suya), y el orden estable por hora no depende de
 * cuáles entran. Se cuenta otra vez cuando cambian las líneas (un tramo), `unnamed` (su línea servida),
 * la frase de la fuga, las líneas de estado o la espera de los nombres; no a cada pintura.
 */
const saidOf = new WeakMap<
  readonly LiveLine[],
  {
    readonly unnamed: (line: LiveLine) => (riderId: string) => boolean
    readonly present: VoiceExtras['present']
    readonly state: VoiceExtras['state']
    readonly namesDelayS: number | undefined
    readonly items: readonly VoiceItem[]
  }
>()

function allSaid(
  lines: readonly LiveLine[],
  unnamed: (line: LiveLine) => (riderId: string) => boolean,
  extras: VoiceExtras,
): VoiceItem[] {
  const out: VoiceItem[] = []
  for (const l of lines) {
    if (!inVoice(l, unnamed(l))) continue
    const phrase = l.plantilla === 'breakaway_formed' ? (extras.present?.(l) ?? null) : null
    if (phrase !== null) {
      out.push({ k: 'text', revealS: l.revealS, km: l.km, text: phrase })
      continue
    }
    out.push({ k: 'entry', revealS: l.revealS, km: l.km, e: l })
    const namesAt = l.revealS + (extras.namesDelayS ?? 0)
    if (l.plantilla === 'crash' && l.protagonists.length > 0)
      out.push({ k: 'entry', revealS: namesAt, km: l.km, e: { ...l, plantilla: 'crash_names' } })
  }
  for (const x of extras.state ?? [])
    out.push({ k: 'text', revealS: x.revealS, km: x.km, text: x.text })
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
