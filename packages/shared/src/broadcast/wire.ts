/**
 * LA RED DE LA RETRANSMISIÓN (E2, docs/retransmision.md §4.11 y §14.2; D-06, D-50, D-51).
 *
 * Lo que viaja entre la API y la web: la cabecera (`BroadcastHead`), el tramo (`BroadcastChunk`), el
 * paquete de meta (`BroadcastFinish`) y el acta (`StageReport`), con sus esquemas, más las entradas de
 * las rutas nuevas. Los tipos se escriben a mano, con `readonly`, y cada esquema se ata a su tipo en
 * los dos sentidos: con `satisfies z.ZodType<T>` y con `WIRE_MATCH` (`SchemaMatches`, 4-j y 4-x). Se
 * aparta a sabiendas de la cabecera de `contracts.ts`, que manda derivar los tipos con `z.infer`.
 *
 * Nace en el PR 3a con lo que piden la cabecera, el tramo, la meta y el acta. El 7a añade
 * `HorizonSummary` y su esquema, y las entradas y las respuestas de `/api/me` (§17.20).
 *
 * El orden de carga (14-a): `contracts.ts` no importa nada de aquí, ni por reexportación; los cuatro
 * esquemas de E2 que sus ampliaciones necesitan (`stageGateSchema`, `preStageInfoSchema`,
 * `watchStateSchema` y `switchModeSchema`) se declaran allí, y sus tipos siguen aquí. La reexportación
 * de este fichero va en el índice del paquete detrás de `contracts.js`.
 */
import { z } from 'zod'
import {
  apiErrorBodySchema,
  chronicleEntrySchema,
  genderSchema,
  jerseyKindSchema,
  newsItemSchema,
  preStageInfoSchema,
  stageGateSchema,
  stageKindSchema,
  stageReplaySchema,
  stageResultEntrySchema,
} from '../contracts.js'
import type {
  NewsItem,
  PullMotive,
  StageKind,
  StageReplay,
  StageResultEntry,
} from '../contracts.js'
import type { JerseyKind, RiderCard } from '../jerseys.js'
import {
  type SchemaMatches,
  type StoredTimelineV1,
  distinctionSchema,
  profileStripSchema,
  stageWeatherSchema,
  wornJerseySchema,
} from './codec.js'
import { BROADCAST } from './constants.js'
import type { LiveLine } from './cues.js'
import type {
  Block,
  Ds,
  GroupIx,
  GroupOrigin,
  MishapKind,
  PaceZone,
  ProfileStrip,
  RiderIx,
  StageWeather,
} from './timeline.js'

// ----------------------------------------------------------------- los tipos que viajan (§4.10, §4.11)

/** BROADCAST_WATCH y SPOILER_MODE (§14.6), publicados en /health.features. */
export type SwitchMode = 'off' | 'admins' | 'on'
/** Por qué una carrera está en guardia (D-30). */
export type GuardReason = 'own_rider' | 'own_team' | 'follow' | 'headline'
/** users.spoiler_scope (0048); por defecto 'guarded' (DD-01). */
export type SpoilerScope = 'guarded' | 'own_only' | 'off'
/** La puerta que sale en lugar de un resultado velado (D-37). */
export type StageGate =
  /** esta etapa no la conoce */
  | { readonly k: 'not_seen' }
  /** la N+1 con la N (o antes) sin conocer: firstUnseen es la primera */
  | { readonly k: 'previous_unseen'; readonly firstUnseen: number }

/** La salida, tras la N−1, degradada por el velo como el reparto (B13). */
export interface StartState {
  /** quién LLEVA cada maillot; todo null el primer día */
  readonly leaders: {
    readonly gc: RiderIx | null
    readonly points: RiderIx | null
    readonly kom: RiderIx | null
  }
  /** los BROADCAST.virtualGcTop primeros de salida */
  readonly gcTop: readonly {
    readonly rider: RiderIx
    readonly rank: number
    readonly gapS: number
  }[]
  readonly racingAtStart: number
}

/** GET …/broadcast: recorrido, reparto y salida; nada de la carrera. */
export interface BroadcastHead {
  /**
   * label: la del recorrido (stageHistory.ts, calendarStageSpec). km va redondeado, para la ficha.
   * lengthKm, dx y blocks son los de la línea (`StageTimeline`), sin redondear: no estaban en §4.11 y
   * sin ellos la web no rehace la `TimelineCore` de los tramos (`instantAt` lee los km a meta y el
   * tope de la extrapolación, `photoBlocksOf(lengthKm, dx)` da el calendario de fotos y `headAtLine`
   * pide `blocks` y `dx`; paso 3c). Son del recorrido: no dicen nada de la carrera.
   */
  readonly stage: {
    readonly raceKey: string
    readonly raceId: string
    readonly day: number
    readonly name: string
    readonly km: number
    readonly kind: StageKind
    readonly timeTrial: boolean
    readonly label: string
    /** stageLengthKm(profile), sin redondear */
    readonly lengthKm: number
    /** STAGE.dx con que se corrió, 0,1 */
    readonly dx: number
    /** Math.round(lengthKm / dx) */
    readonly blocks: number
  }
  readonly profile: ProfileStrip
  readonly weather: StageWeather
  /** por RiderIx */
  readonly cast: readonly RiderCard[]
  readonly startState: StartState
  readonly pace: readonly PaceZone[]
  /** playbackEstimateS: velocidades nominales, nunca las de la carrera (D-19) */
  readonly estimateS: number
  readonly clock: 'exact' | 'estimated'
  /** línea grabada o adaptador de la radio (D-07) */
  readonly source: 'timeline' | 'radio'
  readonly preview: StagePreview
  /** null para el visitante */
  readonly view: { readonly reachedS: number | null; readonly known: boolean } | null
  readonly gate: StageGate | null
  /** la preparación PÚBLICA de la crono (9-i): sin un solo reloj; null en línea y con el adaptador */
  readonly tt: {
    readonly order: 'gc' | 'bib'
    readonly intervalS: number
    readonly checksKm: readonly number[]
  } | null
  /** stage_timelines.tpl_rev: el TEMPLATE_REV del tick que la corrió (12-c); 0 con el adaptador */
  readonly tplRev: number
}

/** La misma tupla que se guarda (I-17). */
export type TimelineEventWire = StoredTimelineV1['events'][number]

/**
 * GET …/broadcast/chunk: los datos con visibilidad en (fromDs, toDs], planos (§4.6); el primero,
 * con fromDs 0, en [0, toDs], para que viaje lo que se ve en 0 Ds (paso 3c, `chunkOf` en cut.ts).
 */
export interface BroadcastChunk {
  readonly fromDs: Ds
  readonly toDs: Ds
  /** los nacidos en el tramo, por GroupIx (su `bornB` es el bloque de su primera marca, que viaja en el mismo tramo) */
  readonly groupsBorn: readonly (readonly [GroupIx, string, GroupOrigin])[]
  /**
   * las muertes que se ven en el tramo (§4.6: con la marca de `diedB`): [GroupIx, diedB, sucesor o −1].
   * No estaba en §4.11 y sin ella la web no puede rehacer `cutTimeline` con los tramos: un grupo
   * muerto seguiría vivo en su línea, sin gente, y la tendencia no seguiría la cadena del sucesor.
   */
  readonly groupsDied: readonly (readonly [GroupIx, Block, number])[]
  /** tríos [b, rider, to + 1], b absoluto; to + 1 = 0 es out */
  readonly moves: readonly number[]
  /** pares [b, group + 1] */
  readonly main: readonly number[]
  /** tríos [b, g, Ds] */
  readonly clocks: readonly number[]
  /** cuartetos [b, rider, MISHAP_CODE, lostDs] */
  readonly mishaps: readonly number[]
  /** registros [b, g, velocidad·10 o −1, pullingTotal, MISHAP_CODE o 0, lostDs, n, (rider, PULL_MOTIVE_CODE o 0, forRider o −1) × n] */
  readonly details: readonly number[]
  readonly events: readonly TimelineEventWire[]
  /** la voz del tramo, construida por la ruta (§12.2, §14.3) */
  readonly lines: readonly LiveLine[]
  /** registros [BANNER_CODE, km·10, revealDs, n, (rider, points) × n]; cat y name, de profile.climbs (4-n) */
  readonly banners: readonly number[]
  /** crono: pares [rider, startDs]; tríos [rider, km, kmClockDs] y [rider, control, checkClockDs]; null en línea */
  readonly tt: {
    readonly starts: readonly number[]
    readonly km: readonly number[]
    readonly checks: readonly number[]
  } | null
  /** el tramo llega al borde de la meta: lo siguiente es POST …/finish */
  readonly atFinish: boolean
}

/** POST …/broadcast/finish: el paquete de meta (D-06, I-15). */
export interface BroadcastFinish {
  /** FinishRecord.arrivals en huecos al primero */
  readonly arrivals: readonly { readonly gapS: number; readonly riders: readonly RiderIx[] }[]
  /** con DNF y motivo, como hoy */
  readonly result: readonly StageResultEntry[]
  readonly closing: StageClosing
  readonly report: StageReport
  /** las de esta etapa */
  readonly news: readonly NewsItem[]
  /** los que se cayeron dentro de STAGE.truce.threeKmRuleKm y llegan con el tiempo de su grupo (6-o) */
  readonly threeKmRule: readonly RiderIx[]
}

/** El acta: el stageReplaySchema de hoy, con watch (7b) y tplRev (12-c). */
export type StageReport = StageReplay

/** La previa: cuatro cuadros de BROADCAST.previewCardS s (D-22, I-22). */
export interface StagePreview {
  readonly route: ProfileStrip
  readonly weather: StageWeather
  readonly jerseysInPlay: readonly {
    readonly jersey: JerseyKind
    readonly holder: RiderIx
    readonly threats: readonly RiderIx[]
  }[]
  readonly favourites: readonly {
    readonly rider: RiderIx
    readonly why: 'gc' | 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles'
  }[]
}

/** El cierre (D-22, I-22). */
export interface StageClosing {
  readonly podium: readonly RiderIx[]
  /** move: puestos ganados (+) o perdidos */
  readonly gcAfter: readonly {
    readonly rider: RiderIx
    readonly rank: number
    readonly gapS: number
    readonly move: number
  }[]
  readonly jerseysTomorrow: readonly {
    readonly jersey: JerseyKind
    readonly rider: RiderIx
    readonly changed: boolean
  }[]
  /** el mayor kmEnFuga, un hecho (DD-14) */
  readonly mostKmOutFront: { readonly rider: RiderIx; readonly km: number } | null
  readonly outOfRace: readonly {
    readonly rider: RiderIx
    readonly reason: 'abandon' | 'time_cut'
  }[]
  readonly tomorrow: PreStageInfo | null
}

/** Lo ÚNICO que un título, un aviso o una miniatura saben de una etapa: por tipo no cabe un resultado (D-42, I-27). */
export interface PreStageInfo {
  readonly raceName: string
  readonly season: number
  readonly stageDay: number
  readonly stageCount: number
  readonly km: number
  readonly label: string
  readonly stageKind: StageKind
}

/** StageReplay.watch (D-50; llega en el 7b). seen: true con W, S o R; false con A (6-r). */
export interface WatchState {
  readonly known: boolean
  readonly reachedS: number | null
  readonly gate: StageGate | null
  readonly seen: boolean
}

/**
 * `GET /api/me/horizon` (§4.11, §10.5, §11.4; nace en el 7a): lo que el espectador tiene por ver, que es
 * lo único que la portada pinta de las carreras en guardia. Solo lleva el horizonte del propio
 * espectador; con `cs_viewer` y sin sesión, solo `rev` y `scope`, con las listas vacías (14-i).
 */
export interface HorizonSummary {
  /** el de `Horizon.rev`: `${currentDay}.${horizon_rev}`, `'world'` con SPOILER_MODE apagado para él (10-h) */
  readonly rev: string
  readonly scope: SpoilerScope
  /** una por carrera en guardia con etapas en el velo, la más antigua primero */
  readonly ready: readonly {
    readonly raceKey: string
    readonly raceName: string
    /** las etapas veladas, en orden */
    readonly stages: readonly number[]
    readonly reason: GuardReason
    /** el día de juego en que se levanta su velo: su última etapa más SPOILER.expiryGameDays (§10.5) */
    readonly expiresOnDay: number
  }[]
  /** las etapas a medias (`Continue watching`) */
  readonly watching: readonly {
    readonly raceKey: string
    readonly stageDay: number
    readonly reachedS: number
    /** lo que le queda a la cabeza en lo alcanzado */
    readonly toGoKm: number
  }[]
  /** las carreras en guardia que caducaron sin conocerse enteras: la web las acusa (10-f) */
  readonly expiredSinceLastVisit: readonly string[]
  /**
   * `users.reveal_confirm` (DD-17; 9a): si `Show result` pregunta antes. Solo con sesión, que es quien
   * puede revelar; sin él, la web pregunta. Lo pone a `false` `Don't ask again`
   * (`PUT /api/me/spoiler-scope`), y así no vuelve a preguntar en ningún dispositivo.
   */
  readonly revealConfirm?: boolean | undefined
}

// ------------------------------------------------------- los códigos numéricos de los tramos (4-m)

/** Tablas explícitas que solo crecen, atadas a su unión. 0 significa que no hay dato. */
export const MISHAP_CODE = { caida: 1, pinchazo: 2, averia: 3 } as const satisfies Record<
  MishapKind,
  number
>
export const PULL_MOTIVE_CODE = {
  solo: 1,
  abanico: 2,
  tren: 3,
  fuga: 4,
  persecucion: 5,
  grupeto: 6,
  equipo_etapa: 7,
  equipo_maillot: 8,
  equipo_general: 9,
  rol: 10,
  propio: 11,
  equipo_puntos: 12,
  equipo_montana: 13,
  infiltrado: 14,
  colocando: 15,
} as const satisfies Record<PullMotive, number>
// BANNER_CODE (0 volante, 1 cima) es el del formato guardado (codec.ts). Un código que la web no
// conozca se lee como null.

// -------------------------------------------------------------------- los esquemas de las respuestas

const int = z.number().int()
const ints = z.array(int)
const ix = int.min(0)

const riderCardSchema = z.object({
  ix,
  id: z.string(),
  name: z.string(),
  bib: int.nullable(),
  country: z.string().length(2),
  gender: genderSchema,
  team: z.object({ id: z.string(), name: z.string(), jerseySeed: z.string() }).nullable(),
  worn: wornJerseySchema,
  lines: z.array(distinctionSchema).max(BROADCAST.cardLinesMax),
  notoriety: z.literal([0, 1, 2, 3, 4, 5, 6, 7, 8]),
  own: z.boolean(),
}) satisfies z.ZodType<RiderCard>
const startStateSchema = z.object({
  leaders: z.object({ gc: ix.nullable(), points: ix.nullable(), kom: ix.nullable() }),
  gcTop: z.array(z.object({ rider: ix, rank: int.min(1), gapS: z.number() })),
  racingAtStart: int,
}) satisfies z.ZodType<StartState>
const stagePreviewSchema = z.object({
  route: profileStripSchema,
  weather: stageWeatherSchema,
  jerseysInPlay: z.array(z.object({ jersey: jerseyKindSchema, holder: ix, threats: z.array(ix) })),
  favourites: z.array(
    z.object({ rider: ix, why: z.enum(['gc', 'sprint', 'hills', 'climb', 'tt', 'cobbles']) }),
  ),
}) satisfies z.ZodType<StagePreview>
const stageClosingSchema = z.object({
  podium: z.array(ix),
  gcAfter: z.array(z.object({ rider: ix, rank: int.min(1), gapS: z.number(), move: int })),
  jerseysTomorrow: z.array(z.object({ jersey: jerseyKindSchema, rider: ix, changed: z.boolean() })),
  mostKmOutFront: z.object({ rider: ix, km: z.number() }).nullable(),
  outOfRace: z.array(z.object({ rider: ix, reason: z.enum(['abandon', 'time_cut']) })),
  tomorrow: preStageInfoSchema.nullable(),
}) satisfies z.ZodType<StageClosing>
const liveLineSchema = chronicleEntrySchema.extend({
  revealS: z.number(),
}) satisfies z.ZodType<LiveLine>
const timelineEventWireSchema = z.tuple([
  int,
  z.string(),
  int,
  int,
  int,
  int,
  z.array(ix),
  z.record(z.string(), z.union([z.number(), z.string()])).nullable(),
]) satisfies z.ZodType<TimelineEventWire>

export const broadcastHeadSchema = z.object({
  stage: z.object({
    raceKey: z.string(),
    raceId: z.string(),
    day: int.min(1),
    name: z.string(),
    km: z.number(),
    kind: stageKindSchema,
    timeTrial: z.boolean(),
    label: z.string(),
    lengthKm: z.number().positive(),
    dx: z.number().positive(),
    blocks: int.min(1),
  }),
  profile: profileStripSchema,
  weather: stageWeatherSchema,
  cast: z.array(riderCardSchema),
  startState: startStateSchema,
  pace: z.array(z.object({ aboveKm: z.number(), x: z.number().positive() })).min(1),
  estimateS: z.number().min(0),
  clock: z.enum(['exact', 'estimated']),
  source: z.enum(['timeline', 'radio']),
  preview: stagePreviewSchema,
  view: z.object({ reachedS: z.number().nullable(), known: z.boolean() }).nullable(),
  gate: stageGateSchema.nullable(),
  tt: z
    .object({ order: z.enum(['gc', 'bib']), intervalS: int.min(1), checksKm: z.array(z.number()) })
    .nullable(),
  tplRev: int.min(0),
}) satisfies z.ZodType<BroadcastHead>
export const broadcastChunkSchema = z.object({
  fromDs: int,
  toDs: int,
  groupsBorn: z.array(z.tuple([ix, z.string(), z.enum(['start', 'attack', 'shed'])])),
  groupsDied: z.array(z.tuple([ix, ix, int.min(-1)])),
  moves: ints,
  main: ints,
  clocks: ints,
  mishaps: ints,
  details: ints,
  events: z.array(timelineEventWireSchema),
  lines: z.array(liveLineSchema),
  banners: ints,
  tt: z.object({ starts: ints, km: ints, checks: ints }).nullable(),
  atFinish: z.boolean(),
}) satisfies z.ZodType<BroadcastChunk>
export const broadcastFinishSchema = z.object({
  arrivals: z.array(z.object({ gapS: z.number().min(0), riders: z.array(ix) })),
  result: z.array(stageResultEntrySchema),
  closing: stageClosingSchema,
  report: stageReplaySchema,
  news: z.array(newsItemSchema),
  threeKmRule: z.array(ix),
}) satisfies z.ZodType<BroadcastFinish>
// El acta (`GET …/report`) se valida con `stageReplaySchema` de contracts.ts: `StageReport` es `StageReplay`.
export const horizonSummarySchema = z.object({
  rev: z.string(),
  scope: z.enum(['guarded', 'own_only', 'off']),
  expiredSinceLastVisit: z.array(z.string()),
  ready: z.array(
    z.object({
      raceKey: z.string(),
      raceName: z.string(),
      stages: z.array(int.min(1)),
      reason: z.enum(['own_rider', 'own_team', 'follow', 'headline']),
      expiresOnDay: int,
    }),
  ),
  watching: z.array(
    z.object({
      raceKey: z.string(),
      stageDay: int.min(1),
      reachedS: z.number().min(0),
      toGoKm: z.number().min(0),
    }),
  ),
  revealConfirm: z.boolean().optional(),
}) satisfies z.ZodType<HorizonSummary>

/** El otro sentido del atado (4-x): cada respuesta nueva, con su tipo, en todos los niveles. Solo lo lee el compilador. */
export const WIRE_MATCH = {
  head: true,
  chunk: true,
  finish: true,
  horizon: true,
} as const satisfies {
  head: SchemaMatches<typeof broadcastHeadSchema, BroadcastHead>
  chunk: SchemaMatches<typeof broadcastChunkSchema, BroadcastChunk>
  finish: SchemaMatches<typeof broadcastFinishSchema, BroadcastFinish>
  horizon: SchemaMatches<typeof horizonSummarySchema, HorizonSummary>
}

// ---------------------------------------------------------- las entradas de las rutas nuevas (§14.2)

/** Cómo llegó el espectador a su punto (§8.1, §8.5). Tipo a mano y esquema atado (4-j). */
export type WatchMode = 'play' | 'seek' | 'summary' | 'digest'
export const watchModeSchema = z.enum([
  'play',
  'seek',
  'summary',
  'digest',
]) satisfies z.ZodType<WatchMode>

/** `?season=` de las rutas de etapa: la de hoy si falta. `?diag=1`, solo administradores (D-40). */
export const stageQuerySchema = z.object({
  season: z.coerce.number().int().min(0).max(9999).optional(),
  diag: z.literal('1').optional(),
})
/** Un tramo (fromDs, toDs] de como mucho BROADCAST.chunkRaceS de carrera (§14.3); [0, toDs] el primero. */
export const chunkQuerySchema = stageQuerySchema
  .extend({
    fromDs: z.coerce.number().int().min(0),
    toDs: z.coerce.number().int().min(1),
  })
  .refine((q) => q.toDs > q.fromDs && q.toDs - q.fromDs <= BROADCAST.chunkRaceS * 10, {
    message: 'tramo',
  })
/** El cuerpo de `POST …/broadcast/finish`: con qué modo se llegó a la meta (la letra, §10.3). */
export const finishBodySchema = z.object({ mode: watchModeSchema })
/** 403 con la puerta: el error de siempre más `gate`. */
export const stageGateErrorSchema = apiErrorBodySchema.extend({ gate: stageGateSchema })

// ------------------------------------------------------- las entradas y respuestas de /api/me (7a)

/**
 * `POST /api/me/watch/:raceKey/:day`: lo alcanzado, en segundos de carrera (la web lo manda en
 * décimas, hacia abajo), hasta un día (una crono dura como mucho 23.724 s, mapa 01 §5). Llega en
 * `application/json` o, de respaldo para `sendBeacon`, el mismo JSON en `text/plain` (14-g).
 */
export const watchProgressBodySchema = z.object({
  reachedS: z.number().finite().min(0).max(86_400),
  mode: watchModeSchema,
})
/** `POST /api/me/reveal/:raceKey/:day`: sin nada (con la carrera caducada, la ruta lo sabe sola, §10.5). */
export const revealBodySchema = z.object({}).strict()
/** `PUT /api/me/follow/:raceKey`: `Follow without spoilers`, `Stop protecting this race` o la regla (D-30). */
export const followBodySchema = z.object({ follow: z.enum(['follow', 'drop', 'default']) })
/** `PUT /api/me/spoiler-scope`: el alcance (D-30, DD-01) y, si viene, `Don't ask again` (DD-17). */
export const spoilerScopeBodySchema = z.object({
  scope: z.enum(['guarded', 'own_only', 'off']),
  revealConfirm: z.boolean().optional(),
})
/** La respuesta del progreso: si la etapa sigue a medias o ya es conocida, y el `rev` de después (§14.2). */
export const watchResponseSchema = z.object({
  status: z.enum(['watching', 'known']),
  rev: z.string(),
})
/** La respuesta de las otras escrituras de `/api/me`: el `rev` de después, para cambiar las claves de una vez (§10.9). */
export const revResponseSchema = z.object({ rev: z.string() })
