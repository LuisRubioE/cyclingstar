/**
 * EL FORMATO GUARDADO DE LA LÍNEA TEMPORAL (E2, docs/retransmision.md §4.3; D-10, I-17).
 *
 * `stage_timelines.body` guarda el gzip 9 del JSON de `StoredTimelineV1`: listas planas de enteros y
 * cadenas, relojes en Ds y km en décimas, la pertenencia de cada foto clave en base64 y los códigos
 * (`PullMotive`, `MishapKind`, `plantilla`) como cadena, nunca como índice de un enum.
 *
 * En el PR 3a este fichero nace solo con lo que la red ya necesita (decisión 17-z): el tipo
 * `StoredTimelineV1` (de él sale `TimelineEventWire`, §4.11), los dos códigos numéricos, `SchemaMatches`
 * y los seis esquemas que el formato comparte con la red (4-x), que `wire.ts` importa de aquí.
 * `encodeTimeline`, `decodeTimeline`, `storedTimelineV1Schema`, `STORED_MATCH` y `TimelineFormatError`
 * llegan en el 4b, con el formato 1 cerrado (17-a).
 *
 * Es del lado del grabador (15-b): no importa `./constants.js` ni ningún índice que lo reexporte. Por
 * eso los esquemas compartidos viven aquí y no en `wire.ts`, que carga `BROADCAST`.
 */
import { z } from 'zod'
import { jerseyKindSchema, type PullMotive } from '../contracts.js'
import type { ChampionTitle, Distinction, WornJersey } from '../jerseys.js'
import type {
  BannerResult,
  Block,
  Ds,
  GroupIx,
  GroupOrigin,
  MishapKind,
  ProfileStrip,
  RiderIx,
  StageRef,
  StageWeather,
  TimelineCast,
  TimeTrialTrace,
} from './timeline.js'

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
 * lados. Se usa como constante que solo lee el compilador (`WIRE_MATCH`, y `STORED_MATCH` en el 4b).
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
