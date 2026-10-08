/**
 * EL REPRODUCTOR DE `Watch` (E2, docs/retransmision.md §8.11; D-06, D-19, D-20, D-55, D-57; 8-d, 8-q,
 * 14-q). Puro: sin React, sin fetch, sin Date.now.
 *
 * Un reductor: recibe una acción (un fotograma, un mando, la respuesta de una petición) y devuelve el
 * estado siguiente y las peticiones que hay que hacer (`PlayerEffect`). `StageWatch.tsx` (3c) le da los
 * fotogramas con `requestAnimationFrame`, calcula el instante que pintan todos los componentes y
 * ejecuta los efectos EN ORDEN, cada uno tras la respuesta del anterior: un tramo que sigue a un
 * informe no sale hasta que el informe ha respondido, porque el servidor autoriza el tramo con lo
 * último informado (§10.11). Así se prueba entero sin navegador (`player.test.ts`, §8.12), y se ve de
 * un vistazo que la hora no lee los sucesos: la única acción que los mira es `cueAdmitted`, y solo
 * apaga `Next action` (B9).
 *
 * Nace en el 3b con el reloj, la red, la previa, la llegada y el cierre de `Watch` y `Highlights`. Los
 * saltos (`seek`, `back`, `landed`), `Show result` y el digest (con `release` y `loaded`) llegan en el
 * 10a (§8.5, §8.8, 8-c, 8-i, 8-j, 8-n, 8-o, 18-e). La cola de rótulos llega en el 6a (`CueDeck`, al
 * final): un estado aparte del reloj, que el hook avanza en cada fotograma con el instante que pinta y
 * que le da al reductor solo lo que admite (`cueAdmitted`). Los efectos de informe (`report`) se
 * ejecutan desde el 7a, que trae `POST /api/me/watch` (§17.6).
 *
 * Lo que se aparta de §8.11, cada cosa con su motivo:
 * - `PlayerState.sinceReportS`: los informes de cada `progressEveryRealS` de pared (§8.5) necesitan
 *   saber cuánto hace del último, y el reductor no lee el reloj de pared.
 * - `PlayerAction` `beyond`: la respuesta 409 `beyond_reached` de un tramo, que el reproductor resuelve
 *   informando de lo alcanzado y pidiendo otra vez (§14.11). Tras un reinicio de `web` la memoria del
 *   proceso se vacía y el servidor puede saber menos de lo que el reproductor le informó (riesgo 19).
 * - La línea: además de la cabeza pintada en su último bloque (`atLine`), el reloj parado en el borde
 *   de la meta con el último tramo dentro. Si la cabeza no frena en el último km, su extrapolación
 *   (§4.5) alcanza el último bloque en la meta o después, nunca antes del borde, y el reloj se quedaría
 *   esperando para siempre: pasa en tres de las cinco congeladas en línea (la e7, la e20 y Colombia e5).
 * - Un 429 (`throttled`) no para el reloj por sí mismo: la petición sigue en vuelo y el reloj sigue con
 *   lo servido; si lo alcanza, espera con `Loading`, como con cualquier tramo en vuelo. §8.11 decía
 *   «deja la fase en waiting», que con 450 s de carrera servidos por delante pararía la imagen sin
 *   motivo durante todo el `retry-after`. Nunca `Connection lost` (14-q).
 * - Al volver a una etapa a medias, `t` (lo alcanzado menos resumeBackS) pasa de lo servido mientras
 *   llegan los tramos desde 0 bajo `Previously`: la comprobación 1 (t ≤ servedS) vale en cuanto el reloj
 *   puede correr, porque no sale del resumen a `playing` sin carrera servida por delante.
 * - Las peticiones van en décimas enteras y lo informado, hacia abajo: un tramo nunca pide una décima
 *   más de lo que el servidor admite. Y los tramos salen de 450 a 900 s de carrera, no de 900: es lo que
 *   deja pedir la regla de 8-d (informar de lo pintado cuando quedan menos de chunkRaceS / 2), y son
 *   del orden del doble de los 16 a 32 por etapa que estimaba §8.5.
 *
 * Y lo que se aparta en el 10a:
 * - `PlayerState.seekS` y la acción `seekTime`: los saltos de reloj de la crono (`−10 min`, `+10 min`,
 *   `Last 20 starters`, `Last starter`; 9-g) van a una hora y no a un km, y el salto se acaba cuando lo
 *   servido la pasa, no cuando la cabeza llega a un km. Como los de recorrido, nunca cruzan la meta.
 * - Un salto que empieza con un tramo en vuelo espera a su respuesta y sigue desde ella: la cola de
 *   peticiones es una sola (§8.11). El informe de cada vuelta del salto es lo servido (8-j), en décimas
 *   hacia abajo; el aterrizaje no pasa del borde de la meta.
 * - `PlayerState.lastKm`: la cabeza en el último km en el último fotograma (`toGoKm ≤ 1`): `Next action`
 *   se apaga y no se enciende (8-o). §8.11 lo decía del rótulo `last_km`, que también lo apaga; tras un
 *   salto la cola se rehace en el aterrizaje y ese rótulo puede no salir.
 * - `PlayerState.revealed`: `Show result` aceptado. Pide la revelación y la meta (`reveal` y `finish`,
 *   §8.5); con el modo de la curva, que el servidor no escribe porque la etapa ya es conocida
 *   (`recordProgress`, «una etapa ya conocida no registra nada»). La llegada se salta los grupos que
 *   llegan (§8.7) y, en el digest, no encadena: tras `Show results` viene el cierre.
 * - `playerInit` recibe, en el digest, la etapa de antes (`previous`): la página encadena navegando a la
 *   siguiente (8-c), y así `loaded` sigue sabiendo cuál soltar (18-e).
 * - Volver atrás en pausa se queda en pausa; desde el resumen o esperando un tramo, sigue la carrera.
 */
import {
  BROADCAST,
  type BroadcastHead,
  type Cue,
  type CueClass,
  type CueKind,
  type CueQueue,
  type Ds,
  EMPTY_CUE_QUEUE,
  type GroupCatalogEntry,
  type GroupIx,
  type Instant,
  type ProfileStrip,
  type RaceS,
  type RiderCard,
  type RiderIx,
  type StartState,
  type TimeCheckRow,
  type TimeTrialInstant,
  type TimelineCore,
  type TimelineEvent,
  type WatchMode,
  admitCue,
  aheadOfPeloton,
  breakPresentedOf,
  breakRoundOf,
  cueClassOf,
  cueFrame,
  cuesBetween,
  fromDs,
  namedCrashesBetween,
  toDs,
} from '@cyclingstar/shared'
import { ApiError } from '../../api/request'

// ----------------------------------------------------------------------------------- los tipos (§8.11)

/** La curva: `pace`, `summaryPace` o `digestPace` (en crono, `ttPaceAt` y la de 8-m). */
export type ViewMode = 'watch' | 'highlights' | 'digest'
export type PlayerPhase =
  'preview' | 'playing' | 'paused' | 'waiting' | 'seeking' | 'recap' | 'arrival' | 'closing'
/** ×½ ×1 ×2 ×4 (pantalla): multiplican el factor de la zona (§8.5). */
export type Speed = (typeof BROADCAST.speeds)[number]

/** El modo con que se entra: `Watch` a ×1 (DD-03, el valor por defecto que aceptó el dueño). */
export const DEFAULT_VIEW: ViewMode = 'watch'

export interface PlayerState {
  readonly phase: PlayerPhase
  readonly view: ViewMode
  /** en el digest, siempre 1 */
  readonly speed: Speed
  /** ×nextActionSpeedup hasta que entra un Cue de clase ≥ nextActionMinClass que no sea de la ronda (6-m) */
  readonly nextAction: boolean
  /** la hora pintada, la del instante de este fotograma */
  readonly t: RaceS
  /** lo alcanzado: máx. de lo pintado y de los destinos de salto; nunca baja (D-57) */
  readonly reachedS: RaceS
  /** lo último informado, en décimas enteras; más prefetchRaceS, el tope de lo que se puede pedir (§10.11) */
  readonly reportedS: RaceS
  /** el toDs del último tramo recibido, en s; el reloj no lo pasa */
  readonly servedS: RaceS
  /** ese tramo llevaba atFinish: lo que sigue es POST …/finish */
  readonly atFinish: boolean
  /** el km destino del salto en curso, ya recortado a lengthKm − 1 (10a) */
  readonly seekKm: number | null
  /** una petición de tramo o de meta en vuelo (con atFinish, la de meta) */
  readonly inFlight: boolean
  /** `Loading`, `Connection lost · Retry` (pantalla) */
  readonly notice: 'loading' | 'offline' | null
  /** s de pared desde el último toque, movimiento o tecla; en playing, con idleS ≥ controlsHideS los mandos se esconden (8-p) */
  readonly idleS: number
  /** s de pared en playing desde el último informe: a progressEveryRealS se informa (§8.5). No estaba en §8.11 */
  readonly sinceReportS: number
  /** la etapa que se reproduce; en el digest cambia al encadenar (8-c) */
  readonly stageDay: number
  /** las etapas con tramos y línea en memoria; en el digest, como mucho dos (18-e) */
  readonly loaded: readonly number[]
  /** la hora destino del salto de reloj en curso de la crono (9-g); null fuera de uno. No estaba en §8.11 */
  readonly seekS: RaceS | null
  /** la cabeza en el último km (toGoKm ≤ 1) en el último fotograma: Next action apagado (8-o). No estaba en §8.11 */
  readonly lastKm: boolean
  /** `Show result` aceptado: la meta se pidió tras revelar (§8.5). No estaba en §8.11 */
  readonly revealed: boolean
}

/**
 * Lo que el reductor no puede saber solo: la curva del modo, la longitud y, en el digest, la etapa
 * siguiente. En carretera, baseX es paceAt(toGoKm, zonas del modo); en crono, ttPaceAt (§9.4).
 * digestNext: la siguiente etapa velada del digest, o null en la última y fuera de él.
 */
export interface PlayerContext {
  readonly baseX: (view: ViewMode, t: RaceS, toGoKm: number) => number
  readonly lengthKm: number
  readonly digestNext: number | null
}

export type PlayerAction =
  /** del instante pintado: los km a meta de la cabeza y si está en su último bloque (`headAtLine`) */
  | { readonly k: 'frame'; readonly dtS: number; readonly toGoKm: number; readonly atLine: boolean }
  | { readonly k: 'play' }
  | { readonly k: 'pause' }
  | { readonly k: 'hidden' }
  | { readonly k: 'leave' }
  | { readonly k: 'retry' }
  /** un toque, el ratón o una tecla: idleS vuelve a 0 y los mandos salen (8-p) */
  | { readonly k: 'touch' }
  | { readonly k: 'speed'; readonly x: Speed }
  | { readonly k: 'view'; readonly view: ViewMode }
  | { readonly k: 'nextAction' }
  /** round: un rider de la ronda de la moto, que no apaga Next action (6-m) */
  | {
      readonly k: 'cueAdmitted'
      readonly cls: CueClass
      readonly kind: CueKind
      readonly round: boolean
    }
  /** headKmAtEnd: el km de la cabeza en servedS (10a) */
  | { readonly k: 'seek'; readonly km: number; readonly headKmAtEnd: number }
  /** un salto de reloj de la crono, a la hora toS (9-g; 10a). No estaba en §8.11 */
  | { readonly k: 'seekTime'; readonly toS: RaceS }
  /** el hook biseca en la línea servida, sin red (10a) */
  | { readonly k: 'back'; readonly toS: RaceS }
  /** la respuesta de un tramo: su toDs en s, si llega al borde de la meta y el km de la cabeza en toS */
  | {
      readonly k: 'chunk'
      readonly toS: RaceS
      readonly atFinish: boolean
      readonly headKmAtEnd: number
    }
  /** fin de un salto: la hora destino y los Cue de clase ≥ 2 saltados (10a) */
  | { readonly k: 'landed'; readonly toS: RaceS; readonly skipped: number }
  /** red caída, un 5xx o cualquier otra respuesta que no sea un 429 ni un 409 `beyond_reached` */
  | { readonly k: 'failed' }
  /** un 409 `beyond_reached` de un tramo: se informa de lo alcanzado y se pide otra vez (§14.11). No estaba en §8.11 */
  | { readonly k: 'beyond' }
  /** BroadcastFinish recibido */
  | { readonly k: 'finished' }
  /** los cuadros de la fase (la previa, el resumen o la llegada) han acabado */
  | { readonly k: 'cardDone' }
  /** `Show result` aceptado (10a) */
  | { readonly k: 'showResult' }
  /** un 429: el hook repite la petición a los retryAfterS de pared; no es failed (14-q) */
  | { readonly k: 'throttled'; readonly retryAfterS: number }

export type PlayerEffect =
  /** POST /api/me/watch (7a); beacon en pagehide y al desmontar, sin cola (effects.ts) */
  | {
      readonly k: 'report'
      readonly reachedS: RaceS
      readonly mode: WatchMode
      readonly beacon: boolean
    }
  /** GET …/broadcast/chunk, de fromS a toS en décimas enteras */
  | { readonly k: 'chunk'; readonly fromS: RaceS; readonly toS: RaceS }
  /** POST …/broadcast/finish con { mode }: es la que escribe la letra (14-f) */
  | { readonly k: 'finish'; readonly mode: WatchMode }
  /** POST /api/me/reveal/:raceKey/:day (10a) */
  | { readonly k: 'reveal' }
  /** soltar los tramos (removeQueries) y la línea decodificada de esa etapa (18-e, 10a) */
  | { readonly k: 'release'; readonly stageDay: number }

/** El modo de cada informe y de la meta, por curva (la letra, §8.1); en un salto, 'seek'. */
export const REPORT_MODE = {
  watch: 'play',
  highlights: 'summary',
  digest: 'digest',
} as const satisfies Record<ViewMode, WatchMode>

/** El estado siguiente y las peticiones, en el orden en que el hook las tiene que hacer. */
export interface PlayerStep {
  readonly next: PlayerState
  readonly effects: readonly PlayerEffect[]
}

// --------------------------------------------------------------------------------------- la red (§8.5)

const CHUNK_DS = BROADCAST.chunkRaceS * 10
const PREFETCH_DS = BROADCAST.prefetchRaceS * 10
/** Se pide el tramo siguiente cuando a lo servido le quedan menos de esto por delante de lo pintado (8-d). */
const LOW_WATER_S = BROADCAST.chunkRaceS / 2

/**
 * Los segundos de un 429 sin `retry-after` legible. @fastify/rate-limit lo manda siempre (en
 * segundos), así que solo cubre a un intermediario que lo quite. S/E.
 */
export const RETRY_AFTER_FALLBACK_S = 5

/** Lo alcanzado en décimas, hacia abajo: un informe nunca dice una décima de más (B18). */
const floorDs = (s: RaceS): Ds => Math.floor(s * 10 + 1e-6)

/** Las fases en que el reproductor mantiene servida la carrera por delante de lo pintado. */
const FETCHING: ReadonlySet<PlayerPhase> = new Set([
  'preview',
  'playing',
  'waiting',
  'recap',
  'paused',
])
/** Las fases en que el reloj puede correr: las que pausan el ❚❚, ocultar la pestaña y salir. */
const RUNNING: ReadonlySet<PlayerPhase> = new Set(['playing', 'waiting'])
/** Antes de la meta: lo que se informa al pausar, ocultarse o salir (después, la etapa ya es conocida). */
const BEFORE_FINISH: ReadonlySet<PlayerPhase> = new Set([
  'preview',
  'playing',
  'paused',
  'waiting',
  'seeking',
  'recap',
])

/**
 * El tope del reloj: lo servido y, con el último tramo dentro, el borde de la meta, una décima antes
 * de su toDs. Un tramo solo lleva lo visible antes de la meta y la ruta recorta su toDs a `finishDs`
 * (3a), así que el borde nunca es la meta: el informe que se hace en él no escribe la letra (§8.7).
 */
export function clockCapS(s: PlayerState): RaceS {
  return s.atFinish ? fromDs(toDs(s.servedS) - 1) : s.servedS
}

/** ¿Se esconden los mandos? Solo mientras la hora avanza, tras controlsHideS de pared sin tocar (8-p). */
export function controlsHidden(s: PlayerState): boolean {
  return s.phase === 'playing' && s.idleS >= BROADCAST.controlsHideS
}

/**
 * ¿Está la cabeza pintada en la línea? Su último bloque es el tope de su extrapolación (§4.5): la
 * marca de meta, que es `finishDs`, no va en ningún tramo (§8.7). Para el `atLine` del fotograma.
 */
export function headAtLine(
  instant: Pick<Instant, 'headKm'>,
  line: Pick<TimelineCore, 'blocks' | 'dx'>,
): boolean {
  return instant.headKm >= (line.blocks - 0.5) * line.dx - 1e-9
}

/**
 * Qué hace el reproductor con una petición que no ha salido bien (§10.12, §14.11, 14-q): un 429 no es
 * un fallo y espera su `retry-after` con `Loading`; un 409 `beyond_reached` se resuelve informando y
 * pidiendo otra vez; lo demás (red caída, un 5xx, un contrato roto) pausa con `Connection lost · Retry`.
 */
export function failureAction(error: unknown): PlayerAction {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return { k: 'throttled', retryAfterS: error.retryAfterS ?? RETRY_AFTER_FALLBACK_S }
    if (error.status === 409 && error.code === 'beyond_reached') return { k: 'beyond' }
  }
  return { k: 'failed' }
}

/** El informe de lo alcanzado, con el modo de la curva; lo informado pasa a ser eso. */
function withReport(s: PlayerState, beacon: boolean): PlayerStep {
  const reachedS = fromDs(floorDs(s.reachedS))
  return {
    next: { ...s, reportedS: Math.max(s.reportedS, reachedS), sinceReportS: 0 },
    effects: [{ k: 'report', reachedS, mode: REPORT_MODE[s.view], beacon }],
  }
}

/** Informa al pausar, ocultarse o salir, si hay algo nuevo que decir y la meta no ha llegado. */
function reportIfNew(s: PlayerState, beacon: boolean): PlayerStep {
  if (!BEFORE_FINISH.has(s.phase) || floorDs(s.reachedS) <= floorDs(s.reportedS))
    return { next: s, effects: [] }
  return withReport(s, beacon)
}

/**
 * LA CADENCIA DE LA RED (decisión 8-d, §8.5): cuando a lo servido le quedan menos de chunkRaceS / 2 de
 * carrera por delante de lo pintado, sin petición en vuelo y sin el último tramo dentro, se pide el
 * siguiente hasta mín(servido + chunkRaceS, informado + prefetchRaceS); y si lo informado no deja
 * pedir medio tramo, antes se informa de lo alcanzado (lo pintado, nunca lo servido). Todo en décimas
 * enteras: lo que se pide nunca pasa de lo que el servidor admite (B18), y así el 409 no salta nunca.
 */
function fetchMore(s: PlayerState): PlayerStep {
  if (s.inFlight || s.atFinish || s.notice === 'offline' || !FETCHING.has(s.phase))
    return { next: s, effects: [] }
  if (s.servedS - s.t >= LOW_WATER_S) return { next: s, effects: [] }
  const servedDs = toDs(s.servedS)
  let next = s
  const effects: PlayerEffect[] = []
  if (floorDs(s.reportedS) + PREFETCH_DS - servedDs < CHUNK_DS / 2) {
    const r = withReport(s, false)
    next = r.next
    effects.push(...r.effects)
  }
  const upTo = Math.min(servedDs + CHUNK_DS, floorDs(next.reportedS) + PREFETCH_DS)
  if (upTo <= servedDs) return { next, effects }
  effects.push({ k: 'chunk', fromS: fromDs(servedDs), toS: fromDs(upTo) })
  return { next: { ...next, inFlight: true }, effects }
}

/** Junta dos pasos: el segundo sale del estado del primero, y sus peticiones van detrás. */
function chain(a: PlayerStep, f: (s: PlayerState) => PlayerStep): PlayerStep {
  const b = f(a.next)
  return { next: b.next, effects: [...a.effects, ...b.effects] }
}

/**
 * La fase al seguir (▶, `Retry`, fin de la previa o del resumen): con la meta pedida, se espera; sin
 * carrera servida por delante, también; si no, la hora corre.
 */
function resume(s: PlayerState): PlayerState {
  const waiting = s.atFinish ? s.inFlight : s.t >= s.servedS
  return waiting
    ? { ...s, phase: 'waiting', notice: 'loading' }
    : { ...s, phase: 'playing', notice: null }
}

// ------------------------------------------------------------------------------------ la entrada (8-l)

/**
 * La entrada: la previa en 0 (sin lo alcanzado, o con la etapa ya conocida), o lo alcanzado menos
 * resumeBackS con `Previously` (pantalla) y los tramos de 0 en adelante, uno tras otro, hasta pasar
 * lo alcanzado (8-l). Lo informado es lo que el servidor ya sabe: el `reachedS` de la cabecera. En el
 * digest, siempre la previa (su cuadro 1), y `previous` es la etapa que acaba de verse: sigue en memoria
 * hasta que empiece la siguiente (18-e).
 */
export function playerInit(
  view: ViewMode,
  stageDay: number,
  reachedS: RaceS | null,
  known: boolean,
  previous: number | null = null,
): PlayerStep {
  const resumed = view !== 'digest' && !known && reachedS !== null && reachedS > 0 ? reachedS : null
  const reached = resumed === null ? 0 : fromDs(floorDs(resumed))
  return fetchMore({
    phase: resumed === null ? 'preview' : 'recap',
    view,
    speed: 1,
    nextAction: false,
    t: resumed === null ? 0 : Math.max(0, reached - BROADCAST.resumeBackS),
    reachedS: reached,
    reportedS: reached,
    servedS: 0,
    atFinish: false,
    seekKm: null,
    inFlight: false,
    notice: null,
    idleS: 0,
    sinceReportS: 0,
    stageDay,
    loaded:
      view === 'digest' && previous !== null && previous !== stageDay
        ? [previous, stageDay]
        : [stageDay],
    seekS: null,
    lastKm: false,
    revealed: false,
  })
}

// ------------------------------------------------------------------------------------- el reductor

const none = (s: PlayerState): PlayerStep => ({ next: s, effects: [] })

/** Un fotograma: el reloj de §8.2, la línea de §8.7, el informe periódico y la red de §8.5. */
function frame(
  before: PlayerState,
  a: Extract<PlayerAction, { k: 'frame' }>,
  ctx: PlayerContext,
): PlayerStep {
  // El último km se ve a su ritmo (8-o): ahí Next action se apaga y no se enciende.
  const lastKm = Number.isFinite(a.toGoKm) && a.toGoKm <= 1
  const s: PlayerState =
    lastKm !== before.lastKm || (lastKm && before.nextAction)
      ? { ...before, lastKm, nextAction: lastKm ? false : before.nextAction }
      : before
  if (s.phase !== 'playing') return fetchMore(s)
  const dtS = Number.isFinite(a.dtS) ? Math.max(0, a.dtS) : 0
  const cap = clockCapS(s)
  const ticked: PlayerState = { ...s, idleS: s.idleS + dtS, sinceReportS: s.sinceReportS + dtS }
  // La línea (§8.7): el último tramo dentro y la cabeza en su último bloque, o el reloj en el borde.
  // Se informa de lo alcanzado en el borde y se pide la meta con el modo de la curva (14-f).
  if (s.atFinish && (a.atLine || s.t >= cap)) {
    const r = withReport(ticked, false)
    return {
      next: { ...r.next, phase: 'waiting', notice: 'loading', inFlight: true },
      effects: [...r.effects, { k: 'finish', mode: REPORT_MODE[s.view] }],
    }
  }
  // El reloj (§8.2): la zona de la cabeza por la velocidad y Next action; nunca más allá de lo servido
  // ni del borde de la meta (D-06), y lo alcanzado es lo pintado (D-57).
  const x =
    ctx.baseX(s.view, s.t, a.toGoKm) * s.speed * (s.nextAction ? BROADCAST.nextActionSpeedup : 1)
  const t = Math.max(s.t, Math.min(s.t + (Number.isFinite(x) ? x : 0) * dtS, cap))
  let next: PlayerState = { ...ticked, t, reachedS: Math.max(s.reachedS, t) }
  // Sin carrera servida por delante, el reloj espera en el último fotograma con `Loading`.
  if (!s.atFinish && t >= s.servedS) next = { ...next, phase: 'waiting', notice: 'loading' }
  let out: PlayerStep = { next, effects: [] }
  if (
    next.phase === 'playing' &&
    next.sinceReportS >= BROADCAST.progressEveryRealS &&
    floorDs(next.reachedS) > floorDs(next.reportedS)
  )
    out = withReport(next, false)
  return chain(out, fetchMore)
}

// ------------------------------------------------------------------------- los saltos (§8.5; 10a)

/** Las fases desde las que se salta, se vuelve atrás o se revela: antes de la meta y sin un salto en curso. */
const SEEKABLE: ReadonlySet<PlayerPhase> = new Set(['preview', 'playing', 'paused', 'recap'])
/** ¿Se puede saltar o revelar? Con la meta pedida (en `waiting`, o pausada mientras llega), no. */
const canJump = (s: PlayerState): boolean =>
  !s.revealed &&
  !(s.atFinish && s.inFlight) &&
  (SEEKABLE.has(s.phase) || (s.phase === 'waiting' && !s.atFinish))

/** ¿Ha llegado lo servido al destino del salto en curso? En recorrido, por la cabeza en lo servido. */
function seekServed(s: PlayerState, headKmAtEnd: number): boolean {
  if (s.seekS !== null) return s.servedS >= s.seekS
  return s.seekKm === null || headKmAtEnd >= s.seekKm
}

/**
 * UNA VUELTA DEL SALTO (§8.5, 8-t): saltar es alcanzar, así que primero se informa de lo servido con
 * `mode: 'seek'` y después se pide el tramo siguiente, que lo informado ya permite (B18). Con el último
 * tramo dentro, o con lo servido en el destino, no se pide nada: el hook busca la hora destino en la
 * línea servida y aterriza (`landed`).
 */
function seekMore(s: PlayerState, headKmAtEnd: number): PlayerStep {
  if (s.inFlight || s.atFinish || seekServed(s, headKmAtEnd)) return none(s)
  const servedDs = toDs(s.servedS)
  let next = s
  const effects: PlayerEffect[] = []
  if (servedDs > floorDs(s.reportedS)) {
    const reachedS = fromDs(servedDs)
    next = { ...next, reportedS: reachedS, sinceReportS: 0 }
    effects.push({ k: 'report', reachedS, mode: 'seek', beacon: false })
  }
  const upTo = Math.min(servedDs + CHUNK_DS, floorDs(next.reportedS) + PREFETCH_DS)
  if (upTo <= servedDs) return { next, effects }
  effects.push({ k: 'chunk', fromS: fromDs(servedDs), toS: fromDs(upTo) })
  return { next: { ...next, inFlight: true }, effects }
}

/** Empezar un salto hacia delante: de recorrido (`seekKm`) o de reloj (`seekS`). */
function startSeek(
  s: PlayerState,
  target: { readonly km: number } | { readonly toS: RaceS },
  headKmAtEnd: number,
  ctx: PlayerContext,
): PlayerStep {
  // en el último km no queda adónde saltar: ningún salto pasa de un km antes de meta (8-j)
  if (s.view === 'digest' || !canJump(s) || ('km' in target && s.lastKm)) return none(s)
  const seeking: PlayerState = {
    ...s,
    phase: 'seeking',
    notice: null,
    nextAction: false,
    idleS: 0,
    ...('km' in target
      ? { seekKm: Math.min(target.km, ctx.lengthKm - 1), seekS: null }
      : { seekKm: null, seekS: Math.max(s.t, target.toS) }),
  }
  return seekMore(seeking, headKmAtEnd)
}

/**
 * EL ATERRIZAJE (§8.5): `t` a la hora destino, que el hook buscó en la línea servida (la primera en que
 * la cabeza pintada llega al km destino; en la crono, la hora pedida), sin pasar del borde de la meta;
 * lo alcanzado sube a ella y se informa con `mode: 'seek'` si es nuevo. Con rótulos de clase ≥ 2
 * saltados, `While you skipped` con el reloj quieto (8-n); sin ellos, sigue la carrera.
 */
function land(s: PlayerState, a: Extract<PlayerAction, { k: 'landed' }>): PlayerStep {
  if (s.phase !== 'seeking' || s.inFlight) return none(s)
  const cap = clockCapS(s)
  const toS = Number.isFinite(a.toS) ? a.toS : s.t
  const t = Math.max(s.t, Math.min(toS, cap))
  let next: PlayerState = {
    ...s,
    t,
    reachedS: Math.max(s.reachedS, t),
    seekKm: null,
    seekS: null,
    idleS: 0,
  }
  const effects: PlayerEffect[] = []
  if (floorDs(next.reachedS) > floorDs(next.reportedS)) {
    const reachedS = fromDs(floorDs(next.reachedS))
    next = { ...next, reportedS: reachedS, sinceReportS: 0 }
    effects.push({ k: 'report', reachedS, mode: 'seek', beacon: false })
  }
  next = a.skipped > 0 ? { ...next, phase: 'recap', notice: null } : resume(next)
  return chain({ next, effects }, fetchMore)
}

/** Volver atrás (§8.5): dentro de lo servido, sin red ni cuenta nueva; lo alcanzado no baja. */
function back(s: PlayerState, toS: RaceS): PlayerStep {
  // en el digest no hay saltos: sus mandos son la pausa y `Show results` (§8.1)
  if (s.view === 'digest' || !canJump(s) || s.phase === 'preview' || !Number.isFinite(toS))
    return none(s)
  // dentro de lo servido: lo de antes está en la línea en memoria (§8.5)
  const t = Math.max(0, Math.min(toS, s.t, s.servedS))
  if (t >= s.t) return none(s)
  const moved: PlayerState = { ...s, t, idleS: 0 }
  // en pausa se queda en pausa; desde el resumen o esperando un tramo, sigue la carrera
  return fetchMore(s.phase === 'paused' ? moved : resume({ ...moved, notice: null }))
}

/**
 * `Show result` ACEPTADO (§8.5, D-38, DD-17): se revela y después se pide la meta, en ese orden, con el
 * reloj quieto; la respuesta lleva a la llegada sin los grupos que llegan (§8.7). La confirmación es de
 * la pantalla. Lo que estuviera en vuelo responde antes y no cambia nada (el último tramo ya no se espera).
 */
function showResult(s: PlayerState): PlayerStep {
  if (!canJump(s) && !(s.phase === 'seeking' && !s.revealed)) return none(s)
  return {
    next: {
      ...s,
      phase: 'waiting',
      notice: 'loading',
      inFlight: true,
      atFinish: true,
      revealed: true,
      nextAction: false,
      seekKm: null,
      seekS: null,
    },
    effects: [{ k: 'reveal' }, { k: 'finish', mode: REPORT_MODE[s.view] }],
  }
}

/** Tras un fallo de `Show result`: otra vez la revelación y la meta. */
function revealAgain(s: PlayerState): PlayerStep {
  return {
    next: { ...s, phase: 'waiting', notice: 'loading', inFlight: true, atFinish: true },
    effects: [{ k: 'reveal' }, { k: 'finish', mode: REPORT_MODE[s.view] }],
  }
}

/**
 * EL DIGEST ENCADENA (§8.8, 8-c): tras la llegada de una etapa, con otra velada detrás y sin `Show
 * results`, el cuadro 1 de la previa de la siguiente, sin tocar: la carrera entera en un acto. Al
 * empezarla se suelta la de antes de la anterior (18-e): en memoria, la que se acaba de ver y esta.
 */
function chainDigest(s: PlayerState, nextDay: number): PlayerStep {
  const keep = s.loaded.filter((d) => d === s.stageDay)
  const released = s.loaded.filter((d) => d !== s.stageDay)
  const start: PlayerState = {
    ...s,
    phase: 'preview',
    speed: 1,
    nextAction: false,
    t: 0,
    reachedS: 0,
    reportedS: 0,
    servedS: 0,
    atFinish: false,
    seekKm: null,
    seekS: null,
    inFlight: false,
    notice: null,
    idleS: 0,
    sinceReportS: 0,
    stageDay: nextDay,
    loaded: [...keep, nextDay],
    lastKm: false,
    revealed: false,
  }
  const r = fetchMore(start)
  return {
    next: r.next,
    effects: [...released.map((d): PlayerEffect => ({ k: 'release', stageDay: d })), ...r.effects],
  }
}

/** EL REPRODUCTOR, un paso. Puro: el mismo estado y la misma acción dan siempre lo mismo. */
export function playerStep(s: PlayerState, a: PlayerAction, ctx: PlayerContext): PlayerStep {
  switch (a.k) {
    case 'frame':
      return frame(s, a, ctx)

    case 'play':
      // tras `Show result` no se vuelve a la carrera: `▶` repite lo que falló, como `Retry`
      if (s.revealed) return s.notice === 'offline' ? revealAgain(s) : none(s)
      if (s.phase === 'preview' || s.phase === 'recap' || s.phase === 'paused')
        return fetchMore(resume({ ...s, notice: null }))
      return none(s)

    case 'retry':
      // `Retry` repite lo que falló: el tramo, o la meta en el fotograma siguiente (§10.12, D-57); tras
      // `Show result`, la revelación y la meta.
      if (s.notice !== 'offline') return none(s)
      if (s.revealed) return revealAgain(s)
      return fetchMore(resume({ ...s, notice: null }))

    case 'pause':
    case 'hidden':
    case 'leave': {
      const r = reportIfNew(s, a.k === 'leave')
      // la espera de `Show result` no se pausa: lo que se pidió llega igual
      if (!RUNNING.has(r.next.phase) || r.next.revealed) return r
      return { next: { ...r.next, phase: 'paused', notice: null }, effects: r.effects }
    }

    case 'touch':
      return none({ ...s, idleS: 0 })

    case 'speed':
      // el digest va siempre a ×1 de su curva: su duración es su promesa (§8.1)
      return none(s.view === 'digest' ? s : { ...s, speed: a.x })

    case 'view':
      // Watch y Highlights cambian la curva, no la hora (§8.1); al digest se entra por su botón y no
      // se sale de él con el conmutador (§8.8).
      if (s.view === 'digest' || a.view === 'digest') return none(s)
      return none({ ...s, view: a.view })

    case 'nextAction':
      // ni en el digest ni en el último km, que se ve a su ritmo (8-o)
      if (s.view === 'digest' || (s.lastKm && !s.nextAction)) return none(s)
      return none({ ...s, nextAction: !s.nextAction })

    case 'cueAdmitted':
      // La única acción que mira los sucesos: apaga Next action, y la ronda de la moto no (6-m, B9); el
      // rótulo del último km, también (8-o).
      if (
        s.nextAction &&
        !a.round &&
        (a.cls >= BROADCAST.nextActionMinClass || a.kind === 'last_km')
      )
        return none({ ...s, nextAction: false })
      return none(s)

    case 'chunk': {
      if (!s.inFlight || s.atFinish) return none(s) // nadie lo pidió, o ya se espera la meta
      const next: PlayerState = {
        ...s,
        servedS: Math.max(s.servedS, a.toS),
        atFinish: a.atFinish,
        inFlight: false,
      }
      if (s.phase === 'seeking') return seekMore(next, a.headKmAtEnd)
      return fetchMore(s.phase === 'waiting' ? resume(next) : next)
    }

    case 'throttled':
      // Un 429 no es un fallo (14-q): la petición sigue en vuelo, el hook la repite a los retryAfterS
      // de pared, y el reloj sigue con lo servido; si lo alcanza, espera con `Loading`, como con
      // cualquier tramo en vuelo. Nunca `Connection lost`.
      return none(s)

    case 'beyond': {
      // 409 `beyond_reached` (§14.11): el servidor sabe menos de lo informado (un reinicio vacía su
      // memoria, riesgo 19). Se informa de lo alcanzado y se pide otra vez el mismo tramo; en un salto,
      // de lo servido, con `mode: 'seek'` (8-j).
      if (!s.inFlight || s.atFinish) return none(s)
      if (s.phase === 'seeking') {
        const reachedS = fromDs(toDs(s.servedS))
        return chain(
          {
            next: { ...s, inFlight: false, reportedS: reachedS, sinceReportS: 0 },
            effects: [{ k: 'report', reachedS, mode: 'seek', beacon: false }],
          },
          (x) => seekMore(x, Number.NEGATIVE_INFINITY),
        )
      }
      return chain(withReport({ ...s, inFlight: false }, false), fetchMore)
    }

    case 'failed':
      // Red caída o un 5xx (D-57): pausa con `Connection lost · Retry`; lo alcanzado es lo pintado. Un
      // salto que falla se deja donde estaba: `Retry` sigue la carrera desde la hora de antes.
      if (!s.inFlight) return none(s)
      return none({
        ...s,
        inFlight: false,
        phase: 'paused',
        notice: 'offline',
        seekKm: null,
        seekS: null,
      })

    case 'finished':
      if (!(s.inFlight && s.atFinish)) return none(s) // solo la meta que se pidió
      return none({ ...s, inFlight: false, phase: 'arrival', notice: null })

    case 'cardDone':
      if (s.phase === 'preview' || s.phase === 'recap') return fetchMore(resume(s))
      if (s.phase === 'arrival') {
        // en el digest, la siguiente etapa velada; tras la última, o tras `Show results`, el cierre
        if (s.view === 'digest' && ctx.digestNext !== null && !s.revealed)
          return chainDigest(s, ctx.digestNext)
        // el último cuadro del cierre se queda y Next abre otra etapa (§8.8)
        return none({ ...s, phase: 'closing' })
      }
      return none(s)

    case 'seek':
      return startSeek(s, { km: a.km }, a.headKmAtEnd, ctx)

    case 'seekTime':
      return startSeek(s, { toS: a.toS }, Number.NEGATIVE_INFINITY, ctx)

    case 'landed':
      return land(s, a)

    case 'back':
      return back(s, a.toS)

    case 'showResult':
      return showResult(s)
  }
}

// ------------------------------------------------------------------ la cola de rótulos (§6.5; 6a)

/**
 * LA COLA DE RÓTULOS DEL REPRODUCTOR (§6.5, D-21; 6-h, 6-i). Un estado aparte del reloj, que el hook
 * avanza en cada fotograma con el instante que pinta (`cueDeckStep`): los rótulos de `cuesBetween`
 * entre el instante del paso anterior y este, cada uno con su clase (`cueClassOf`), pasan por `admitir`
 * (`admitCue`), y después el fotograma de la cola (`cueFrame`) decide qué está en pantalla. Lo que se
 * admite vuelve al hook para el reductor (`cueAdmitted`), que es lo único que la cola le cambia: apaga
 * `Next action`. El reloj no la lee nunca: un rótulo en pantalla o una cola llena no frenan la carrera.
 *
 * Su hora es la de pared con la carrera corriendo (`playing`): en pausa, o esperando un tramo, el rótulo
 * no se gasta. Lo que el reproductor programa además de `cuesBetween` (6-i): el segundo tiempo de una
 * caída, sus nombres, `crashNamesDelayS` de pared después del primero (D-13, 6a); y desde el 6b, la
 * presentación de la fuga (la frase tras la lista y la ronda de la moto, 6-m), el cuadro de diferencias
 * y la general virtual cada `gapsTableEveryRealS`, la ficha del puerto, el corredor de una pancarta, el
 * corredor propio que cambia de grupo y los rótulos de la crono (§9.5). Los de la llegada son del 10a.
 */
export interface CueDeck {
  readonly queue: CueQueue
  /** s de pared con la carrera corriendo: la cola caduca y cuenta su tiempo en pantalla con ellos */
  readonly wallS: number
  /** el instante del paso anterior: los rótulos de un paso son los de (seen.t, instante.t] */
  readonly seen: Instant | null
  /** los nombres de cada caída, con la hora de pared a la que salen (D-13) */
  readonly names: readonly { readonly cue: Cue; readonly atS: number }[]
  /** el primero del último VIRTUAL GC; hasta el primero, el líder de la general de salida (9-n) */
  readonly lastVirtualLeader: RiderIx | null
  /** la ronda de la moto en curso (6-m): los que faltan, por dorsal, y la hora de pared del siguiente */
  readonly round: { readonly riders: readonly RiderIx[]; readonly atS: number } | null
  /** la hora de pared del próximo cuadro de diferencias (`gapsTableEveryRealS`) */
  readonly checkAtS: number
  /** el índice en `ProfileStrip.climbs` de la próxima ficha de puerto; −1 hasta el primer instante */
  readonly climbNext: number
  /** la crono (§9.5): su instante anterior y la ronda ON COURSE (el último presentado y la hora de pared del siguiente) */
  readonly tt: {
    readonly seen: TimeTrialInstant | null
    readonly roundAtS: number
    readonly roundLast: RiderIx | null
    readonly started: boolean
  }
}

/**
 * Lo que la cola necesita de la etapa: la salida servida, si es crono, y la línea servida (sus sucesos y
 * su catálogo). Desde el 6b, lo que el reproductor necesita para lo que programa él (6-i): el reparto
 * servido, el recorrido, los corredores del espectador, el modo y la velocidad (la ronda de la moto, solo
 * en `Watch` a ×½, ×1 y ×2, 6-m) y, en una crono, su preparación pública (`BroadcastHead.tt`). Sin
 * ellos, la cola de 6a: solo `cuesBetween` y los nombres de las caídas.
 */
export interface CueDeckContext {
  readonly start: StartState
  readonly timeTrial: boolean
  readonly events: readonly TimelineEvent[]
  readonly catalog: readonly GroupCatalogEntry[]
  readonly cast?: readonly RiderCard[]
  readonly profile?: ProfileStrip
  readonly own?: ReadonlySet<RiderIx>
  readonly view?: ViewMode
  readonly speed?: number
  readonly tt?: BroadcastHead['tt']
}

/** Un rótulo admitido, como lo recibe el reductor. */
export type AdmittedCue = Extract<PlayerAction, { k: 'cueAdmitted' }>

/** La cola vacía, al entrar en una etapa. */
export function cueDeckInit(start: StartState): CueDeck {
  return {
    queue: EMPTY_CUE_QUEUE,
    wallS: 0,
    seen: null,
    names: [],
    lastVirtualLeader: start.leaders.gc,
    round: null,
    checkAtS: BROADCAST.gapsTableEveryRealS,
    climbNext: -1,
    tt: { seen: null, roundAtS: BROADCAST.breakRoundEveryS, roundLast: null, started: false },
  }
}

/** ¿Va la ronda de la moto en este modo y a esta velocidad? Solo en `Watch` a ×½, ×1 y ×2 (6-m). */
function roundAllowed(ctx: CueDeckContext): boolean {
  return (ctx.view ?? 'watch') === 'watch' && (ctx.speed ?? 1) <= 2
}

/**
 * EL CUADRO DE DIFERENCIAS (§6.7): todos los grupos hasta el del título incluido, más el del
 * espectador y los que lleven un maillot; lo de detrás sin ellos lo cuenta el rótulo en una fila
 * (`+3 groups behind · 41 riders`). Los nombres de cada fila, si son tres o menos (§6.3).
 */
export function timeCheckRowsOf(i: Instant): TimeCheckRow[] {
  const groups = i.groups.filter((g) => g.size > 0)
  const pack = groups.findIndex((g) => g.kind === 'peloton')
  return groups.flatMap((g, k) =>
    pack < 0 || k <= pack || g.own || g.jerseys.length > 0
      ? [
          {
            number: g.number,
            group: g.g,
            size: g.size,
            gapS: g.gap.toHeadS,
            jerseys: g.jerseys,
            names: g.label.k === 'names' ? g.label.riders : null,
          },
        ]
      : [],
  )
}

/** El grupo en que se pinta a r en el instante (en tránsito, el que deja, 3-b); undefined si no corre. */
function groupOf(i: Instant, r: RiderIx): GroupIx | undefined {
  const from = i.inTransit.find((x) => x.rider === r)?.from
  if (from !== undefined) return from
  return i.groups.find((g) => g.members.includes(r))?.g
}

/**
 * LOS RÓTULOS QUE PROGRAMA EL REPRODUCTOR EN LÍNEA (6-i, §6.5 y §6.7), entre el instante anterior y
 * este: tras cada lista de una fuga, su frase, y la ronda de la moto si va en este modo; tras una
 * pancarta, el que la ganó; el corredor propio que cambia de grupo; la ficha del puerto, a
 * `climbCardLeadKm` de su pie. `fresh` son los de `cuesBetween`, en su orden.
 */
function roadExtras(
  fresh: readonly Cue[],
  prev: Instant,
  next: Instant,
  ctx: CueDeckContext,
  deck: { round: CueDeck['round']; climbNext: number },
  wallS: number,
): { readonly cues: Cue[]; readonly round: CueDeck['round']; readonly climbNext: number } {
  const cast = ctx.cast ?? []
  const own = ctx.own ?? new Set<RiderIx>()
  const out: Cue[] = []
  let round = deck.round
  for (const cue of fresh) {
    out.push(cue)
    if (cue.kind === 'break_formed' && ctx.cast !== undefined) {
      out.push(breakPresentedOf(cue, cast, own))
      round = roundAllowed(ctx)
        ? { riders: breakRoundOf(cue.riders, cast), atS: wallS + BROADCAST.breakRoundEveryS }
        : null
    }
    if (cue.kind === 'banner_result') {
      const winner = next.banners[cue.banner]?.order[0]?.rider
      if (winner !== undefined && ctx.cast !== undefined)
        out.push({ kind: 'rider', t: cue.t, rider: winner, context: 'banner' })
    }
  }
  for (const r of own) {
    const was = groupOf(prev, r)
    const now = groupOf(next, r)
    if (was !== undefined && now !== undefined && was !== now)
      out.push({ kind: 'rider', t: next.t, rider: r, context: 'own' })
  }
  let climbNext = deck.climbNext
  const climbs = ctx.profile?.climbs ?? []
  while (climbNext >= 0 && climbNext < climbs.length) {
    const c = climbs[climbNext]!
    if (next.headKm < c.footKm - BROADCAST.climbCardLeadKm) break
    if (next.headKm < c.topKm) out.push({ kind: 'climb_ahead', t: next.t, banner: climbNext })
    climbNext += 1
  }
  return { cues: out, round, climbNext }
}

/**
 * LOS CANDIDATOS DE LA CRONO (§9.5): los del espectador, los de notoriedad 5 o menos (llevan un maillot,
 * un título de la categoría o amenazan la general, §7.5) y, por la general, los `namedGcTop` últimos en
 * salir, que son los diez primeros de la general de salida. Los rótulos y los cursores de la crono.
 */
export function ttCandidatesOf(
  cast: readonly RiderCard[],
  own: Iterable<RiderIx>,
  start: StartState,
  tt: BroadcastHead['tt'] | undefined,
): ReadonlySet<RiderIx> {
  const out = new Set<RiderIx>(own)
  for (const c of cast) if (c.notoriety <= 5) out.add(c.ix)
  if (tt?.order === 'gc')
    for (const row of start.gcTop) if (row.rank <= BROADCAST.namedGcTop) out.add(row.rider)
  return out
}

function ttCandidates(ctx: CueDeckContext): ReadonlySet<RiderIx> {
  return ttCandidatesOf(ctx.cast ?? [], ctx.own ?? [], ctx.start, ctx.tt)
}

/**
 * LOS RÓTULOS DE LA CRONO (§9.5; 9-d), del paso de un `TimeTrialInstant` al siguiente: la regla de
 * salida al empezar desde la salida; un `tt_split` por cada paso nuevo por un control de un candidato o
 * con el mejor tiempo; un `tt_finish` por cada llegada nueva de un candidato o que se sienta en el
 * sillón; y la general virtual cuando el líder de salida pasa por un punto nuevo.
 */
function ttExtras(
  prev: TimeTrialInstant,
  next: TimeTrialInstant,
  ctx: CueDeckContext,
  started: boolean,
): { readonly cues: Cue[]; readonly started: boolean } {
  const out: Cue[] = []
  if (!started && ctx.tt != null && prev.t < ctx.tt.intervalS)
    out.push({ kind: 'tt_start_order', t: prev.t })
  const cand = ttCandidates(ctx)
  const leader = ctx.start.leaders.gc
  let leaderPassed = false
  next.splits.forEach((s, check) => {
    const before = new Set(prev.splits[check]?.board.map((x) => x.rider) ?? [])
    const bestBefore = prev.splits[check]?.board[0]?.timeS ?? null
    s.board.forEach((p, k) => {
      if (before.has(p.rider)) return
      if (p.rider === leader) leaderPassed = true
      const rank = k + 1
      if (!cand.has(p.rider) && rank !== 1) return
      out.push({
        kind: 'tt_split',
        t: next.t,
        check,
        rider: p.rider,
        timeS: p.timeS,
        rank,
        deltaS:
          rank === 1
            ? bestBefore === null
              ? null
              : p.timeS - bestBefore
            : p.timeS - (s.board[0]?.timeS ?? p.timeS),
        board: s.board.slice(0, 3),
      })
    })
  })
  const arrived = new Set(prev.arrivals.map((a) => a.rider))
  const seat = prev.hotSeat
  next.arrivals.forEach((a, k) => {
    if (arrived.has(a.rider)) return
    if (a.rider === leader) leaderPassed = true
    const hotSeat = next.hotSeat?.rider === a.rider && seat?.rider !== a.rider
    if (!cand.has(a.rider) && !hotSeat) return
    out.push({
      kind: 'tt_finish',
      t: next.t,
      rider: a.rider,
      timeS: a.timeS,
      rank: k + 1,
      deltaS: hotSeat
        ? seat === null
          ? null
          : a.timeS - seat.timeS
        : a.timeS - (next.hotSeat?.timeS ?? a.timeS),
      hotSeat,
      prev: hotSeat ? (seat?.rider ?? null) : null,
    })
  })
  if (leaderPassed && next.virtualGc !== null)
    out.push({ kind: 'virtual_gc', t: next.t, rows: next.virtualGc })
  return { cues: out, started: true }
}

/**
 * UN FOTOGRAMA DE LA COLA. Pura. `instant` es el que se pinta en este fotograma (el mismo objeto
 * mientras no cambia la hora); `running`, si la carrera corre (`playing`). El primer instante solo se
 * apunta: lo de antes de entrar (la previa, `Previously`) no sale en rótulos. Si la hora va hacia
 * atrás (un salto, 10a), tampoco. En una crono, `tti` es su instante (§9.3), del que salen sus rótulos.
 */
export function cueDeckStep(
  deck: CueDeck,
  instant: Instant,
  dtS: number,
  running: boolean,
  ctx: CueDeckContext,
  tti: TimeTrialInstant | null = null,
): { readonly deck: CueDeck; readonly admitted: readonly AdmittedCue[] } {
  const wallS = deck.wallS + (running && Number.isFinite(dtS) ? Math.max(0, dtS) : 0)
  const fresh: Cue[] = []
  let names = deck.names
  let seen = deck.seen
  let round = deck.round
  let climbNext = deck.climbNext
  let tt = deck.tt
  const climbs = ctx.profile?.climbs ?? []
  if (seen === null || toDs(instant.t) < toDs(seen.t)) {
    seen = instant
    // la ficha del puerto, desde el primero cuyo aviso aún no ha llegado; la ronda, de otra hora
    climbNext = climbs.findIndex((c) => instant.headKm < c.footKm - BROADCAST.climbCardLeadKm)
    if (climbNext < 0) climbNext = climbs.length
    round = null
    tt = { ...tt, seen: tti, roundAtS: wallS + BROADCAST.breakRoundEveryS }
  } else if (instant !== seen && toDs(instant.t) > toDs(seen.t)) {
    const between = cuesBetween(seen, instant, ctx.events, ctx.catalog)
    const extra = roadExtras(between, seen, instant, ctx, { round, climbNext }, wallS)
    fresh.push(...extra.cues)
    round = extra.round
    climbNext = extra.climbNext
    const named = namedCrashesBetween(seen, instant, ctx.events)
    if (named.length > 0)
      names = [...names, ...named.map((cue) => ({ cue, atS: wallS + BROADCAST.crashNamesDelayS }))]
    if (ctx.timeTrial && tti !== null && tt.seen !== null && toDs(tti.t) > toDs(tt.seen.t)) {
      const x = ttExtras(tt.seen, tti, ctx, tt.started)
      fresh.push(...x.cues)
      tt = { ...tt, started: x.started }
    }
    if (tti !== null) tt = { ...tt, seen: tti }
    seen = instant
  }
  if (names.some((x) => x.atS <= wallS)) {
    fresh.push(...names.filter((x) => x.atS <= wallS).map((x) => x.cue))
    names = names.filter((x) => x.atS > wallS)
  }
  // La ronda de la moto (6-m): uno cada breakRoundEveryS de pared, por dorsal, y nunca uno que ya no va
  // por delante del pelotón; al pasar a ×4 o a Highlights, lo que queda se tira.
  if (round !== null && !roundAllowed(ctx)) round = null
  while (round !== null && wallS >= round.atS) {
    const [r, ...rest] = round.riders
    round = rest.length === 0 ? null : { riders: rest, atS: round.atS + BROADCAST.breakRoundEveryS }
    if (r !== undefined && aheadOfPeloton(instant, r)) {
      fresh.push({ kind: 'rider', t: instant.t, rider: r, context: 'break_round' })
      break
    }
    if (round !== null) round = { ...round, atS: wallS } // el que ya no presenta nada no gasta su turno
  }
  // El cuadro de diferencias y la general virtual, cada gapsTableEveryRealS de pared, salvo a menos de
  // quietFinalKm de meta (§6.7). En la crono, la general virtual sale al paso del líder (§9.5).
  let checkAtS = deck.checkAtS
  if (running && wallS >= checkAtS) {
    checkAtS = wallS + BROADCAST.gapsTableEveryRealS
    if (!ctx.timeTrial && ctx.cast !== undefined && instant.toGoKm >= BROADCAST.quietFinalKm) {
      const rows = timeCheckRowsOf(instant)
      if (rows.length > 1) fresh.push({ kind: 'time_check', t: instant.t, rows })
      if (instant.virtualGc !== null)
        fresh.push({ kind: 'virtual_gc', t: instant.t, rows: instant.virtualGc })
    }
  }
  // La ronda ON COURSE de la crono (§9.5): cada breakRoundEveryS de pared, el siguiente candidato en
  // ruta por orden de salida.
  if (ctx.timeTrial && tti !== null && running && wallS >= tt.roundAtS) {
    const cand = ttCandidates(ctx)
    const onCourse = tti.onCourse.filter((x) => cand.has(x.rider))
    const after = onCourse.findIndex((x) => x.rider === tt.roundLast)
    const pick = onCourse[after + 1] ?? onCourse[0]
    tt = { ...tt, roundAtS: wallS + BROADCAST.breakRoundEveryS, roundLast: pick?.rider ?? null }
    if (pick !== undefined)
      fresh.push({ kind: 'rider', t: tti.t, rider: pick.rider, context: 'tt_round' })
  }
  let queue = deck.queue
  let lastVirtualLeader = deck.lastVirtualLeader
  const admitted: AdmittedCue[] = []
  const at = { wallS, toGoKm: instant.toGoKm, instant }
  for (const cue of fresh) {
    const cls = cueClassOf(cue, ctx.start, lastVirtualLeader, ctx.timeTrial)
    const r = admitCue(queue, cue, cls, at)
    queue = r.queue
    if (r.admitted)
      admitted.push({
        k: 'cueAdmitted',
        cls,
        kind: cue.kind,
        round: cue.kind === 'rider' && cue.context === 'break_round',
      })
    if (cue.kind === 'virtual_gc') lastVirtualLeader = cue.rows[0]?.rider ?? lastVirtualLeader
  }
  queue = cueFrame(queue, at)
  return {
    deck: { queue, wallS, seen, names, lastVirtualLeader, round, checkAtS, climbNext, tt },
    admitted,
  }
}

/**
 * LA COLA TRAS UN SALTO (§8.5; la nota 4 del 6b): se vacía y se asienta en el instante del aterrizaje,
 * para que lo saltado no entre de golpe en rótulos (lo resume `While you skipped`, 8-i). La ficha del
 * puerto que viene sale si ya pasó su aviso (`Next climb` aterriza a `climbCardLeadKm` de su pie, 8-n), y
 * lo que se trae (`carried`: la fuga formada en lo saltado que sigue por delante del pelotón) sale con su
 * frase y su ronda, como al formarse (6-m). Devuelve, como `cueDeckStep`, lo admitido para el reductor.
 */
export function cueDeckSeat(
  deck: CueDeck,
  instant: Instant,
  ctx: CueDeckContext,
  tti: TimeTrialInstant | null,
  carried: readonly Cue[] = [],
): { readonly deck: CueDeck; readonly admitted: readonly AdmittedCue[] } {
  const climbs = ctx.profile?.climbs ?? []
  let climbNext = climbs.findIndex((c) => instant.headKm < c.topKm)
  if (climbNext < 0) climbNext = climbs.length
  const extra = roadExtras(carried, instant, instant, ctx, { round: null, climbNext }, deck.wallS)
  let queue: CueQueue = EMPTY_CUE_QUEUE
  const admitted: AdmittedCue[] = []
  const at = { wallS: deck.wallS, toGoKm: instant.toGoKm, instant }
  for (const cue of extra.cues) {
    const cls = cueClassOf(cue, ctx.start, deck.lastVirtualLeader, ctx.timeTrial)
    const r = admitCue(queue, cue, cls, at)
    queue = r.queue
    if (r.admitted)
      admitted.push({
        k: 'cueAdmitted',
        cls,
        kind: cue.kind,
        round: cue.kind === 'rider' && cue.context === 'break_round',
      })
  }
  return {
    deck: {
      ...deck,
      queue: cueFrame(queue, at),
      seen: instant,
      names: [],
      round: extra.round,
      climbNext: extra.climbNext,
      checkAtS: deck.wallS + BROADCAST.gapsTableEveryRealS,
      tt: { ...deck.tt, seen: tti, roundAtS: deck.wallS + BROADCAST.breakRoundEveryS },
    },
    admitted,
  }
}

/** Lo que resumen `While you skipped` y `Previously` (8-i). */
export interface Recap {
  /** los `recapMaxCues` últimos rótulos de clase ≥ `skippedMinClass`, en orden de carrera */
  readonly cues: readonly Cue[]
  /** cuántos de esa clase hubo: con ninguno, el salto no para en el resumen (§8.11) */
  readonly count: number
  /** la última fuga formada entre las dos horas que sigue por delante del pelotón: su presentación entera (6-m) */
  readonly breakaway: Extract<Cue, { readonly kind: 'break_formed' }> | null
}

/**
 * EL RESUMEN DE LO QUE NO SE VIO (§8.5; 8-i): los rótulos de `cuesBetween` entre dos instantes con clase
 * ≥ `skippedMinClass` (2), los `recapMaxCues` (5) últimos en orden de carrera, y la fuga que se formó entre
 * medias si alguno de los suyos sigue por delante del pelotón. `While you skipped` lo pide entre la hora
 * de antes del salto y la del aterrizaje; `Previously`, entre la salida y lo alcanzado. Puro.
 */
export function recapOf(prev: Instant, next: Instant, ctx: CueDeckContext): Recap {
  const all = cuesBetween(prev, next, ctx.events, ctx.catalog)
  const kept = all.filter(
    (c) =>
      cueClassOf(c, ctx.start, ctx.start.leaders.gc, ctx.timeTrial) >= BROADCAST.skippedMinClass,
  )
  let breakaway: Recap['breakaway'] = null
  for (const c of all)
    if (c.kind === 'break_formed' && c.riders.some((r) => aheadOfPeloton(next, r))) breakaway = c
  return { cues: kept.slice(-BROADCAST.recapMaxCues), count: kept.length, breakaway }
}

// --------------------------------------------------------------- los destinos de los saltos (§8.5)

/** Los saltos de recorrido de los mandos (§8.5; pantalla): `−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`. */
export type RoadJump = 'back5' | 'fwd5' | 'nextClimb' | 'final20' | 'lastKm'

/**
 * EL KM DESTINO DE UN SALTO DE RECORRIDO (§8.5, 8-j), del km pintado de la cabeza; null si el mando está
 * apagado. Todos son del recorrido, que es público, y ninguno pasa de un km antes de meta: `+5 km`, la
 * cabeza más `seekStepKm`; `Next climb`, el pie del siguiente puerto menos `climbCardLeadKm`, para que
 * salga su ficha; `Final 20 km`, la longitud menos `seekFinalKm`, apagado si la cabeza ya los pasó;
 * `Last km`, la longitud menos 1. `−5 km` vuelve atrás (sin red), apagado en la salida.
 */
export function seekTargetKm(
  jump: RoadJump,
  headKm: number,
  lengthKm: number,
  profile: Pick<ProfileStrip, 'climbs'>,
): number | null {
  const last = lengthKm - 1
  const ahead = (km: number): number | null =>
    km > headKm + 1e-6 && headKm < last - 1e-6 ? Math.min(km, last) : null
  switch (jump) {
    case 'back5':
      return headKm > 1e-6 ? Math.max(0, headKm - BROADCAST.seekStepKm) : null
    case 'fwd5':
      return ahead(headKm + BROADCAST.seekStepKm)
    case 'nextClimb': {
      const c = profile.climbs.find((x) => x.footKm - BROADCAST.climbCardLeadKm > headKm + 1e-6)
      return c === undefined ? null : ahead(Math.max(0, c.footKm - BROADCAST.climbCardLeadKm))
    }
    case 'final20':
      return ahead(lengthKm - BROADCAST.seekFinalKm)
    case 'lastKm':
      return ahead(last)
  }
}

/** Los saltos de reloj de la crono (9-g; pantalla): `−10 min`, `+10 min`, `Last 20 starters`, `Last starter`. */
export type ClockJump = 'back10' | 'fwd10' | 'last20' | 'lastStarter'

/**
 * LA HORA DESTINO DE UN SALTO DE LA CRONO (§9.4, 9-g): `±ttSeekStepS` de reloj, o la salida del
 * vigésimo empezando por el final (`ttSeekLastStarters`) o la del último, que son públicas (el orden y el
 * intervalo). null si el mando no lleva a ningún sitio. Ninguno cruza la meta: el aterrizaje lo recorta
 * el hook al borde de lo servido y antes del último km del último en salir.
 */
export function ttSeekTargetS(
  jump: ClockJump,
  t: RaceS,
  plan: { readonly riders: number; readonly intervalS: number },
): RaceS | null {
  const startOf = (i: number): RaceS => Math.max(0, i) * plan.intervalS
  switch (jump) {
    case 'back10':
      return t > 0 ? Math.max(0, t - BROADCAST.ttSeekStepS) : null
    case 'fwd10':
      return t + BROADCAST.ttSeekStepS
    case 'last20': {
      const s = startOf(plan.riders - BROADCAST.ttSeekLastStarters)
      return s > t ? s : null
    }
    case 'lastStarter': {
      const s = startOf(plan.riders - 1)
      return s > t ? s : null
    }
  }
}
