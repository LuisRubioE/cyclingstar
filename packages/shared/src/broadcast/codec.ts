/**
 * EL FORMATO GUARDADO DE LA LÍNEA TEMPORAL (E2, docs/retransmision.md §4.3; D-10, I-17).
 *
 * `stage_timelines.body` guarda el gzip 9 del JSON de `StoredTimelineV1`: listas planas de enteros y
 * cadenas, relojes en Ds y km en décimas, la pertenencia de cada foto clave en base64 y los códigos
 * (`PullMotive`, `MishapKind`, `plantilla`) como cadena, nunca como índice de un enum.
 *
 * Nace en el PR 3a con lo que la red ya necesitaba (decisión 17-z): el tipo `StoredTimelineV1` (de él
 * sale `TimelineEventWire`, §4.11), los dos códigos numéricos, `SchemaMatches` y los seis esquemas que
 * el formato comparte con la red (4-x), que `wire.ts` importa de aquí. El 4b lo completa con
 * `encodeTimeline`, `decodeTimeline`, `storedTimelineV1Schema`, `STORED_MATCH` y `TimelineFormatError`,
 * y con eso el formato 1 queda cerrado (regla 10 de §17.1, 17-a): lo que se guarde después de la
 * primera línea grabada es un `format` 2 con su decodificador, porque lo guardado no se reescribe.
 *
 * Sin Node: `shared` lo carga también la web, así que el base64 de las fotos clave se hace aquí a
 * mano. El gzip y el `bytea` los pone `packages/db` (§5.6).
 *
 * Es del lado del grabador (15-b): no importa `./constants.js` ni ningún índice que lo reexporte. Por
 * eso los esquemas compartidos viven aquí y no en `wire.ts`, que carga `BROADCAST`.
 */
import { z } from 'zod'
import { jerseyKindSchema, pullMotiveSchema, type PullMotive } from '../contracts.js'
import type { ChampionTitle, Distinction, WornJersey } from '../jerseys.js'
import type {
  BannerResult,
  Block,
  CastRider,
  Ds,
  GroupCatalogEntry,
  GroupDetail,
  GroupIx,
  GroupOrigin,
  KeyPhoto,
  MishapKind,
  ProfileStrip,
  RiderIx,
  StageRef,
  StageTimeline,
  StageWeather,
  StateEvent,
  TimelineCast,
  TimelineEvent,
  TimeTrialTrace,
} from './timeline.js'
import { fromDs, fromKm10, toDs, toKm10 } from './timeline.js'

/** El formato 1 de `stage_timelines.body`, tal como se guarda (§4.3). */
export interface StoredTimelineV1 {
  /** igual a stage_timelines.format de su fila */
  readonly format: 1
  readonly engineVersion: number
  readonly dx: number
  readonly blocks: number
  readonly lengthKm: number
  readonly timeTrial: boolean
  /** por RiderIx */
  readonly riderIds: readonly string[]
  /** por GroupIx */
  readonly groupIds: readonly string[]
  /** cuartetos por GroupIx: [origin (0 start, 1 attack, 2 shed), bornB, diedB o −1, successor o −1] */
  readonly groupMeta: readonly number[]
  /** [b, base64 de un byte por RiderIx: GroupIx + 1, 0 = fuera]; el título de la foto sale de `main` */
  readonly keys: readonly (readonly [Block, string])[]
  /** tríos [Δb, rider, to + 1]; Δb respecto del trío anterior; to + 1 = 0 es `out` */
  readonly moves: readonly number[]
  /** pares [b, group + 1]; group + 1 = 0 es null */
  readonly main: readonly number[]
  /** tríos [b, g, Ds], por b y por g */
  readonly clocks: readonly number[]
  /** [b, corredor, código, pérdida] */
  readonly mishaps: readonly (readonly [Block, RiderIx, MishapKind, Ds])[]
  /** [source, plantilla, km en décimas, tS, bEmit, revealS, protagonistas, datos] */
  readonly events: readonly (readonly [
    number,
    string,
    number,
    Ds,
    Block,
    Ds,
    readonly RiderIx[],
    Readonly<Record<string, number | string>> | null,
  ])[]
  /** [b, g, velocidad en décimas de km/h o −1, pullingTotal, [relevista, motivo, para quién o −1], percance, pérdida en Ds] */
  readonly detail: readonly (readonly [
    Block,
    GroupIx,
    number,
    number,
    readonly (readonly [RiderIx, PullMotive | null, number])[],
    MishapKind | null,
    number,
  ])[]
  /** [0 volante o 1 cima, km en décimas, cat, nombre, revealS, orden plano [corredor, puntos, …]] */
  readonly banners: readonly (readonly [
    0 | 1,
    number,
    string | null,
    string | null,
    Ds,
    readonly number[],
  ])[]
  /** objetos tal cual, ya redondeados: km y porcentajes a 0,1, cotas a 1 m */
  readonly profile: ProfileStrip
  readonly cast: TimelineCast
  readonly weather: StageWeather
  /** ya en Ds */
  readonly tt: TimeTrialTrace | null
  readonly finish: {
    readonly finishDs: Ds
    readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[]
  }
}

/** Los dos únicos códigos numéricos del formato: cerrados y atados a su unión (un valor nuevo no compila). */
export const ORIGIN_CODE = { start: 0, attack: 1, shed: 2 } as const satisfies Record<
  GroupOrigin,
  0 | 1 | 2
>
export const BANNER_CODE = { meta_volante: 0, cima: 1 } as const satisfies Record<
  BannerResult['kind'],
  0 | 1
>

/**
 * El atado de un esquema con su tipo en los DOS sentidos (4-j, 4-x). `satisfies z.ZodType<T>` solo
 * falla si al esquema le falta un campo de T o se lo da de otro tipo: un campo de más, una variante
 * de más o un opcional donde T pide un nulo compilan. `SchemaMatches` es true solo si la salida del
 * esquema y T son asignables en los dos sentidos; `DeepReadonly` iguala los `readonly` de los dos
 * lados. Se usa como constante que solo lee el compilador (`WIRE_MATCH` y `STORED_MATCH`).
 */
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export type SchemaMatches<S extends z.ZodType, T> = [DeepReadonly<z.output<S>>] extends [
  DeepReadonly<T>,
]
  ? [DeepReadonly<T>] extends [DeepReadonly<z.output<S>>]
    ? true
    : false
  : false

const int = z.number().int()
/** RiderIx, GroupIx, Block, y un índice + 1 (0 = ninguno) */
const ix = int.min(0)
/** un reloj, una salida o una pérdida en Ds: nunca negativos */
const ds = int.min(0)
/** un índice o −1, que en memoria es null */
const orNone = int.min(-1)
const mishapKindSchema = z.enum(['caida', 'pinchazo', 'averia']) satisfies z.ZodType<MishapKind>

/** Las piezas que el formato comparte con la red: viven aquí y `wire.ts` las importa (4-x). */
export const stageRefSchema = z.object({
  raceKey: z.string(),
  stageDay: int.min(1),
}) satisfies z.ZodType<StageRef>
export const championTitleSchema = z.object({
  scope: z.enum(['world', 'continental', 'national']),
  country: z.string().length(2).nullable(),
  discipline: z.enum(['road', 'itt']),
  category: z.enum(['elite', 'u23']),
  season: int,
  validFromDay: int,
  validToDay: int,
  source: stageRefSchema,
  provisional: z.boolean(),
}) satisfies z.ZodType<ChampionTitle>
export const wornJerseySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('leader'),
    jersey: jerseyKindSchema,
    delegated: z.boolean(),
    from: stageRefSchema,
  }),
  z.object({ kind: z.literal('champion'), title: championTitleSchema }),
  z.object({ kind: z.literal('team') }),
]) satisfies z.ZodType<WornJersey>
export const distinctionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('leads'), jersey: jerseyKindSchema, from: stageRefSchema }),
  z.object({
    kind: z.literal('wears_for'),
    jersey: jerseyKindSchema,
    rank: int.min(1),
    from: stageRefSchema,
  }),
  z.object({ kind: z.literal('champion'), title: championTitleSchema }),
  z.object({
    kind: z.literal('gc'),
    rank: int.min(1),
    deficitS: z.number().min(0),
    from: stageRefSchema,
  }),
  z.object({ kind: z.literal('stage_wins'), stages: z.array(stageRefSchema) }),
]) satisfies z.ZodType<Distinction>
export const profileStripSchema = z.object({
  altM: z.array(int),
  sprintsKm: z.array(z.number()),
  laps: int.min(1),
  climbs: z.array(
    z.object({
      footKm: z.number(),
      topKm: z.number(),
      cat: z.string(),
      lenKm: z.number(),
      avgPct: z.number(),
      name: z.string().nullable(),
    }),
  ),
}) satisfies z.ZodType<ProfileStrip>
export const stageWeatherSchema = z.object({
  tempC: z.number(),
  rain: z.number().min(0).max(1),
  spans: z.array(
    z.object({
      fromKm: z.number(),
      rain: z.number(),
      windDir: z.number(),
      windKmh: z.number(),
      crosswind: z.boolean(),
    }),
  ),
}) satisfies z.ZodType<StageWeather>

const castRiderSchema = z.object({
  rider: ix,
  riderId: z.string(),
  bib: int.nullable(),
  team: ix.nullable(),
  country: z.string().length(2),
  gender: z.enum(['M', 'F']),
  start: z.object({
    gcRank: int.min(1).nullable(),
    gcDeficitS: z.number().min(0).nullable(),
    from: stageRefSchema.nullable(),
  }),
  worn: wornJerseySchema,
  distinctions: z.array(distinctionSchema),
  knownWins: ix,
}) satisfies z.ZodType<CastRider>
const timelineCastSchema = z.object({
  riders: z.array(castRiderSchema),
  teams: z.array(z.object({ teamId: z.string(), jerseySeed: z.string() })),
  favourites: z.array(
    z.object({ rider: ix, why: z.enum(['sprint', 'hills', 'climb', 'tt', 'cobbles']) }),
  ),
}) satisfies z.ZodType<TimelineCast>
const timeTrialTraceSchema = z.object({
  order: z.enum(['gc', 'bib']),
  intervalS: int.min(1),
  checksKm: z.array(z.number()),
  startDs: z.array(ds),
  kmClockDs: z.array(z.array(ds)),
  checkClockDs: z.array(z.array(ds)),
  mishaps: z.array(z.object({ rider: ix, km: z.number(), kind: mishapKindSchema, lostDs: ds })),
}) satisfies z.ZodType<TimeTrialTrace>
const flat = (n: number) =>
  z.array(ix).refine((a) => a.length % n === 0, `lista plana de ${n} en ${n}`)

/**
 * EL FORMATO 1 AL LEERLO de la base (H-13): la forma, los tipos y el múltiplo de cada lista plana. Lo
 * que cruza listas (que un GroupIx exista, que los b no bajen, que cada foto clave tenga un byte por
 * corredor) lo comprueba `fromStoredV1`, que lanza `TimelineFormatError`. Un motivo que ya no esté en
 * `pullMotiveSchema` se lee como null, como la radio guardada (`storedRaceRadioSchema`, en la API):
 * una palabra no tira la línea (O-14).
 */
export const storedTimelineV1Schema = z.object({
  format: z.literal(1),
  engineVersion: int.min(1),
  dx: z.number().positive(),
  blocks: int.min(1),
  lengthKm: z.number().positive(),
  timeTrial: z.boolean(),
  riderIds: z.array(z.string()),
  groupIds: z.array(z.string()),
  groupMeta: z.array(orNone).refine((a) => a.length % 4 === 0, 'groupMeta: cuartetos'),
  keys: z.array(z.tuple([ix, z.string()])),
  moves: flat(3),
  main: flat(2),
  clocks: flat(3),
  mishaps: z.array(z.tuple([ix, ix, mishapKindSchema, ds])),
  events: z.array(
    z.tuple([
      orNone,
      z.string(),
      ix,
      ds,
      ix,
      ds,
      z.array(ix),
      z.record(z.string(), z.union([z.number(), z.string()])).nullable(),
    ]),
  ),
  detail: z.array(
    z.tuple([
      ix,
      ix,
      orNone,
      ix,
      z.array(z.tuple([ix, pullMotiveSchema.nullable().catch(null), orNone])),
      mishapKindSchema.nullable(),
      ds,
    ]),
  ),
  banners: z.array(
    z.tuple([z.literal([0, 1]), ix, z.string().nullable(), z.string().nullable(), ds, flat(2)]),
  ),
  profile: profileStripSchema,
  cast: timelineCastSchema,
  weather: stageWeatherSchema,
  tt: timeTrialTraceSchema.nullable(),
  finish: z.object({ finishDs: ds, arrivals: z.array(z.tuple([ds, z.array(ix)])) }),
}) satisfies z.ZodType<StoredTimelineV1>
/** El otro sentido del atado (4-x): el esquema y el tipo, en todos los niveles. Solo lo lee el compilador. */
export const STORED_MATCH: SchemaMatches<typeof storedTimelineV1Schema, StoredTimelineV1> = true

/**
 * Lo que no es una línea del formato: un `format` que no se sabe leer, unas listas que no cruzan, o
 * una línea que no cabe en él (más de 255 grupos). El grabador lo trata como una autocomprobación
 * fallida (D-12): la etapa se queda sin línea, con su lápida y su nota.
 */
export class TimelineFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimelineFormatError'
  }
}

// --------------------------------------------------------------------- el base64 de las fotos clave

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_INDEX: ReadonlyMap<string, number> = new Map([...B64].map((c, i) => [c, i] as const))

/** Base64 estándar con relleno, el de `Buffer.toString('base64')`, sin Node: la web también carga este fichero. */
function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (bytes[i]! << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }
  return out
}

/** La inversa de `bytesToBase64`; lanza `TimelineFormatError` con un texto que no es base64. */
function base64ToBytes(text: string): Uint8Array {
  if (text.length % 4 !== 0)
    throw new TimelineFormatError(`stage_timelines: foto clave en base64 de ${text.length} letras`)
  const pad = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0
  const out = new Uint8Array((text.length / 4) * 3 - pad)
  let o = 0
  for (let i = 0; i < text.length; i += 4) {
    let n = 0
    for (let j = 0; j < 4; j++) {
      const ch = text[i + j]!
      const v = ch === '=' && i + j >= text.length - pad ? 0 : B64_INDEX.get(ch)
      if (v === undefined)
        throw new TimelineFormatError(`stage_timelines: «${ch}» no es base64 en una foto clave`)
      n = (n << 6) | v
    }
    for (const shift of [16, 8, 0]) if (o < out.length) out[o++] = (n >> shift) & 255
  }
  return out
}

// -------------------------------------------------------------------- escribir y leer el formato 1

/** El orden de los sucesos de estado dentro de un bloque (§4.2): out, move, main, clock, mishap. */
const STATE_ORDER: Readonly<Record<StateEvent['t'], number>> = {
  out: 0,
  move: 1,
  main: 2,
  clock: 3,
  mishap: 4,
}
const ORIGIN_OF_CODE: readonly GroupOrigin[] = ['start', 'attack', 'shed']
const BANNER_OF_CODE: readonly BannerResult['kind'][] = ['meta_volante', 'cima']

/**
 * Siempre escribe el formato vigente. Puro. Lanza `TimelineFormatError` si la línea no es del formato
 * 1, si no cabe en él (más de 255 grupos, porque la foto clave guarda un byte por corredor: 4-i) o si
 * sus sucesos de estado no van por bloque; el grabador lo trata como una autocomprobación fallida
 * (D-12). Todo número de la línea sale ya redondeado (§4.1), así que los redondeos de aquí no cambian
 * nada y `decodeTimeline` devuelve la misma línea (I3).
 */
export function encodeTimeline(tl: StageTimeline): StoredTimelineV1 {
  if (tl.format !== 1) throw new TimelineFormatError(`encodeTimeline: formato ${String(tl.format)}`)
  if (tl.groups.length > 255)
    throw new TimelineFormatError(
      `encodeTimeline: ${tl.groups.length} grupos, y el formato 1 admite 255`,
    )
  const keys = tl.keys.map((k): readonly [Block, string] => {
    const bytes = new Uint8Array(k.groupOf.length)
    k.groupOf.forEach((g, r) => {
      if (g < -1 || g >= tl.groups.length)
        throw new TimelineFormatError(
          `encodeTimeline: en la foto clave ${k.b}, el corredor ${r} va en el grupo ${g}`,
        )
      bytes[r] = g + 1
    })
    return [k.b, bytesToBase64(bytes)]
  })
  const moves: number[] = []
  const main: number[] = []
  const clocks: number[] = []
  const mishaps: (readonly [Block, RiderIx, MishapKind, Ds])[] = []
  let lastB = 0
  let lastMoveB = 0
  for (const e of tl.stateEvents) {
    if (e.b < lastB)
      throw new TimelineFormatError(`encodeTimeline: el bloque ${e.b} va tras el ${lastB}`)
    lastB = e.b
    switch (e.t) {
      case 'out':
        moves.push(e.b - lastMoveB, e.rider, 0)
        lastMoveB = e.b
        break
      case 'move':
        for (const r of e.riders) {
          moves.push(e.b - lastMoveB, r, e.to + 1)
          lastMoveB = e.b
        }
        break
      case 'main':
        main.push(e.b, e.group === null ? 0 : e.group + 1)
        break
      case 'clock':
        for (const [g, d] of e.marks) clocks.push(e.b, g, d)
        break
      case 'mishap':
        mishaps.push([e.b, e.rider, e.kind, e.lostDs])
        break
    }
  }
  return {
    format: tl.format,
    engineVersion: tl.engineVersion,
    dx: tl.dx,
    blocks: tl.blocks,
    lengthKm: tl.lengthKm,
    timeTrial: tl.timeTrial,
    riderIds: [...tl.riderIds],
    groupIds: tl.groups.map((g) => g.id),
    groupMeta: tl.groups.flatMap((g) => [
      ORIGIN_CODE[g.origin],
      g.bornB,
      g.diedB ?? -1,
      g.successor ?? -1,
    ]),
    keys,
    moves,
    main,
    clocks,
    mishaps,
    events: tl.events.map((e) => [
      e.source,
      e.plantilla,
      toKm10(e.km),
      toDs(e.tS),
      e.bEmit,
      toDs(e.revealS),
      [...e.riders],
      e.datos === null ? null : { ...e.datos },
    ]),
    detail: [...tl.detail].flatMap(([b, rows]) =>
      rows.map(
        (d) =>
          [
            b,
            d.g,
            d.speedKmh === null ? -1 : Math.round(d.speedKmh * 10),
            d.pullingTotal,
            d.pullers.map((p) => [p.rider, p.motive, p.forRider ?? -1] as const),
            d.mishap === null ? null : d.mishap.kind,
            d.mishap === null ? 0 : toDs(d.mishap.lostS),
          ] as const,
      ),
    ),
    banners: tl.banners.map((x) => [
      BANNER_CODE[x.kind],
      toKm10(x.km),
      x.cat,
      x.name,
      toDs(x.revealS),
      x.order.flatMap((o) => [o.rider, o.points]),
    ]),
    profile: tl.profile,
    cast: tl.cast,
    weather: tl.weather,
    tt: tl.tt,
    finish: {
      finishDs: toDs(tl.finish.finishS),
      arrivals: tl.finish.arrivals.map(([d, riders]) => [d, [...riders]] as const),
    },
  }
}

/**
 * LA INVERSA EXACTA DEL FORMATO 1 (§4.3). Los cuartetos de `groupMeta` pasan a `GroupCatalogEntry`
 * (−1 a null); cada foto clave decodifica su base64 y resta 1 en un `Int16Array` nuevo, y su título
 * es el del último par de `main` con `b ≤ key.b` (el de salida, el 0, si no hay ninguno); los tríos
 * de `moves` acumulan `Δb`, los de `to + 1 = 0` son `out` y los seguidos con el mismo `b` y el mismo
 * `to` se juntan en un `move`; los tríos de `clocks` con el mismo `b` son un `clock`; y todo se ordena
 * por `b` y por el orden de `StateEvent`. Lanza `TimelineFormatError` si las listas no cruzan.
 * Privada: se entra por `decodeTimeline`.
 */
function fromStoredV1(s: z.output<typeof storedTimelineV1Schema>): StageTimeline {
  const riderCount = s.riderIds.length
  const groupCount = s.groupIds.length
  const fail = (what: string): never => {
    throw new TimelineFormatError(`stage_timelines: ${what}`)
  }
  const rider = (r: number, where: string): RiderIx =>
    r < riderCount ? r : fail(`${where}: el corredor ${r} no está entre los ${riderCount}`)
  const group = (g: number, where: string): GroupIx =>
    g < groupCount ? g : fail(`${where}: el grupo ${g} no está entre los ${groupCount}`)
  const block = (b: number, where: string): Block =>
    b < s.blocks ? b : fail(`${where}: el bloque ${b} pasa de los ${s.blocks}`)

  if (s.groupMeta.length !== 4 * groupCount)
    fail(`groupMeta: ${s.groupMeta.length} números para ${groupCount} grupos`)
  const groups = s.groupIds.map((id, i): GroupCatalogEntry => {
    const [origin, bornB, diedB, successor] = s.groupMeta.slice(4 * i, 4 * i + 4) as [
      number,
      number,
      number,
      number,
    ]
    const o = ORIGIN_OF_CODE[origin] ?? fail(`groupMeta: el origen ${origin} del grupo ${id}`)
    if (bornB < 0 || (diedB >= 0 && diedB < bornB))
      fail(`groupMeta: el grupo ${id} vive del bloque ${bornB} al ${diedB}`)
    return {
      id,
      origin: o,
      bornB: block(bornB, `grupo ${id}`),
      diedB: diedB < 0 ? null : block(diedB, `grupo ${id}`),
      successor: successor < 0 ? null : group(successor, `sucesor de ${id}`),
    }
  })

  // Los sucesos de estado, por corrientes, cada una por bloque; se juntan al final.
  const outsAndMoves: StateEvent[] = []
  let b = 0
  for (let i = 0; i < s.moves.length; i += 3) {
    b = block(b + s.moves[i]!, 'moves')
    const r = rider(s.moves[i + 1]!, 'moves')
    const to = s.moves[i + 2]!
    if (to === 0) {
      outsAndMoves.push({ t: 'out', b, rider: r })
      continue
    }
    const g = group(to - 1, 'moves')
    const last = outsAndMoves[outsAndMoves.length - 1]
    if (last !== undefined && last.t === 'move' && last.b === b && last.to === g)
      outsAndMoves[outsAndMoves.length - 1] = { ...last, riders: [...last.riders, r] }
    else outsAndMoves.push({ t: 'move', b, to: g, riders: [r] })
  }
  const mains: StateEvent[] = []
  for (let i = 0; i < s.main.length; i += 2) {
    const g = s.main[i + 1]!
    mains.push({
      t: 'main',
      b: block(s.main[i]!, 'main'),
      group: g === 0 ? null : group(g - 1, 'main'),
    })
  }
  const clocks: StateEvent[] = []
  for (let i = 0; i < s.clocks.length; i += 3) {
    const at = block(s.clocks[i]!, 'clocks')
    const mark = [group(s.clocks[i + 1]!, 'clocks'), s.clocks[i + 2]!] as const
    const last = clocks[clocks.length - 1]
    if (last !== undefined && last.t === 'clock' && last.b === at)
      clocks[clocks.length - 1] = { ...last, marks: [...last.marks, mark] }
    else clocks.push({ t: 'clock', b: at, marks: [mark] })
  }
  const mishaps = s.mishaps.map(([at, r, kind, lostDs]): StateEvent => ({
    t: 'mishap',
    b: block(at, 'mishaps'),
    rider: rider(r, 'mishaps'),
    kind,
    lostDs,
  }))
  const streams = [outsAndMoves, mains, clocks, mishaps]
  for (const list of streams)
    for (let i = 1; i < list.length; i++)
      if (list[i]!.b < list[i - 1]!.b)
        fail(`${list[i]!.t}: el bloque ${list[i]!.b} va tras el ${list[i - 1]!.b}`)
  // Por bloque y por el orden de StateEvent; dentro de una corriente, el de lo guardado.
  const stateEvents = streams
    .flat()
    .map((e, i) => ({ e, i }))
    .sort((x, y) => x.e.b - y.e.b || STATE_ORDER[x.e.t] - STATE_ORDER[y.e.t] || x.i - y.i)
    .map(({ e }) => e)

  let lastKeyB = -1
  const keys = s.keys.map(([at, text]): KeyPhoto => {
    if (at <= lastKeyB) fail(`keys: la foto clave del bloque ${at} va tras la del ${lastKeyB}`)
    lastKeyB = block(at, 'keys')
    const bytes = base64ToBytes(text)
    if (bytes.length !== riderCount)
      fail(`keys: la foto clave del bloque ${at} trae ${bytes.length} corredores de ${riderCount}`)
    const groupOf = new Int16Array(riderCount)
    bytes.forEach((x, r) => (groupOf[r] = x === 0 ? -1 : group(x - 1, `foto clave ${at}`)))
    let title: GroupIx | null = 0
    for (let i = 0; i < s.main.length && s.main[i]! <= at; i += 2) {
      const g = s.main[i + 1]!
      title = g === 0 ? null : g - 1
    }
    return { b: at, groupOf, main: title }
  })

  const events = s.events.map(
    ([source, plantilla, km10, tDs, bEmit, revealDs, riders, datos]): TimelineEvent => ({
      source,
      plantilla,
      km: fromKm10(km10),
      tS: fromDs(tDs),
      bEmit: bEmit <= s.blocks ? bEmit : fail(`events: el bloque de emisión ${bEmit}`),
      revealS: fromDs(revealDs),
      riders: riders.map((r) => rider(r, `suceso ${plantilla}`)),
      datos,
    }),
  )

  const detail = new Map<Block, GroupDetail[]>()
  let lastDetailB = -1
  for (const [at, g, speed, pullingTotal, pullers, kind, lostDs] of s.detail) {
    let rows = detail.get(at)
    if (rows === undefined) {
      if (at <= lastDetailB) fail(`detail: el bloque ${at} va tras el ${lastDetailB}`)
      lastDetailB = block(at, 'detail')
      detail.set(at, (rows = []))
    }
    rows.push({
      g: group(g, `detalle del bloque ${at}`),
      speedKmh: speed < 0 ? null : speed / 10,
      pullingTotal,
      pullers: pullers.map(([r, motive, forRider]) => ({
        rider: rider(r, `detalle del bloque ${at}`),
        motive,
        forRider: forRider < 0 ? null : rider(forRider, `detalle del bloque ${at}`),
      })),
      mishap: kind === null ? null : { kind, lostS: fromDs(lostDs) },
    })
  }

  const banners = s.banners.map(([code, km10, cat, name, revealDs, order]): BannerResult => {
    const pairs: { rider: RiderIx; points: number }[] = []
    for (let i = 0; i < order.length; i += 2)
      pairs.push({ rider: rider(order[i]!, 'pancarta'), points: order[i + 1]! })
    return {
      kind: BANNER_OF_CODE[code]!,
      km: fromKm10(km10),
      cat,
      name,
      revealS: fromDs(revealDs),
      order: pairs,
    }
  })

  return {
    format: s.format,
    engineVersion: s.engineVersion,
    dx: s.dx,
    blocks: s.blocks,
    lengthKm: s.lengthKm,
    timeTrial: s.timeTrial,
    clock: 'exact',
    riderIds: s.riderIds,
    groups,
    keys,
    stateEvents,
    events,
    detail,
    banners,
    profile: s.profile,
    cast: s.cast,
    weather: s.weather,
    tt: s.tt,
    finish: {
      finishS: fromDs(s.finish.finishDs),
      arrivals: s.finish.arrivals.map(([d, riders]) => [
        d,
        riders.map((r) => rider(r, 'llegadas')),
      ]),
    },
  }
}

/**
 * EL DESPACHO POR VERSIÓN (H-13): valida con Zod, porque el cuerpo llega de la base, y convierte. Un
 * `format` que no se sabe leer lanza `TimelineFormatError` sin intentarlo; una forma que no es la del
 * formato lanza el error de Zod, y unas listas que no cruzan, `TimelineFormatError`. Un formato 2, el
 * día que haga falta, es un `case 2` con su `fromStoredV2`: las filas del 1 se siguen leyendo con el suyo.
 */
export function decodeTimeline(s: unknown): StageTimeline {
  const format = typeof s === 'object' && s !== null && 'format' in s ? s.format : undefined
  if (format === 1) return fromStoredV1(storedTimelineV1Schema.parse(s))
  throw new TimelineFormatError(`stage_timelines: formato ${String(format)} desconocido`)
}
