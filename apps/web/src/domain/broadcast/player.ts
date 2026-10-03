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
 * 10a: hasta entonces sus acciones no cambian nada. La cola de rótulos llega en el 6a, y los efectos de
 * informe (`report`) no se ejecutan hasta el 7a, cuando existe `POST /api/me/watch` (§17.6).
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
  type CueClass,
  type CueKind,
  type Ds,
  type Instant,
  type RaceS,
  type TimelineCore,
  type WatchMode,
  fromDs,
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
  /** POST /api/me/watch; beacon en pagehide. No se ejecuta hasta el 7a */
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
