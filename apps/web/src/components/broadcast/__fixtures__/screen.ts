/**
 * LO QUE PINTAN LAS PIEZAS DE `Watch`, escrito a mano para sus tests de render estático (paso 3c):
 * una cabecera, un reparto y los instantes que `instantAt` daría. Los papeles y las etiquetas salen de
 * las funciones de verdad (`groupRoleOf`, `groupLabelOf`), así que un grupo de la barra se llama como se
 * llamaría en la retransmisión.
 */
import {
  BROADCAST,
  type BroadcastHead,
  type GapTrend,
  type GroupDetail,
  type GroupNow,
  type Instant,
  type JerseyKind,
  type MainGap,
  type RadioGroupKind,
  type RiderCard,
  type RiderIx,
  groupLabelOf,
  groupRoleOf,
} from '@cyclingstar/shared'

/** Un corredor del reparto: dorsal ix + 1, de uno de tres equipos, con su equipación. */
export function card(ix: RiderIx, over: Partial<RiderCard> = {}): RiderCard {
  const t = ix % 3
  return {
    ix,
    id: `rider-${ix}`,
    name: `Rider ${String.fromCharCode(65 + (ix % 26))}${ix}`,
    bib: ix + 1,
    country: 'ES',
    gender: 'M',
    team: { id: `team-${t}`, name: `Team ${t}`, jerseySeed: `seed-${t}` },
    worn: { kind: 'team' },
    lines: [],
    notoriety: 8,
    own: false,
    ...over,
  }
}

/** El reparto de `n` corredores; `over` cambia los que se digan. */
export function castOf(
  n: number,
  over: Readonly<Record<number, Partial<RiderCard>>> = {},
): RiderCard[] {
  return Array.from({ length: n }, (_, ix) => card(ix, over[ix] ?? {}))
}

/** El maillot de líder `jersey` sobre `ix`, desde la etapa anterior. */
export function leaderWorn(jersey: JerseyKind): RiderCard['worn'] {
  return {
    kind: 'leader',
    jersey,
    delegated: false,
    from: { raceKey: 'race-france:s0', stageDay: 17 },
  }
}

/** Un grupo de la carretera, sin papel todavía. */
export interface RoadGroup {
  readonly members: readonly RiderIx[]
  readonly km: number
  /** al de cabeza, en su último km de foto */
  readonly gapS?: number
  /** el del motor: con 'peloton', el grupo del título */
  readonly kind?: RadioGroupKind
  readonly jerseys?: readonly JerseyKind[]
  readonly own?: boolean
  readonly trend?: GapTrend | null
  readonly detail?: GroupDetail | null
}

/**
 * Un instante con estos grupos en orden de carretera: el número, el papel (`groupRoleOf`) y la
 * etiqueta (`groupLabelOf`) como los pondría `instantAt`, sobre `racing` corredores en carrera.
 */
export function instantOf(
  road: readonly RoadGroup[],
  opts: {
    readonly lengthKm?: number
    readonly racing?: number
    readonly t?: number
    readonly mainGap?: MainGap | null
    readonly lapsToGo?: number | null
    readonly inTransit?: Instant['inTransit']
  } = {},
): Instant {
  const racing = opts.racing ?? road.reduce((s, g) => s + g.members.length, 0)
  const roles = groupRoleOf(
    road.map((g) => ({ size: g.members.length, kind: g.kind ?? 'fuga' })),
    racing,
  )
  const groups: GroupNow[] = road.map((g, i) => {
    const role = roles[i]!
    const jerseys = g.jerseys ?? []
    return {
      g: i,
      number: i + 1,
      role,
      label: groupLabelOf(g.members.length, g.members, jerseys, role, road.length),
      kind: g.kind ?? 'fuga',
      km: g.km,
      size: g.members.length,
      members: [...g.members],
      gap: {
        toHeadS: g.gapS ?? 0,
        toAheadS: null,
        atKm: Math.floor(g.km),
        trend: g.trend ?? null,
      },
      detail: g.detail ?? null,
      jerseys,
      own: g.own ?? false,
    }
  })
  const lengthKm = opts.lengthKm ?? 185
  const headKm = groups[0]?.km ?? 0
  const mainGap: MainGap | null =
    opts.mainGap !== undefined
      ? opts.mainGap
      : groups.length < 2
        ? null
        : {
            ahead: 0,
            behind: 1,
            gapS: road[1]!.gapS ?? 0,
            trend: road[1]!.trend ?? null,
            ref: 'second',
          }
  return {
    t: opts.t ?? 7740,
    headKm,
    toGoKm: Math.max(0, lengthKm - headKm),
    lapsToGo: opts.lapsToGo ?? null,
    groups,
    inTransit: opts.inTransit ?? [],
    mainGap,
    banners: [],
    virtualGc: null,
    racing,
    gone: 0,
  }
}

/** Una cabecera de una etapa de `lengthKm` km con este reparto, del adaptador de la radio por defecto. */
export function headOf(
  cast: readonly RiderCard[],
  over: { readonly lengthKm?: number; readonly clock?: BroadcastHead['clock'] } = {},
): BroadcastHead {
  const lengthKm = over.lengthKm ?? 185.04
  const kms = Math.ceil(lengthKm)
  // un llano de 400 m y, del km 80 al 92, una subida al 5 %
  const altM = Array.from({ length: kms + 1 }, (_, k) =>
    k <= 80 ? 400 : k <= 92 ? 400 + (k - 80) * 50 : 1000,
  )
  const clock = over.clock ?? 'estimated'
  return {
    stage: {
      raceKey: 'race-france:s0',
      raceId: 'race-france',
      day: 18,
      name: 'Stage 18 · Summit finish',
      km: Math.round(lengthKm),
      kind: 'reina',
      timeTrial: false,
      label: 'Summit finish',
      lengthKm,
      dx: 0.1,
      blocks: Math.round(lengthKm / 0.1),
    },
    profile: {
      altM,
      climbs: [
        { footKm: 80, topKm: 92, cat: 'cat2', lenKm: 12, avgPct: 5, name: 'Côte de Monteynard' },
        { footKm: 105, topKm: 113, cat: 'cat3', lenKm: 8, avgPct: 3.1, name: null },
      ],
      sprintsKm: [129],
      laps: 1,
    },
    weather: {
      tempC: 21.4,
      rain: 0,
      spans: [
        { fromKm: 0, rain: 0, windDir: 90, windKmh: 18, crosswind: false },
        { fromKm: 80, rain: 0.4, windDir: 90, windKmh: 18, crosswind: true },
      ],
    },
    cast: [...cast],
    startState: {
      leaders: { gc: null, points: null, kom: null },
      gcTop: [],
      racingAtStart: cast.length,
    },
    pace: [...BROADCAST.pace],
    estimateS: 790,
    clock,
    source: clock === 'estimated' ? 'radio' : 'timeline',
    preview: {
      route: { altM: [], climbs: [], sprintsKm: [], laps: 1 },
      weather: { tempC: 21.4, rain: 0, spans: [] },
      jerseysInPlay: [],
      favourites: [],
    },
    view: { reachedS: null, known: false },
    gate: null,
    tt: null,
    tplRev: 0,
  }
}

/** Los corredores de `from` a `to` (sin incluir `to`). */
export function range(from: number, to: number): RiderIx[] {
  return Array.from({ length: to - from }, (_, i) => from + i)
}
