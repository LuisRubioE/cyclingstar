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
 * 10a: hasta entonces sus acciones no cambian nada. La cola de rótulos llega en el 6a (`CueDeck`, al
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
 * lo alcanzado (8-l). Lo informado es lo que el servidor ya sabe: el `reachedS` de la cabecera.
 */
export function playerInit(
  view: ViewMode,
  stageDay: number,
  reachedS: RaceS | null,
  known: boolean,
): PlayerStep {
  const resumed = !known && reachedS !== null && reachedS > 0 ? reachedS : null
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
    loaded: [stageDay],
  })
}

// ------------------------------------------------------------------------------------- el reductor

const none = (s: PlayerState): PlayerStep => ({ next: s, effects: [] })

/** Un fotograma: el reloj de §8.2, la línea de §8.7, el informe periódico y la red de §8.5. */
function frame(
  s: PlayerState,
  a: Extract<PlayerAction, { k: 'frame' }>,
  ctx: PlayerContext,
): PlayerStep {
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

/** EL REPRODUCTOR, un paso. Puro: el mismo estado y la misma acción dan siempre lo mismo. */
export function playerStep(s: PlayerState, a: PlayerAction, ctx: PlayerContext): PlayerStep {
  switch (a.k) {
    case 'frame':
      return frame(s, a, ctx)

    case 'play':
      if (s.phase === 'preview' || s.phase === 'recap' || s.phase === 'paused')
        return fetchMore(resume({ ...s, notice: null }))
      return none(s)

    case 'retry':
      // `Retry` repite lo que falló: el tramo, o la meta en el fotograma siguiente (§10.12, D-57).
      if (s.notice !== 'offline') return none(s)
      return fetchMore(resume({ ...s, notice: null }))

    case 'pause':
    case 'hidden':
    case 'leave': {
      const r = reportIfNew(s, a.k === 'leave')
      if (!RUNNING.has(r.next.phase)) return r
      return { next: { ...r.next, phase: 'paused', notice: null }, effects: r.effects }
    }

    case 'touch':
      return none({ ...s, idleS: 0 })

    case 'speed':
      // el digest va siempre a ×1 de su curva: su duración es su promesa (§8.1)
      return none(s.view === 'digest' ? s : { ...s, speed: a.x })

    case 'view':
      // Watch y Highlights cambian la curva, no la hora (§8.1); el digest se entra y se sale en el 10a.
      if (s.view === 'digest' || a.view === 'digest') return none(s)
      return none({ ...s, view: a.view })

    case 'nextAction':
      return none(s.view === 'digest' ? s : { ...s, nextAction: !s.nextAction })

    case 'cueAdmitted':
      // La única acción que mira los sucesos: apaga Next action, y la ronda de la moto no (6-m, B9).
      if (s.nextAction && !a.round && a.cls >= BROADCAST.nextActionMinClass)
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
      return fetchMore(s.phase === 'waiting' ? resume(next) : next)
    }

    case 'throttled':
      // Un 429 no es un fallo (14-q): la petición sigue en vuelo, el hook la repite a los retryAfterS
      // de pared, y el reloj sigue con lo servido; si lo alcanza, espera con `Loading`, como con
      // cualquier tramo en vuelo. Nunca `Connection lost`.
      return none(s)

    case 'beyond': {
      // 409 `beyond_reached` (§14.11): el servidor sabe menos de lo informado (un reinicio vacía su
      // memoria, riesgo 19). Se informa de lo alcanzado y se pide otra vez el mismo tramo.
      if (!s.inFlight || s.atFinish) return none(s)
      return chain(withReport({ ...s, inFlight: false }, false), fetchMore)
    }

    case 'failed':
      // Red caída o un 5xx (D-57): pausa con `Connection lost · Retry`; lo alcanzado es lo pintado.
      if (!s.inFlight) return none(s)
      return none({ ...s, inFlight: false, phase: 'paused', notice: 'offline' })

    case 'finished':
      if (!(s.inFlight && s.atFinish)) return none(s) // solo la meta que se pidió
      return none({ ...s, inFlight: false, phase: 'arrival', notice: null })

    case 'cardDone':
      if (s.phase === 'preview' || s.phase === 'recap') return fetchMore(resume(s))
      // tras la llegada, el cierre; el último cuadro del cierre se queda y Next abre otra etapa (§8.8)
      if (s.phase === 'arrival') return none({ ...s, phase: 'closing' })
      return none(s)

    case 'seek':
    case 'back':
    case 'landed':
    case 'showResult':
      // los saltos y Show result llegan en el 10a (§8.5, §17.13)
      return none(s)
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
