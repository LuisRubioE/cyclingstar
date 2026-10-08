/**
 * EL MONTAJE DE `Watch` (E2, docs/retransmision.md §8.6, §8.7 y §8.8; D-22, DD-14, 8-h, 8-i; paso 10a):
 * lo que dicen la previa, la llegada, el cierre y los resúmenes de un salto, palabra por palabra. Puro:
 * sin React. Los componentes de `components/broadcast/StageCards.tsx` solo lo pintan, y el hook de
 * `StageWatch.tsx` cuenta sus cuadros con las duraciones de aquí.
 *
 * Lo que se aparta de §8.6, cada cosa con su motivo:
 * - El cuadro de los maillots en juego no dice los puntos en juego ni la bonificación de meta: salen de
 *   `STAGE` (`finishPoints`, `sprintPoints`, `climbPoints`, `timeBonuses`), que es del motor, y
 *   `StagePreview` no los lleva; tampoco quién puede quitarle a un líder los puntos o la montaña
 *   (`threats` solo viaja en la general, `previewOf` de la API). Va lo que viaja: quién lleva cada maillot
 *   y, en la general, los siguientes con su diferencia.
 * - El último cuadro del cierre ofrece siempre `Watch` y no `Tomorrow`: `PreStageInfo` no dice si la
 *   siguiente se ha corrido, y su página lo dice al abrirla (`not raced yet`).
 * - La general del cierre no da el tiempo total del líder: `StageClosing.gcAfter` lleva las diferencias.
 */
import {
  BROADCAST,
  type BroadcastFinish,
  type BroadcastHead,
  type Cue,
  type Instant,
  type JerseyKind,
  type ProfileStrip,
  type RiderCard,
  type RiderIx,
  type StageWeather,
  clockText,
  groupLabelText,
  nameOf,
  riderShort,
  shownGroupsOf,
} from '@cyclingstar/shared'
import { formatTime } from '../format'
import { climbCatText, cueText, raceClockText } from './screen'

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

// ------------------------------------------------------------------------------- la previa (§8.6)

/** Un cuadro de la previa (§8.6): el recorrido, el parte, los maillots en juego y los favoritos. */
export type PreviewCard =
  | { readonly k: 'route'; readonly title: string; readonly lines: readonly string[] }
  | { readonly k: 'weather'; readonly lines: readonly string[] }
  | {
      readonly k: 'jerseys'
      readonly rows: readonly { readonly jersey: JerseyKind | null; readonly text: string }[]
    }
  | { readonly k: 'favourites'; readonly lines: readonly string[] }

/** Las líneas del cuadro del recorrido, como mucho seis, en orden de km. */
const ROUTE_LINES_MAX = 6

/**
 * EL RECORRIDO (cuadro 1): cada puerto con su nombre (sin nombre, `Cat. 2 climb`), su categoría, su
 * longitud y su media si tiene pie, y el km de la cima o `finish` si corona en meta; cada volante,
 * `Intermediate sprint · km 129`; en un circuito, `3 laps of 14.2 km` delante. En orden de km y como mucho
 * seis líneas: si son más, cinco y `+2 more climbs`.
 */
export function routeLines(route: ProfileStrip, lengthKm: number): string[] {
  const items: { km: number; text: string; climb: boolean }[] = [
    ...route.climbs.map((c) => {
      const name =
        c.name === null ? `${climbCatText(c.cat)} climb` : `${c.name} · ${climbCatText(c.cat)}`
      const foot = c.lenKm > 0 ? ` · ${c.lenKm.toFixed(1)} km at ${c.avgPct.toFixed(1)}%` : ''
      const top = c.topKm >= lengthKm - 0.5 ? 'finish' : `km ${Math.round(c.topKm)}`
      return { km: c.topKm, text: `${name}${foot} · ${top}`, climb: true }
    }),
    ...route.sprintsKm.map((km) => ({
      km,
      text: `Intermediate sprint · km ${Math.round(km)}`,
      climb: false,
    })),
  ].sort((a, b) => a.km - b.km)
  const laps =
    route.laps > 1 ? [`${route.laps} laps of ${(lengthKm / route.laps).toFixed(1)} km`] : []
  const room = ROUTE_LINES_MAX - laps.length
  if (items.length <= room) return [...laps, ...items.map((x) => x.text)]
  const shown = items.slice(0, room - 1)
  const rest = items.slice(room - 1)
  const more = rest.every((x) => x.climb)
    ? `+${plural(rest.length, 'more climb', 'more climbs')}`
    : `+${rest.length} more`
  return [...laps, ...shown.map((x) => x.text), more]
}

/**
 * EL PARTE (cuadro 2), de `StageWeather` (D-14): la temperatura, `dry` si ningún tramo lleva lluvia, `rain`
 * si llueve desde la salida y `rain from km 120` si entra después; el viento del día o `No wind`; y los
 * tramos de viento lateral, fundidos los seguidos. Ni punto cardinal ni rumbo (6-k).
 */
export function weatherLines(w: StageWeather, lengthKm: number): string[] {
  const rainy = w.spans.find((s) => s.rain > 0)
  const rain =
    rainy === undefined
      ? w.spans.length === 0 && w.rain > 0
        ? 'rain'
        : 'dry'
      : rainy.fromKm <= 0
        ? 'rain'
        : `rain from km ${Math.round(rainy.fromKm)}`
  const lines = [`${Math.round(w.tempC)}°C · ${rain}`]
  const wind = w.spans[0]?.windKmh ?? 0
  lines.push(wind >= 0.5 ? `Wind ${Math.round(wind)} km/h` : 'No wind')
  const cross: string[] = []
  for (let i = 0; i < w.spans.length; i++) {
    if (w.spans[i]?.crosswind !== true) continue
    let j = i
    while (w.spans[j + 1]?.crosswind === true) j++
    const from = w.spans[i]!.fromKm
    const to = w.spans[j + 1]?.fromKm ?? lengthKm
    cross.push(`km ${Math.round(from)}-${Math.round(to)}`)
    i = j
  }
  if (cross.length > 0) lines.push(`Crosswind: ${cross.join(' · ')}`)
  return lines
}

/** Por qué es favorito (`StagePreview.favourites[].why`, 8-g): la palabra de su línea. */
export const FAVOURITE_WORDS = {
  gc: 'General classification',
  sprint: 'Sprinters',
  hills: 'Puncheurs',
  climb: 'Climbers',
  tt: 'Time triallists',
  cobbles: 'Cobbles specialists',
} as const

/**
 * LOS CUADROS DE LA PREVIA (§8.6): cuatro de `previewCardS`; en una carrera de un día, sin el de los
 * maillots (tres); en el digest, solo el del recorrido (§8.8). Un cuadro sin nada que decir no sale: con
 * la anterior velada la cabecera solo trae el recorrido y el parte (8-f).
 */
export function previewCardsOf(
  head: BroadcastHead,
  opts: { readonly digest: boolean; readonly oneDay: boolean },
): PreviewCard[] {
  const { stage, preview, cast } = head
  const cards: PreviewCard[] = [
    {
      k: 'route',
      title: `${stage.name.toUpperCase()} · ${stage.km} km`,
      lines: routeLines(preview.route, stage.lengthKm),
    },
  ]
  if (opts.digest) return cards
  cards.push({ k: 'weather', lines: weatherLines(preview.weather, stage.lengthKm) })
  if (!opts.oneDay) {
    const rows = jerseyRowsOf(head)
    if (rows.length > 0) cards.push({ k: 'jerseys', rows })
  }
  const byWhy = new Map<keyof typeof FAVOURITE_WORDS, string[]>()
  for (const f of preview.favourites) {
    const card = cast[f.rider]
    if (card === undefined) continue
    const names = byWhy.get(f.why) ?? []
    if (!names.includes(card.name)) names.push(card.name)
    byWhy.set(f.why, names)
  }
  if (byWhy.size > 0)
    cards.push({
      k: 'favourites',
      lines: [...byWhy].map(([why, names]) => `${FAVOURITE_WORDS[why]}: ${names.join(' · ')}`),
    })
  return cards
}

/**
 * LOS MAILLOTS EN JUEGO (cuadro 3): quién lleva cada uno y, en la general, los `previewThreatsMax`
 * siguientes de la general de salida con su diferencia; en la primera etapa nadie lo lleva (D-24).
 */
function jerseyRowsOf(head: BroadcastHead): { jersey: JerseyKind | null; text: string }[] {
  const { cast, startState, preview } = head
  if (preview.jerseysInPlay.length === 0)
    return head.stage.day === 1
      ? [{ jersey: null, text: 'Stage 1 · the stage winner takes the first leader’s jersey' }]
      : []
  const leaderS = startState.gcTop[0]?.gapS ?? 0
  return preview.jerseysInPlay.map((j) => {
    const holder = riderShort(cast, j.holder)
    if (j.threats.length === 0) return { jersey: j.jersey, text: holder }
    if (j.jersey === 'gc') {
      const closest = j.threats.map((r) => {
        const gap = (startState.gcTop.find((x) => x.rider === r)?.gapS ?? leaderS) - leaderS
        return `${cast[r]?.name ?? riderShort(cast, r)} +${clockText(gap)}`
      })
      return { jersey: j.jersey, text: `${holder} · closest: ${closest.join(' · ')}` }
    }
    const names = j.threats.map((r) => cast[r]?.name ?? riderShort(cast, r))
    return { jersey: j.jersey, text: `${holder} · within reach: ${names.join(', ')}` }
  })
}

// ------------------------------------------------------------------------------ la llegada (§8.7)

/** Un cuadro de la llegada (§8.7): el ganador, un grupo que llega o el fuera de control, con lo que dura. */
export interface ArrivalCard {
  readonly k: 'winner' | 'group' | 'time_cut'
  readonly title: string
  readonly detail: string
  /** s de pared: `finishFreezeS` el ganador, `cueHoldS[1]` un grupo, `cueHoldS[2]` el fuera de control */
  readonly holdS: number
}

/**
 * LA LLEGADA (§8.7, pasos 3 a 5): el ganador; los grupos que llegan detrás con un corredor del espectador,
 * un maillot de líder o uno de los `namedGcTop` primeros de la salida, en orden de llegada, cada uno con la
 * palabra del grupo que llevaba a la mayoría de los suyos en el último instante (`last`), o sus nombres si
 * son tres o menos (con `same time (3 km rule)`, 6-o); y el fuera de control, si lo hay. Tras `Show result`
 * se salta los grupos (§8.7); en el digest, solo el ganador (§8.8).
 */
export function arrivalCardsOf(
  head: BroadcastHead,
  finish: BroadcastFinish,
  last: Instant | null,
  opts: { readonly revealed: boolean; readonly digest: boolean; readonly oneDay: boolean },
): ArrivalCard[] {
  const { cast } = head
  const byId = new Map(cast.map((c) => [c.id, c] as const))
  const cards: ArrivalCard[] = []
  const winner = finish.result.find((r) => !r.dnf && r.puesto === 1)
  if (winner !== undefined) {
    const bib = byId.get(winner.riderId)?.bib
    cards.push({
      k: 'winner',
      title: opts.oneDay ? 'WINNER' : 'STAGE WINNER',
      detail: [
        `${bib == null ? '' : `${bib} `}${winner.name}`,
        ...(winner.teamName ? [winner.teamName] : []),
        formatTime(winner.tiempoS),
      ].join(' · '),
      holdS: BROADCAST.finishFreezeS,
    })
  }
  if (opts.digest) return cards
  if (!opts.revealed) {
    const topRank = new Map(head.startState.gcTop.map((x) => [x.rider, x.rank] as const))
    const named = (r: RiderIx): boolean => {
      const c = cast[r]
      return (
        c !== undefined &&
        (c.own || c.worn.kind === 'leader' || (topRank.get(r) ?? Infinity) <= BROADCAST.namedGcTop)
      )
    }
    const threeKm = new Set(finish.threeKmRule)
    const roads = last === null ? [] : shownGroupsOf(last)
    for (const a of finish.arrivals.slice(1)) {
      if (!a.riders.some(named)) continue
      let label: string
      if (a.riders.length <= 3)
        label = a.riders
          .map(
            (r) =>
              `${cast[r]?.name ?? riderShort(cast, r)}${threeKm.has(r) ? ' same time (3 km rule)' : ''}`,
          )
          .join(' · ')
      else {
        const inside = new Set(a.riders)
        let best: (typeof roads)[number] | undefined
        let most = 0
        for (const g of roads) {
          const n = g.members.filter((r) => inside.has(r)).length
          if (n > most) {
            most = n
            best = g
          }
        }
        label =
          best === undefined
            ? plural(a.riders.length, 'rider', 'riders')
            : groupLabelText('en', best.label, best.role, 'bar', nameOf(cast)).toUpperCase()
      }
      cards.push({
        k: 'group',
        title: label,
        detail: `+${clockText(a.gapS)}`,
        holdS: BROADCAST.cueHoldS[1],
      })
    }
  }
  const cut = finish.closing.outOfRace.filter((o) => o.reason === 'time_cut').length
  if (cut > 0)
    cards.push({
      k: 'time_cut',
      title: 'TIME CUT',
      detail: `${plural(cut, 'rider', 'riders')} outside the limit`,
      holdS: BROADCAST.cueHoldS[2],
    })
  return cards
}

// ------------------------------------------------------------------------------- el cierre (§8.6)

/** Una fila del resultado del cierre. */
export interface ClosingResultRow {
  readonly key: string
  readonly pos: string
  readonly name: string
  readonly team: string | null
  readonly time: string
  readonly own: boolean
  readonly podium: boolean
  /** `same time (3 km rule)` (6-o) */
  readonly note: string | null
}

/** Una fila de la general tras la etapa, con su flecha (`▲2`, `▼1`, `=`). */
export interface ClosingGcRow {
  readonly key: string
  readonly rank: number
  readonly move: string
  readonly name: string
  readonly gap: string
  readonly own: boolean
}

/** Un cuadro del cierre (§8.6): seis como mucho, de `closingCardS`; el último se queda. */
export type ClosingCard =
  | { readonly k: 'result'; readonly title: string; readonly rows: readonly ClosingResultRow[] }
  | { readonly k: 'gc'; readonly title: string; readonly rows: readonly ClosingGcRow[] }
  | {
      readonly k: 'jerseys'
      readonly title: string
      readonly rows: readonly { readonly jersey: JerseyKind; readonly text: string }[]
    }
  | { readonly k: 'outFront'; readonly title: string; readonly text: string }
  | { readonly k: 'out'; readonly title: string; readonly lines: readonly string[] }
  | {
      readonly k: 'next'
      /** `Next: Stage 19 · 204 km · Hills`, `Final stage`, o null en una carrera de un día */
      readonly text: string | null
      readonly nextDay: number | null
    }

const moveText = (move: number): string => (move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '=')

/** El motivo de un abandono en el resultado, como hoy. */
const dnfText = (reason: string | null | undefined): string =>
  reason === 'fuera_control' ? 'DNF · time cut' : 'DNF'

/**
 * LOS CUADROS DEL CIERRE (§8.6), de `BroadcastFinish.result` y `.closing`: 1, el resultado (los
 * `closingResultTop` primeros y los del espectador con su puesto, el podio resaltado, sus abandonos al
 * final); 2, la general tras la etapa con flechas; 3, los maillots de mañana (`FINAL JERSEYS` tras la
 * última); 4, `MOST KILOMETRES OUT FRONT` (DD-14), si alguien rodó delante; 5, fuera de carrera, si hay; 6,
 * la siguiente y `Report`. En una carrera de un día, sin la general ni los maillots (SPEC §6.15).
 */
export function closingCardsOf(
  head: BroadcastHead,
  finish: BroadcastFinish,
  opts: { readonly oneDay: boolean },
): ClosingCard[] {
  const { cast } = head
  const byId = new Map(cast.map((c) => [c.id, c] as const))
  const short = (r: RiderIx): string => riderShort(cast, r)
  const cards: ClosingCard[] = []
  const finished = finish.result.filter((r) => !r.dnf).sort((a, b) => a.puesto - b.puesto)
  const winnerS = finished[0]?.tiempoS ?? 0
  const threeKm = new Set(finish.threeKmRule.flatMap((r) => (cast[r] ? [cast[r].id] : [])))
  const rowOf = (r: (typeof finish.result)[number]): ClosingResultRow => {
    const card: RiderCard | undefined = byId.get(r.riderId)
    return {
      key: r.riderId,
      pos: r.dnf ? '' : String(r.puesto),
      name: `${card?.bib == null ? '' : `${card.bib} `}${r.name}`,
      team: r.teamName ?? null,
      time: r.dnf
        ? dnfText(r.reason)
        : r.puesto === 1
          ? formatTime(r.tiempoS)
          : `+${clockText(r.tiempoS - winnerS)}`,
      own: card?.own === true,
      podium: !r.dnf && r.puesto <= 3,
      note: threeKm.has(r.riderId) ? 'same time (3 km rule)' : null,
    }
  }
  cards.push({
    k: 'result',
    title: opts.oneDay ? 'RESULT' : `STAGE ${head.stage.day} · RESULT`,
    rows: [
      ...finished
        .filter((r, i) => i < BROADCAST.closingResultTop || byId.get(r.riderId)?.own === true)
        .map(rowOf),
      ...finish.result.filter((r) => r.dnf && byId.get(r.riderId)?.own === true).map(rowOf),
    ],
  })
  const { closing } = finish
  if (!opts.oneDay && closing.gcAfter.length > 0)
    cards.push({
      k: 'gc',
      title: `GENERAL CLASSIFICATION · after stage ${head.stage.day}`,
      rows: closing.gcAfter.map((g) => ({
        key: `gc${g.rider}`,
        rank: g.rank,
        move: moveText(g.move),
        name: short(g.rider),
        gap: g.rank === 1 ? '' : `+${clockText(g.gapS)}`,
        own: cast[g.rider]?.own === true,
      })),
    })
  if (!opts.oneDay && closing.jerseysTomorrow.length > 0)
    cards.push({
      k: 'jerseys',
      title: closing.tomorrow === null ? 'FINAL JERSEYS' : 'JERSEYS TOMORROW',
      rows: closing.jerseysTomorrow.map((j) => ({
        jersey: j.jersey,
        text: `${short(j.rider)}${j.changed ? ' · new' : ''}`,
      })),
    })
  const front = closing.mostKmOutFront
  if (front !== null && front.km >= 0.5)
    cards.push({
      k: 'outFront',
      title: 'MOST KILOMETRES OUT FRONT',
      text: `${short(front.rider)} · ${Math.round(front.km)} km`,
    })
  const abandons = closing.outOfRace.filter((o) => o.reason === 'abandon')
  const cut = closing.outOfRace.length - abandons.length
  if (closing.outOfRace.length > 0)
    cards.push({
      k: 'out',
      title: 'OUT OF THE RACE',
      lines: [
        ...abandons.map((o) => `ABANDON · ${short(o.rider)}`),
        ...(cut > 0 ? [`TIME CUT · ${plural(cut, 'rider', 'riders')}`] : []),
      ],
    })
  const next = closing.tomorrow
  cards.push({
    k: 'next',
    text: opts.oneDay
      ? null
      : next === null
        ? 'Final stage'
        : `Next: Stage ${next.stageDay} · ${next.km} km · ${next.label}`,
    nextDay: opts.oneDay || next === null ? null : next.stageDay,
  })
  return cards
}

// --------------------------------------------------- los resúmenes de un salto (§8.5; 8-i, 8-n)

/** Una línea de `While you skipped` o `Previously`: dónde (`km 37`, o la hora en la crono) y el rótulo. */
export interface RecapRow {
  readonly key: string
  readonly where: string
  readonly title: string
  readonly detail: string | null
}

/** El resumen en pantalla, fuera de la cola, con el reloj quieto (8-n). */
export interface RecapView {
  readonly title: 'WHILE YOU SKIPPED' | 'PREVIOUSLY'
  readonly rows: readonly RecapRow[]
}

/**
 * LAS LÍNEAS DE UN RESUMEN (8-i): los rótulos de `recapOf`, en orden de carrera, cada uno con el km de la
 * cabeza a su hora (`headKmAt`), o la hora de carrera en la crono, y su texto de rótulo (`cueText`) sobre
 * el instante de esa hora (`instantAt`, que el hook da).
 */
export function recapRowsOf(
  cues: readonly Cue[],
  head: BroadcastHead,
  instantAt: (t: number) => Instant,
): RecapRow[] {
  return cues.map((cue, i) => {
    const at = instantAt(cue.t)
    const text = cueText(cue, {
      cast: head.cast,
      instant: at,
      profile: head.profile,
      tt: head.tt,
    })
    return {
      key: `${i}:${cue.kind}:${cue.t}`,
      where: head.stage.timeTrial ? raceClockText(cue.t) : `km ${Math.round(at.headKm)}`,
      title: text.title,
      detail: text.detail,
    }
  })
}

/** Lo que dura cada cuadro, en s de pared: la previa, la llegada y el cierre. */
export const previewSeconds = (cards: readonly PreviewCard[]): number =>
  cards.length * BROADCAST.previewCardS
export const arrivalSeconds = (cards: readonly ArrivalCard[]): number =>
  cards.reduce((s, c) => s + c.holdS, 0)
