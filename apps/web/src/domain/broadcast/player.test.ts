import {
  BROADCAST,
  type CueKind,
  type InstantContext,
  type RaceS,
  type StateEvent,
  type TimelineCore,
  type TimelineEvent,
  cutTimeline,
  fromDs,
  instantAt,
  paceAt,
  photoBlocksOf,
  seededRng,
  toDs,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/request'
import { HEAD_TRACKS, type HeadTrack, type HeadTrackName } from './__fixtures__/headTracks'
import {
  type PlayerAction,
  type PlayerContext,
  type PlayerEffect,
  type PlayerPhase,
  type PlayerState,
  type PlayerStep,
  REPORT_MODE,
  RETRY_AFTER_FALLBACK_S,
  type Speed,
  type ViewMode,
  clockCapS,
  controlsHidden,
  failureAction,
  headAtLine,
  playerInit,
  playerStep,
} from './player'

/**
 * EL REPRODUCTOR DE `Watch` (docs/retransmision.md §8.11 y §8.12; 8-d, 8-q, 14-q; paso 3b), sin
 * navegador: un reductor puro, un hook de mentira que ejecuta sus peticiones en orden, cada una tras
 * la respuesta de la anterior, y un servidor de mentira que aplica la admisión de §10.11 (el recorte
 * al borde de la meta y el 409 `beyond_reached` más allá de lo informado más `prefetchRaceS`) y
 * responde a los 150 ms. Las filas del 3b de §8.12:
 *
 * - la parte del ritmo de B9: la misma línea con sus sucesos y con `events` vacío da la misma `t`
 *   fotograma a fotograma, a 60 fotogramas por segundo y con `Next action` apagado;
 * - las comprobaciones de §8.11 en cada paso de 1.000 secuencias de acciones al azar: las siete del 3b
 *   (1, 2, 3, 5, 6, la mitad de la 7 que no es del digest y la 9) y la 10, que ya se puede; la 4, la
 *   otra mitad de la 7 y la 8 son de los saltos y del digest, y llegan con ellos en el 10a;
 * - la red al reproducir: las cinco etapas congeladas en línea enteras a ×1 y ×4 sin un solo 409 ni
 *   un fotograma esperando un tramo;
 * - un 429 con `retry-after` espera con `Loading` y repite, sin `Connection lost`, y un 409
 *   `beyond_reached` se resuelve informando y pidiendo otra vez.
 *
 * Las cinco etapas son las de B17 en la rápida (las congeladas en línea), no las cinco de §8.3, que
 * llevan la e13 y no la e20: la web no puede construir la línea del adaptador (vive en `apps/api`),
 * así que corren sobre una línea de solo cabeza con la cabeza y los sucesos de la de verdad
 * (`__fixtures__/headTracks.ts`).
 */

const DT = 1 / 60 // un fotograma de pantalla, en s de pared
const FRAMES_PER_INSTANT = 60 / BROADCAST.overlayHz // el instante, a overlayHz (§18.1; nota del 3a)
const LATENCY_S = 0.15 // lo que tarda el servidor de mentira en responder cada petición
const PREVIEW_S = 4 * BROADCAST.previewCardS // los cuatro cuadros de la previa (§8.6)
const ARRIVAL_S = BROADCAST.finishFreezeS // la llegada, hasta el cierre
const CHUNK_DS = BROADCAST.chunkRaceS * 10
const PREFETCH_DS = BROADCAST.prefetchRaceS * 10
const DX = 0.1

const zonesOf = (view: ViewMode) => (view === 'highlights' ? BROADCAST.summaryPace : BROADCAST.pace)
/** La curva del modo sobre los km a meta de la cabeza (§8.2); el digest y su curva son del 10a. */
const ctxOf = (lengthKm: number): PlayerContext => ({
  baseX: (view, _t, toGoKm) => paceAt(toGoKm, zonesOf(view)),
  lengthKm,
  digestNext: null,
})
const floorDs = (s: RaceS): number => Math.floor(s * 10 + 1e-6)

/** Una secuencia de acciones sobre un estado: el último estado y todas las peticiones, en orden. */
function run(s: PlayerState, actions: readonly PlayerAction[], ctx: PlayerContext): PlayerStep {
  let next = s
  const effects: PlayerEffect[] = []
  for (const a of actions) {
    const r = playerStep(next, a, ctx)
    next = r.next
    effects.push(...r.effects)
  }
  return { next, effects }
}

const frame = (dtS: number, toGoKm: number, atLine = false): PlayerAction => ({
  k: 'frame',
  dtS,
  toGoKm,
  atLine,
})
const chunk = (toS: RaceS, atFinish = false): PlayerAction => ({
  k: 'chunk',
  toS,
  atFinish,
  headKmAtEnd: 0,
})

/** Recién empezada: el primer tramo, de 0 a 900 s, ya servido, y la previa acabada. */
function playing(view: ViewMode = 'watch'): PlayerState {
  const ctx = ctxOf(150)
  const init = playerInit(view, 4, null, false)
  return run(init.next, [chunk(BROADCAST.chunkRaceS), { k: 'cardDone' }], ctx).next
}

/** En 480 s de carrera con la cabeza lejos de meta: ya ha informado y pedido el tramo (900, 1380]. */
function asking(view: ViewMode = 'watch'): PlayerState {
  const ctx = ctxOf(150)
  const s = playerStep(playing(view), frame(480 / paceAt(100, zonesOf(view)), 100), ctx).next
  expect(s).toMatchObject({ t: 480, inFlight: true, reportedS: 480 })
  return s
}

// ------------------------------------------------------------------------------------- la entrada

describe('playerInit · la entrada (§8.5, 8-l)', () => {
  it('sin lo alcanzado: la previa en 0 y, por debajo, el primer tramo, sin informe (el servidor admite 900 s desde 0)', () => {
    const { next, effects } = playerInit('watch', 7, null, false)
    expect(next).toMatchObject({
      phase: 'preview',
      view: 'watch',
      speed: 1,
      nextAction: false,
      t: 0,
      reachedS: 0,
      reportedS: 0,
      servedS: 0,
      inFlight: true,
      stageDay: 7,
      loaded: [7],
    })
    expect(effects).toEqual([{ k: 'chunk', fromS: 0, toS: BROADCAST.chunkRaceS }])
  })

  it('la etapa ya conocida se vuelve a ver desde la previa, aunque haya lo alcanzado', () => {
    const { next, effects } = playerInit('watch', 7, 5000, true)
    expect(next.phase).toBe('preview')
    expect(next.t).toBe(0)
    expect(effects).toEqual([{ k: 'chunk', fromS: 0, toS: BROADCAST.chunkRaceS }])
  })

  it('a medias: lo alcanzado menos resumeBackS con Previously, y los tramos desde 0, uno tras otro, hasta pasar lo alcanzado', () => {
    const ctx = ctxOf(150)
    const R = 2000.37
    const init = playerInit('watch', 3, R, false)
    let s = init.next
    expect(s).toMatchObject({ phase: 'recap', reachedS: 2000.3, reportedS: 2000.3 })
    expect(s.t).toBeCloseTo(2000.3 - BROADCAST.resumeBackS, 9)
    const asked: PlayerEffect[] = [...init.effects]
    for (let i = 0; i < 10 && s.inFlight; i++) {
      const last = asked.at(-1)
      if (last?.k !== 'chunk') throw new Error('sin tramo pedido')
      const r = playerStep(s, chunk(last.toS), ctx)
      s = r.next
      asked.push(...r.effects)
    }
    // sin un solo informe: el servidor ya sabe lo alcanzado (la cabecera lo trae de race_watch)
    expect(asked.every((e) => e.k === 'chunk')).toBe(true)
    expect(asked.map((e) => (e.k === 'chunk' ? [e.fromS, e.toS] : null))).toEqual([
      [0, 900],
      [900, 1800],
      [1800, 2700],
    ])
    expect(s.phase).toBe('recap') // el reloj quieto mientras se enseña Previously
    expect(playerStep(s, { k: 'cardDone' }, ctx).next.phase).toBe('playing')
  })
})

// --------------------------------------------------------------------------------------- el reloj

describe('playerStep · el reloj (§8.2)', () => {
  it('corre a paceAt de la zona de la cabeza por la velocidad: ×60 lejos de meta, ×30 entre 50 y 20 km', () => {
    const ctx = ctxOf(150)
    const s = playing()
    expect(s.phase).toBe('playing')
    const a = playerStep(s, frame(1, 100), ctx).next
    expect(a.t).toBeCloseTo(60, 9)
    expect(a.reachedS).toBeCloseTo(60, 9)
    const b = run(a, [{ k: 'speed', x: 2 }, frame(1, 30)], ctx).next
    expect(b.t).toBeCloseTo(60 + 2 * 30, 9)
    const c = run(b, [{ k: 'view', view: 'highlights' }, frame(1, 30)], ctx).next
    expect(c.t).toBeCloseTo(120 + 2 * 120, 9) // Highlights: la misma forma, más deprisa (§8.1)
  })

  it('nunca pasa de lo servido: ahí espera en el último fotograma con Loading', () => {
    const ctx = ctxOf(150)
    const s = run(playing(), [frame(100, 100)], ctx).next // 6.000 s de carrera pedidos, 900 servidos
    expect(s.t).toBe(BROADCAST.chunkRaceS)
    expect(s).toMatchObject({ phase: 'waiting', notice: 'loading', inFlight: true })
    const quieto = run(s, [frame(1, 100), frame(1, 100)], ctx).next
    expect(quieto.t).toBe(s.t) // en waiting el reloj no corre
    const sigue = playerStep(quieto, chunk(1800), ctx).next
    expect(sigue).toMatchObject({ phase: 'playing', notice: null, servedS: 1800 })
  })

  it('solo corre en playing: ni en la previa, ni en pausa, ni en el resumen', () => {
    const ctx = ctxOf(150)
    const init = playerInit('watch', 1, null, false)
    const previa = run(init.next, [chunk(900), frame(1, 100)], ctx).next
    expect(previa.t).toBe(0)
    const pausa = run(playing(), [{ k: 'pause' }, frame(1, 100)], ctx).next
    expect(pausa.phase).toBe('paused')
    expect(pausa.t).toBe(0)
  })

  it('Next action multiplica por nextActionSpeedup hasta que entra un Cue de clase ≥ 2; uno de clase 1 o de la ronda de la moto no lo apaga (6-m)', () => {
    const ctx = ctxOf(150)
    const on = run(playing(), [{ k: 'nextAction' }], ctx).next
    expect(on.nextAction).toBe(true)
    expect(playerStep(on, frame(0.1, 100), ctx).next.t).toBeCloseTo(
      0.1 * 60 * BROADCAST.nextActionSpeedup,
      9,
    )
    const cue = (cls: 0 | 1 | 2 | 3, round: boolean): PlayerAction => ({
      k: 'cueAdmitted',
      cls,
      kind: round ? 'rider' : 'attack',
      round,
    })
    expect(playerStep(on, cue(1, false), ctx).next.nextAction).toBe(true)
    expect(playerStep(on, cue(2, true), ctx).next.nextAction).toBe(true)
    expect(playerStep(on, cue(2, false), ctx).next.nextAction).toBe(false)
    expect(playerStep(on, cue(3, false), ctx).next.nextAction).toBe(false)
  })

  it('los mandos se esconden en playing tras controlsHideS sin tocar, y un toque los enseña (8-p)', () => {
    const ctx = ctxOf(150)
    const quieto = run(playing(), [frame(BROADCAST.controlsHideS, 100)], ctx).next
    expect(controlsHidden(quieto)).toBe(true)
    expect(controlsHidden(playerStep(quieto, { k: 'touch' }, ctx).next)).toBe(false)
    expect(controlsHidden(playerStep(quieto, { k: 'pause' }, ctx).next)).toBe(false)
  })
})

// ------------------------------------------------------------------------------------------ la red

describe('playerStep · la red (§8.5, §10.11, §14.11)', () => {
  it('pide el tramo siguiente con menos de chunkRaceS / 2 servidos por delante, e informa antes si lo informado no deja pedir medio', () => {
    const ctx = ctxOf(150)
    // A 60 s de carrera por fotograma: el que pasa de 450 s pide, con el informe de lo pintado delante.
    let s = playing()
    const effects: PlayerEffect[] = []
    for (let i = 0; i < 8; i++) {
      const r = playerStep(s, frame(1, 100), ctx)
      s = r.next
      effects.push(...r.effects)
    }
    expect(s.t).toBeCloseTo(480, 9)
    expect(effects).toEqual([
      { k: 'report', reachedS: 480, mode: 'play', beacon: false },
      { k: 'chunk', fromS: 900, toS: 1380 },
    ])
    expect(s).toMatchObject({ reportedS: 480, inFlight: true })
  })

  it('Highlights informa con summary (la letra, §8.1)', () => {
    const ctx = ctxOf(150)
    const r = playerStep(playing('highlights'), frame(1.6, 100), ctx) // a ×300, 480 s de carrera
    expect(r.effects[0]).toEqual({ k: 'report', reachedS: 480, mode: 'summary', beacon: false })
  })

  it('cada progressEveryRealS de pared, y al pausar, ocultarse y salir, informa de lo alcanzado; al salir, con beacon', () => {
    const ctx = ctxOf(150)
    const s = run(playing(), [frame(1, 4)], ctx).next // a 4 km de meta, ×4: 4 s de carrera
    const quince = run(s, Array(15).fill(frame(1, 4)) as PlayerAction[], ctx)
    expect(quince.effects).toEqual([{ k: 'report', reachedS: 60, mode: 'play', beacon: false }])
    expect(quince.next.t).toBe(64)
    const sale = run(quince.next, [frame(1, 4), { k: 'leave' }], ctx)
    expect(sale.effects).toEqual([{ k: 'report', reachedS: 68, mode: 'play', beacon: true }])
    expect(sale.next.phase).toBe('paused')
    // sin nada nuevo, no se repite
    expect(playerStep(sale.next, { k: 'hidden' }, ctx).effects).toEqual([])
  })

  it('un 409 beyond_reached se resuelve informando de lo alcanzado y pidiendo otra vez el mismo tramo (§14.11)', () => {
    const ctx = ctxOf(150)
    const s = asking()
    const r = playerStep(s, { k: 'beyond' }, ctx)
    expect(r.effects).toEqual([
      { k: 'report', reachedS: 480, mode: 'play', beacon: false },
      { k: 'chunk', fromS: 900, toS: 1380 },
    ])
    expect(r.next).toMatchObject({ phase: 'playing', inFlight: true, notice: null })
  })

  it('un 429 no es un fallo: el tramo sigue en vuelo, el reloj sigue con lo servido y, si lo alcanza, espera con Loading (14-q)', () => {
    const ctx = ctxOf(150)
    const s = asking()
    const r = playerStep(s, { k: 'throttled', retryAfterS: 30 }, ctx)
    expect(r.next).toEqual(s)
    expect(r.effects).toEqual([])
    const tope = run(r.next, [frame(100, 100), { k: 'throttled', retryAfterS: 30 }], ctx)
    expect(tope.next).toMatchObject({ phase: 'waiting', notice: 'loading', inFlight: true })
    expect(tope.effects).toEqual([]) // no se pide otra vez: lo repite el hook
    expect(playerStep(tope.next, chunk(1380), ctx).next.phase).toBe('playing')
  })

  it('un fallo de red pausa con Connection lost; los fotogramas no piden nada y Retry repite el tramo (D-57)', () => {
    const ctx = ctxOf(150)
    const s = asking()
    const caido = run(s, [{ k: 'failed' }, frame(1, 100), frame(1, 100)], ctx)
    expect(caido.next).toMatchObject({ phase: 'paused', notice: 'offline', inFlight: false })
    expect(caido.effects).toEqual([])
    const otra = playerStep(caido.next, { k: 'retry' }, ctx)
    expect(otra.next).toMatchObject({ phase: 'playing', notice: null, inFlight: true })
    expect(otra.effects).toEqual([{ k: 'chunk', fromS: 900, toS: 1380 }])
  })

  it('failureAction: un 429 con su retry-after, un 409 beyond_reached, y todo lo demás es Connection lost', () => {
    expect(failureAction(new ApiError('x', 429, 'demasiadas_peticiones', 12))).toEqual({
      k: 'throttled',
      retryAfterS: 12,
    })
    expect(failureAction(new ApiError('x', 429, 'demasiadas_peticiones', null))).toEqual({
      k: 'throttled',
      retryAfterS: RETRY_AFTER_FALLBACK_S,
    })
    expect(failureAction(new ApiError('x', 409, 'beyond_reached'))).toEqual({ k: 'beyond' })
    expect(failureAction(new ApiError('x', 409, 'otra_cosa'))).toEqual({ k: 'failed' })
    expect(failureAction(new ApiError('x', 0, 'network'))).toEqual({ k: 'failed' })
    expect(failureAction(new ApiError('x', 503, 'interno'))).toEqual({ k: 'failed' })
    expect(failureAction(new Error('contrato'))).toEqual({ k: 'failed' })
  })
})

// ------------------------------------------------------------------------------------- la línea

describe('playerStep · la línea, la llegada y el cierre (§8.7)', () => {
  /** El tramo pedido llega al borde de la meta (la ruta recorta su toDs a finishDs): la meta, a 1.000 s. */
  const lastIn = (view: ViewMode): PlayerState => {
    const s = playerStep(asking(view), chunk(1000, true), ctxOf(150)).next
    expect(s).toMatchObject({ atFinish: true, inFlight: false, servedS: 1000 })
    return s
  }
  /** …y el reloj, en el borde. */
  const atEdge = (view: ViewMode): PlayerState =>
    playerStep(lastIn(view), frame(1000, 0.5), ctxOf(150)).next

  it('el reloj se para en el borde, una décima antes de la meta', () => {
    const s = atEdge('watch')
    expect(clockCapS(s)).toBe(999.9)
    expect(s.t).toBe(999.9)
    expect(s.phase).toBe('playing')
  })

  it('con la cabeza en su último bloque, informa en el borde (que no es la meta) y pide la meta con el modo de la curva (14-f)', () => {
    const ctx = ctxOf(150)
    for (const view of ['watch', 'highlights'] as const) {
      let s = lastIn(view)
      const r = playerStep(s, frame(DT, 0.05, true), ctx)
      expect(r.effects).toEqual([
        { k: 'report', reachedS: floorDs(s.reachedS) / 10, mode: REPORT_MODE[view], beacon: false },
        { k: 'finish', mode: REPORT_MODE[view] },
      ])
      expect(r.next).toMatchObject({ phase: 'waiting', notice: 'loading', inFlight: true })
      expect(r.next.t).toBe(s.t) // en la línea el reloj ya no corre
      s = r.next
      // solo con BroadcastFinish se llega: la llegada y, tras sus cuadros, el cierre
      const llega = run(s, [{ k: 'finished' }], ctx).next
      expect(llega.phase).toBe('arrival')
      const cierre = run(llega, [{ k: 'cardDone' }, frame(1, 0), { k: 'play' }], ctx)
      expect(cierre.next.phase).toBe('closing')
      expect(cierre.effects).toEqual([])
    }
  })

  it('si la cabeza no llega a su último bloque antes del borde (un sprint que acelera), la línea es el borde: el reloj no se queda colgado', () => {
    const ctx = ctxOf(150)
    const s = atEdge('watch')
    const r = playerStep(s, frame(DT, 0.3, false), ctx)
    expect(r.effects.map((e) => e.k)).toEqual(['report', 'finish'])
    const report = r.effects[0]
    expect(report?.k === 'report' && report.reachedS).toBe(999.9)
  })

  it('sin el último tramo dentro, la cabeza en su último bloque no pide la meta', () => {
    const ctx = ctxOf(150)
    const r = playerStep(playing(), frame(DT, 0.05, true), ctx)
    expect(r.effects.some((e) => e.k === 'finish')).toBe(false)
  })

  it('headAtLine: la cabeza pintada en el último bloque de la línea, que es el tope de su extrapolación', () => {
    const line = { blocks: 1750, dx: 0.1 }
    expect(headAtLine({ headKm: (1749 + 0.5) * 0.1 }, line)).toBe(true)
    expect(headAtLine({ headKm: (1748 + 0.5) * 0.1 }, line)).toBe(false)
  })

  it('una meta que falla pausa con Connection lost; Retry la pide otra vez en el fotograma siguiente', () => {
    const ctx = ctxOf(150)
    const s = run(atEdge('watch'), [frame(DT, 0.05, true), { k: 'failed' }], ctx).next
    expect(s).toMatchObject({ phase: 'paused', notice: 'offline', inFlight: false })
    const r = run(s, [{ k: 'retry' }, frame(DT, 0.05, true)], ctx)
    expect(r.effects.map((e) => e.k)).toEqual(['report', 'finish'])
  })
})

// ----------------------------------------------------------- el hook y el servidor de mentira

/** Una línea de solo cabeza: un grupo con la marca de la cabeza en cada km de foto, y los sucesos a su hora. */
function headLine(track: HeadTrack, withEvents: boolean): TimelineCore {
  const pb = photoBlocksOf(track.lengthKm, DX)
  if (pb.length !== track.headDs.length) throw new Error('el calendario de fotos no casa')
  const stateEvents: StateEvent[] = pb.map((b, k) => ({
    t: 'clock',
    b,
    marks: [[0, track.headDs[k]!]],
  }))
  const events: TimelineEvent[] = withEvents
    ? track.revealDs.map((ds, i) => ({
        source: i,
        plantilla: 'attack_go',
        km: 0,
        tS: fromDs(ds),
        bEmit: 0,
        revealS: fromDs(ds),
        riders: [],
        datos: null,
      }))
    : []
  return {
    format: 1,
    engineVersion: 91,
    dx: DX,
    blocks: track.blocks,
    lengthKm: track.lengthKm,
    timeTrial: false,
    clock: 'estimated',
    riderIds: ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
    groups: [{ id: 'peloton', origin: 'start', bornB: 0, diedB: null, successor: null }],
    keys: [],
    stateEvents,
    events,
    detail: new Map(),
    banners: [],
    profile: { altM: [], climbs: [], sprintsKm: [], laps: 1 },
    tt: null,
  }
}

interface RunOptions {
  readonly events: boolean
  readonly speed: Speed
  readonly nextAction?: boolean
  /** el servidor responde 429 con este retry-after a la n-ésima petición de tramo que le llega (desde 1) */
  readonly throttleAt?: { readonly request: number; readonly retryAfterS: number }
  /** el servidor pierde lo informado (un reinicio de `web`, riesgo 19) antes de la n-ésima petición de tramo */
  readonly restartAt?: number
}

interface StageRun {
  /** la hora pintada en cada fotograma */
  readonly ts: readonly number[]
  readonly finalPhase: PlayerPhase
  /** los tramos que pidió el reproductor, con su intervalo */
  readonly chunkEffects: readonly Extract<PlayerEffect, { k: 'chunk' }>[]
  /** las peticiones de tramo que le llegaron al servidor, con las que repite el hook tras un 429 */
  readonly requests: number
  readonly reports: readonly Extract<PlayerEffect, { k: 'report' }>[]
  readonly conflicts: number
  readonly throttles: number
  /** fotogramas en waiting sin la meta en vuelo: el reloj esperando un tramo */
  readonly waitingForChunk: number
  /** en waiting, siempre con Loading */
  readonly loadingWhileWaiting: boolean
  readonly offline: boolean
  readonly paused: boolean
  readonly finishes: readonly { readonly mode: string; readonly reportBefore: number | null }[]
  /** lo que el reproductor pidió al recibir el 409 */
  readonly afterBeyond: readonly PlayerEffect[]
  /** s de pared de la reproducción: del fin de la previa a la línea */
  readonly playWallS: number
}

/**
 * UNA ETAPA ENTERA, como la vería el dueño: la previa de 20 s (que tapa el primer tramo), el reloj a
 * 60 fotogramas por segundo con el instante a overlayHz sobre la línea servida (`cutTimeline` en lo
 * servido, sin la marca de meta, que ningún tramo lleva), las peticiones en orden a 150 ms cada una
 * (los informes también, como serán desde el 7a), la meta y la llegada. Con sucesos, cada uno entra en
 * la cola a su hora (`cueAdmitted`; la cola de verdad, con sus reglas, es del 6a).
 */
function playStage(name: HeadTrackName, opts: RunOptions): StageRun {
  const track = HEAD_TRACKS[name]
  const line = headLine(track, opts.events)
  const ictx: InstantContext = {
    own: new Set(),
    start: {
      leaders: { gc: null, points: null, kom: null },
      gcTop: [],
      racingAtStart: line.riderIds.length,
    },
    photoBlocks: photoBlocksOf(track.lengthKm, DX),
  }
  const ctx = ctxOf(track.lengthKm)
  const cuts = new Map<number, TimelineCore>()
  const servedLine = (servedS: RaceS): TimelineCore => {
    const ds = Math.min(toDs(servedS), track.finishDs - 1)
    let cut = cuts.get(ds)
    if (cut === undefined) cuts.set(ds, (cut = cutTimeline(line, fromDs(ds))))
    return cut
  }

  const init = playerInit('watch', 1, null, false)
  let s = init.next
  const queue: PlayerEffect[] = [...init.effects]
  const chunkEffects: Extract<PlayerEffect, { k: 'chunk' }>[] = []
  const reports: Extract<PlayerEffect, { k: 'report' }>[] = []
  const finishes: { mode: string; reportBefore: number | null }[] = []
  // lo que cambian las respuestas y los fotogramas, en un objeto: TS no sigue lo que asigna un cierre
  const clock = {
    now: 0,
    lineAt: null as number | null,
    afterBeyond: [] as readonly PlayerEffect[],
  }
  const dispatch = (a: PlayerAction): void => {
    const r = playerStep(s, a, ctx)
    s = r.next
    queue.push(...r.effects)
    for (const e of r.effects) if (e.k === 'chunk') chunkEffects.push(e)
    if (a.k === 'beyond') clock.afterBeyond = r.effects
    // la línea: el fotograma que pide la meta
    if (a.k === 'frame' && r.effects.some((e) => e.k === 'finish')) clock.lineAt ??= clock.now
  }
  for (const e of init.effects) if (e.k === 'chunk') chunkEffects.push(e)
  if (opts.speed !== 1) dispatch({ k: 'speed', x: opts.speed })
  if (opts.nextAction === true) dispatch({ k: 'nextAction' })

  // el servidor (§10.11): lo informado en su memoria, el recorte al borde de la meta y el 409
  let serverReachedS = 0
  let requests = 0
  let conflicts = 0
  let throttles = 0
  let lastReport: number | null = null
  let current: { readonly e: PlayerEffect; readonly doneAt: number } | null = null
  let netFreeAt = 0
  const respond = (e: PlayerEffect, doneAt: number): void => {
    switch (e.k) {
      case 'report':
        serverReachedS = Math.max(serverReachedS, e.reachedS)
        reports.push(e)
        lastReport = e.reachedS
        return
      case 'chunk': {
        requests += 1
        if (opts.restartAt === requests) serverReachedS = 0
        if (opts.throttleAt?.request === requests) {
          throttles += 1
          dispatch({ k: 'throttled', retryAfterS: opts.throttleAt.retryAfterS })
          // el hook repite la misma petición a los retryAfterS de pared (14-q)
          current = { e, doneAt: doneAt + opts.throttleAt.retryAfterS + LATENCY_S }
          return
        }
        const fromD = toDs(e.fromS)
        const toD = toDs(e.toS)
        if (!(toD > fromD && toD - fromD <= CHUNK_DS)) throw new Error(`400: (${fromD}, ${toD}]`)
        const clamped = Math.min(toD, track.finishDs)
        if (clamped > (serverReachedS + BROADCAST.prefetchRaceS) * 10) {
          conflicts += 1
          dispatch({ k: 'beyond' })
          return
        }
        const toS = fromDs(clamped)
        dispatch({
          k: 'chunk',
          toS,
          atFinish: clamped >= track.finishDs - 1,
          headKmAtEnd: instantAt(servedLine(toS), toS, ictx).headKm,
        })
        return
      }
      case 'finish':
        finishes.push({ mode: e.mode, reportBefore: lastReport })
        dispatch({ k: 'finished' })
        return
      default:
        throw new Error(`petición inesperada: ${e.k}`)
    }
  }

  const ts: number[] = []
  let waitingForChunk = 0
  let loadingWhileWaiting = true
  let offline = false
  let paused = false
  let playFrom: number | null = null
  let arrivalAt: number | null = null
  let nextEvent = 0
  let instant = instantAt(servedLine(0), 0, ictx)
  const maxFrames = 60 * 3600
  for (let f = 1; f <= maxFrames; f++) {
    const wall = f * DT
    clock.now = wall
    // 1. La red: lo que ya ha respondido, en orden; cada petición sale tras la anterior.
    for (;;) {
      if (current === null) {
        const e = queue.shift()
        if (e === undefined) break
        current = { e, doneAt: Math.max(netFreeAt, wall - DT) + LATENCY_S }
      }
      if (current.doneAt > wall) break
      const { e, doneAt } = current
      current = null
      netFreeAt = doneAt
      respond(e, doneAt)
    }
    // 2. Los cuadros: la previa y la llegada pasan solas.
    if (s.phase === 'preview' && wall >= PREVIEW_S) {
      dispatch({ k: 'cardDone' })
      playFrom = wall
    }
    if (s.phase === 'arrival') {
      arrivalAt ??= wall
      if (wall >= arrivalAt + ARRIVAL_S) dispatch({ k: 'cardDone' })
    }
    if (s.phase === 'closing') break
    // 3. El instante, a overlayHz, sobre la línea servida; el fotograma, con sus km a meta.
    if (f % FRAMES_PER_INSTANT === 0) instant = instantAt(servedLine(s.servedS), s.t, ictx)
    dispatch({
      k: 'frame',
      dtS: DT,
      toGoKm: instant.toGoKm,
      atLine: headAtLine(instant, line),
    })
    // 4. Con sucesos, la cola los admite a su hora (los de la meta no van en ningún tramo).
    if (opts.events)
      while (
        nextEvent < track.revealDs.length &&
        track.revealDs[nextEvent]! <= toDs(s.t) &&
        track.revealDs[nextEvent]! < track.finishDs
      ) {
        dispatch({ k: 'cueAdmitted', cls: 2, kind: 'attack', round: false })
        nextEvent += 1
      }
    if (s.phase === 'waiting') {
      if (!(s.atFinish && s.inFlight)) waitingForChunk += 1
      if (s.notice !== 'loading') loadingWhileWaiting = false
    }
    if (s.notice === 'offline') offline = true
    if (s.phase === 'paused') paused = true
    ts.push(s.t)
  }
  return {
    ts,
    finalPhase: s.phase,
    chunkEffects,
    requests,
    reports,
    conflicts,
    throttles,
    waitingForChunk,
    loadingWhileWaiting,
    offline,
    paused,
    finishes,
    afterBeyond: clock.afterBeyond,
    playWallS: clock.lineAt === null || playFrom === null ? Number.NaN : clock.lineAt - playFrom,
  }
}

const NAMES = Object.keys(HEAD_TRACKS) as HeadTrackName[]
const runs = new Map<string, StageRun>()
/** Cada etapa se reproduce una vez por combinación y la usan todos los casos. */
function played(name: HeadTrackName, opts: RunOptions): StageRun {
  const key = `${name}|${JSON.stringify(opts)}`
  let r = runs.get(key)
  if (r === undefined) runs.set(key, (r = playStage(name, opts)))
  return r
}

// ------------------------------------------------------------------------- B9: el ritmo (§4.6)

describe('B9 · el ritmo no lee los sucesos: la misma t fotograma a fotograma, con ellos y sin ellos (§8.12)', () => {
  it.each(NAMES)(
    '%s, a 60 fotogramas por segundo y con Next action apagado',
    (name) => {
      const con = played(name, { events: true, speed: 1 })
      const sin = played(name, { events: false, speed: 1 })
      expect(con.finalPhase).toBe('closing')
      expect(con.ts.length).toBeGreaterThan(60 * 300)
      expect(con.ts).toEqual(sin.ts)
    },
    60_000,
  )

  it('y la prueba no es vacía: con Next action encendido, los sucesos sí cambian la hora, porque lo apagan', () => {
    const con = played('race-france-e7', { events: true, speed: 1, nextAction: true })
    const sin = played('race-france-e7', { events: false, speed: 1, nextAction: true })
    expect(con.ts).not.toEqual(sin.ts)
    expect(sin.ts.length).toBeLessThan(con.ts.length) // sin nada que lo apague, ×20 hasta el final
  })
})

// ------------------------------------------------------------------- la red al reproducir (8-d)

describe('la red al reproducir (8-d): las cinco etapas enteras sin un solo 409 ni un fotograma esperando un tramo', () => {
  const B17_WATCH_S = [360, 1320] // la banda de Watch de 8-k, en s de pared (§8.9)

  it.each(NAMES.flatMap((n) => [1, 4].map((x) => [n, x] as const)))(
    '%s a ×%i',
    (name, x) => {
      const r = played(name, { events: false, speed: x as Speed })
      const finishS = HEAD_TRACKS[name].finishDs / 10
      expect(r.finalPhase).toBe('closing')
      expect(r.conflicts).toBe(0)
      expect(r.waitingForChunk).toBe(0) // el colchón (450 s de carrera a ×60·4 son 1,9 s) le gana a los 0,3 s
      expect(r.offline || r.paused).toBe(false)
      // la meta, una vez, con el modo de Watch; el informe justo antes es el borde, no la meta (§8.7)
      expect(r.finishes).toEqual([{ mode: 'play', reportBefore: expect.any(Number) as number }])
      expect(r.finishes[0]!.reportBefore!).toBeLessThan(finishS)
      expect(r.reports.every((rep) => rep.reachedS < finishS && rep.mode === 'play')).toBe(true)
      // cada tramo, de medio a uno entero: lo que deja pedir lo informado (§8.5)
      for (const c of r.chunkEffects) {
        expect(c.toS - c.fromS).toBeGreaterThanOrEqual(BROADCAST.chunkRaceS / 2)
        expect(c.toS - c.fromS).toBeLessThanOrEqual(BROADCAST.chunkRaceS)
      }
      expect(r.requests).toBe(r.chunkEffects.length)
      // la duración de la reproducción, dentro de la banda de B17 a ×1 y un cuarto a ×4
      expect(r.playWallS * x).toBeGreaterThanOrEqual(B17_WATCH_S[0]!)
      expect(r.playWallS * x).toBeLessThanOrEqual(B17_WATCH_S[1]!)
    },
    60_000,
  )

  it('un 429 con retry-after: el reloj espera con Loading lo que dice y el hook repite; nunca Connection lost (14-q)', () => {
    const r = played('race-france-e7', {
      events: false,
      speed: 1,
      throttleAt: { request: 3, retryAfterS: 30 },
    })
    expect(r.throttles).toBe(1)
    expect(r.waitingForChunk).toBeGreaterThan(60 * 10) // más de 10 s esperando: los 7,5 de colchón no cubren 30
    expect(r.loadingWhileWaiting).toBe(true)
    expect(r.offline || r.paused).toBe(false)
    expect(r.requests).toBe(r.chunkEffects.length + 1) // la repetida es del hook: el reproductor no pidió otra
    expect(r.conflicts).toBe(0)
    expect(r.finalPhase).toBe('closing')
  })

  it('un 409 beyond_reached tras un reinicio del servidor: informa de lo alcanzado, pide otra vez y sigue (§14.11)', () => {
    const r = played('race-france-e7', { events: false, speed: 1, restartAt: 5 })
    expect(r.conflicts).toBe(1)
    expect(r.afterBeyond.map((e) => e.k)).toEqual(['report', 'chunk'])
    expect(r.offline || r.paused).toBe(false)
    expect(r.finalPhase).toBe('closing')
  })
})

// ----------------------------------------------- las comprobaciones de §8.11, al azar (§8.12)

const KINDS: readonly CueKind[] = ['attack', 'break_formed', 'rider', 'crash', 'last_km', 'caught']
const VIEWS: readonly ViewMode[] = ['watch', 'highlights', 'digest']

/**
 * UNA SECUENCIA AL AZAR de 300 pasos sobre una etapa sintética (la cabeza a velocidad constante): los
 * mandos, los fotogramas (a veces de varios segundos, a veces con una cabeza en la línea que no lo
 * está), las respuestas del servidor a lo que se pidió (un tramo o su 409, un 429, un fallo, la meta)
 * y respuestas que nadie pidió. Tras cada paso, las comprobaciones de §8.11 que el 3b puede hacer.
 * `restarts`: el servidor pierde a veces lo informado, y entonces el 409 salta y se resuelve.
 */
/** Lo que una secuencia llegó a ver: la cláusula de no vacío de las comprobaciones (como 17-u). */
interface Coverage {
  /** pasos en que se pidió la meta, y en cuántos fue por el reloj en el borde y no por la cabeza */
  finishes: number
  byEdge: number
  arrivals: number
  closings: number
  /** 409 resueltos con su informe y su tramo */
  conflicts: number
  /** 429 con el reloj ya esperando un tramo */
  throttledWaiting: number
  offline: number
  retried: number
  resumed: number
  roundsKept: number
}
const emptyCoverage = (): Coverage => ({
  finishes: 0,
  byEdge: 0,
  arrivals: 0,
  closings: 0,
  conflicts: 0,
  throttledWaiting: 0,
  offline: 0,
  retried: 0,
  resumed: 0,
  roundsKept: 0,
})

function randomSequence(seed: string, restarts: boolean, cov: Coverage): void {
  const rng = seededRng(seed)
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!
  const finishDs = 10 * (1200 + Math.floor(rng() * 4800))
  const finishS = finishDs / 10
  const lengthKm = Math.round((20 + rng() * 180) * 10) / 10
  const blocks = Math.round(lengthKm / DX)
  const lineKm = (blocks - 0.5) * DX
  // con un sprint que acelera, la cabeza extrapolada no llega a su último bloque antes del borde
  const shortKm = rng() < 0.3 ? 0.3 : 0
  const headKm = (t: RaceS): number => Math.min(lineKm, (t / finishS) * (lengthKm - shortKm))
  const ctx = ctxOf(lengthKm)
  const resumeAt = rng() < 0.2 ? Math.floor(rng() * finishS * 0.8) : null
  const init = playerInit(rng() < 0.25 ? 'highlights' : 'watch', 1, resumeAt, false)
  if (init.next.phase === 'recap') cov.resumed += 1
  let s = init.next
  const queue: PlayerEffect[] = [...init.effects]
  let server = resumeAt ?? 0
  let conflicts = 0
  let finished = false
  const pending = (): boolean => queue.some((e) => e.k === 'chunk' || e.k === 'finish')

  for (let i = 0; i < 300; i++) {
    // los informes salen en cuanto les toca, y el servidor los guarda en su memoria
    while (queue[0]?.k === 'report') {
      const rep = queue.shift()
      if (rep?.k === 'report') server = Math.max(server, rep.reachedS)
    }
    const head = queue[0]
    let a: PlayerAction
    let unsolicited = false
    const roll = rng()
    if (roll < 0.25 && head !== undefined) {
      // la respuesta a lo que se pidió
      const r = rng()
      if (r < 0.1) {
        queue.shift()
        a = { k: 'failed' }
      } else if (r < 0.2) a = { k: 'throttled', retryAfterS: 1 + Math.floor(rng() * 60) }
      else if (head.k === 'chunk') {
        queue.shift()
        if (restarts && rng() < 0.15) server = Math.max(0, server - 60 - rng() * 900)
        const clamped = Math.min(toDs(head.toS), finishDs)
        if (clamped > (server + BROADCAST.prefetchRaceS) * 10) {
          conflicts += 1
          a = { k: 'beyond' }
        } else
          a = {
            k: 'chunk',
            toS: fromDs(clamped),
            atFinish: clamped >= finishDs - 1,
            headKmAtEnd: 0,
          }
      } else {
        queue.shift()
        a = { k: 'finished' }
      }
    } else if (roll < 0.28 && !pending()) {
      // una respuesta que nadie pidió: no cambia nada
      unsolicited = true
      a = pick<PlayerAction>([
        { k: 'chunk', toS: s.servedS + rng() * 5000, atFinish: rng() < 0.5, headKmAtEnd: 0 },
        { k: 'finished' },
        { k: 'failed' },
        { k: 'beyond' },
        { k: 'throttled', retryAfterS: 3 },
      ])
    } else if (roll < 0.65) {
      const dtS = rng() < 0.6 ? DT : rng() * 3
      a = {
        k: 'frame',
        dtS,
        toGoKm: lengthKm - headKm(s.t),
        atLine: headKm(s.t) >= lineKm - 1e-9 || rng() < 0.02,
      }
    } else {
      a = pick<PlayerAction>([
        { k: 'play' },
        { k: 'pause' },
        { k: 'hidden' },
        { k: 'leave' },
        { k: 'retry' },
        { k: 'touch' },
        { k: 'speed', x: pick(BROADCAST.speeds) },
        { k: 'view', view: pick(VIEWS) },
        { k: 'nextAction' },
        {
          k: 'cueAdmitted',
          cls: pick([0, 1, 2, 3] as const),
          kind: pick(KINDS),
          round: rng() < 0.3,
        },
        { k: 'cardDone' },
        { k: 'cardDone' },
        { k: 'seek', km: rng() * lengthKm, headKmAtEnd: headKm(s.servedS) },
        { k: 'back', toS: rng() * s.t },
        { k: 'landed', toS: s.t, skipped: 0 },
        { k: 'showResult' },
      ])
    }

    const s0 = s
    const r = playerStep(s0, a, ctx)
    const s1 = r.next
    s = s1
    queue.push(...r.effects)
    if (a.k === 'finished' && s1.phase === 'arrival') finished = true
    if (r.effects.some((e) => e.k === 'finish')) {
      cov.finishes += 1
      if (a.k === 'frame' && !a.atLine) cov.byEdge += 1
    }
    if (s1.phase === 'arrival' && s0.phase !== 'arrival') cov.arrivals += 1
    if (s1.phase === 'closing' && s0.phase !== 'closing') cov.closings += 1
    if (a.k === 'beyond' && r.effects.map((e) => e.k).join() === 'report,chunk') cov.conflicts += 1
    if (a.k === 'throttled' && s0.phase === 'waiting') cov.throttledWaiting += 1
    if (s1.notice === 'offline' && s0.notice !== 'offline') cov.offline += 1
    if (a.k === 'retry' && s0.notice === 'offline') cov.retried += 1
    if (a.k === 'cueAdmitted' && a.round && s0.nextAction) cov.roundsKept += 1

    const fail = (msg: string): never => {
      throw new Error(
        `${seed}, paso ${i}: ${msg}\n${JSON.stringify({ a, s0, s1, effects: r.effects })}`,
      )
    }
    if (unsolicited && (r.effects.length > 0 || JSON.stringify(s1) !== JSON.stringify(s0)))
      fail('una respuesta que nadie pidió cambia el estado')
    // 1. lo alcanzado no baja, y t ≤ servedS (y en el 3b, sin saltos atrás, t tampoco baja). Con una
    //    salvedad: al volver a una etapa a medias, `Previously` se enseña en la hora a la que se vuelve
    //    mientras llegan los tramos desde 0; ahí t pasa de lo servido, pero el reloj no corre (ni en
    //    playing está) hasta tener carrera servida por delante.
    if (s1.reachedS < s0.reachedS) fail('lo alcanzado baja')
    if (s1.t > s1.servedS && !(resumeAt !== null && s1.t === init.next.t))
      fail('t pasa de lo servido')
    if (s1.t > s1.servedS && s1.phase === 'playing') fail('playing sin carrera servida')
    if (s1.t < s0.t) fail('t baja')
    // 2. nada servido ni pedido pasa de lo informado más prefetchRaceS; cada tramo, de 450 a 900 s
    if (toDs(s1.servedS) > floorDs(s1.reportedS) + PREFETCH_DS)
      fail('servido más allá de lo admitido')
    for (const e of r.effects) {
      if (e.k !== 'chunk') continue
      if (toDs(e.fromS) !== toDs(s1.servedS)) fail('el tramo no empieza en lo servido')
      if (toDs(e.toS) > floorDs(s1.reportedS) + PREFETCH_DS) fail('tramo más allá de lo informado')
      const w = toDs(e.toS) - toDs(e.fromS)
      if (w < CHUNK_DS / 2 || w > CHUNK_DS) fail(`tramo de ${w} décimas`)
    }
    // 3. t solo avanza en playing, con un fotograma
    if (s1.t > s0.t && !(a.k === 'frame' && s0.phase === 'playing'))
      fail('t avanza fuera de playing')
    // 5 y 6. la meta solo con el último tramo y la cabeza en la línea (o el reloj en el borde), con el
    //    modo de la curva, y tras el informe del borde, que no es la meta
    const fi = r.effects.findIndex((e) => e.k === 'finish')
    if (fi >= 0) {
      const fin = r.effects[fi]!
      const rep = r.effects[fi - 1]
      if (a.k !== 'frame' || !s0.atFinish || !(a.atLine || s0.t >= clockCapS(s0)))
        fail('meta sin la línea')
      if (fin.k === 'finish' && fin.mode !== REPORT_MODE[s0.view]) fail('meta con otro modo')
      if (rep?.k !== 'report' || rep.reachedS > clockCapS(s0) || rep.reachedS >= finishS)
        fail('sin el informe del borde, o un informe en la meta')
    }
    for (const e of r.effects)
      if (e.k === 'report' && e.reachedS >= finishS) fail('informe en la meta')
    if ((s1.phase === 'arrival' || s1.phase === 'closing') && !finished) fail('llegada sin la meta')
    // 7. desde la llegada y el cierre no se pide nada, y en Watch y Highlights no hay otra etapa
    if ((s0.phase === 'arrival' || s0.phase === 'closing') && r.effects.length > 0)
      fail('peticiones tras la meta')
    if (s1.stageDay !== 1 || s1.loaded.length !== 1 || s1.loaded[0] !== 1) fail('otra etapa')
    // 9. la ronda de la moto no apaga Next action; un 429 no pausa ni da Connection lost
    if (a.k === 'cueAdmitted' && a.round && s1.nextAction !== s0.nextAction)
      fail('la ronda apaga Next action')
    if (a.k === 'throttled' && (s1.phase !== s0.phase || s1.notice !== s0.notice))
      fail('un 429 cambia la fase')
    if (s1.phase === 'waiting' && (s1.notice !== 'loading' || !s1.inFlight))
      fail('waiting sin Loading o sin nada en vuelo')
    if (s1.notice === 'offline' && (s1.phase !== 'paused' || s1.inFlight))
      fail('Connection lost fuera de la pausa')
    // 10. un toque enseña los mandos, y solo se esconden en playing
    if (a.k === 'touch' && s1.idleS !== 0) fail('el toque no pone idleS a 0')
    if (controlsHidden(s1) && s1.phase !== 'playing') fail('mandos escondidos fuera de playing')
    // el hook y el reductor ven lo mismo en vuelo
    if (s1.inFlight !== pending()) fail('inFlight no casa con lo pedido')
    if (!(BROADCAST.speeds as readonly number[]).includes(s1.speed))
      fail('velocidad fuera de las cuatro')
  }
  if (!restarts && conflicts > 0) throw new Error(`${seed}: ${conflicts} 409 sin reinicio`)
}

describe('las comprobaciones de §8.11, en cada paso de 1.000 secuencias al azar (§8.12)', () => {
  it('1, 2, 3, 5, 6, 7 (Watch y Highlights), 9 y 10; sin reinicios del servidor, ni un 409', () => {
    const cov = emptyCoverage()
    for (let n = 0; n < 1000; n++) randomSequence(`reproductor:${n}`, n % 4 === 3, cov)
    // y no es vacía: las secuencias llegan a lo que las comprobaciones vigilan
    expect(cov.finishes).toBeGreaterThan(100)
    expect(cov.byEdge).toBeGreaterThan(20)
    expect(cov.arrivals).toBeGreaterThan(50)
    expect(cov.closings).toBeGreaterThan(20)
    expect(cov.conflicts).toBeGreaterThan(20)
    expect(cov.throttledWaiting).toBeGreaterThan(20)
    expect(cov.offline).toBeGreaterThan(100)
    expect(cov.retried).toBeGreaterThan(20)
    expect(cov.resumed).toBeGreaterThan(100)
    expect(cov.roundsKept).toBeGreaterThan(10)
  })

  it.todo(
    '4 · un salto aterriza como mucho en lengthKm − 1, no pide la meta ni informa de ella con seek (10a)',
  )
  it.todo('7 · en el digest, speed 1 y nextAction falso (10a)')
  it.todo(
    '8 · en el digest, release de la k − 1 al empezar la k + 1, y loaded con dos etapas como mucho (10a)',
  )
})
