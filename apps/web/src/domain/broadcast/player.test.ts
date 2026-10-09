/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  BROADCAST,
  type Cue,
  type CueKind,
  type Instant,
  type InstantContext,
  type RaceS,
  type StageKind,
  type StageTimeline,
  type StateEvent,
  type TimelineCore,
  type TimelineEvent,
  cueClassOf,
  cutTimeline,
  decodeTimeline,
  digestPace,
  fromDs,
  instantAt,
  paceAt,
  photoBlocksOf,
  riderCardsOf,
  seededRng,
  startStateOf,
  timeTrialInstantAt,
  toDs,
  ttLastKmFromS,
  ttPaceAt,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/request'
import { HEAD_TRACKS, type HeadTrack, type HeadTrackName } from './__fixtures__/headTracks'
import {
  type CueDeck,
  type CueDeckContext,
  type PlayerAction,
  type PlayerContext,
  type PlayerEffect,
  type PlayerPhase,
  type PlayerState,
  type PlayerStep,
  REPORT_MODE,
  RETRY_AFTER_FALLBACK_S,
  type RoadJump,
  type Speed,
  type ViewMode,
  clockCapS,
  controlsHidden,
  cueDeckInit,
  cueDeckSeat,
  cueDeckStep,
  failureAction,
  headAtLine,
  playerInit,
  playerStep,
  recapOf,
  seekTargetKm,
  ttCandidatesOf,
  ttSeekTargetS,
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
 *   otra mitad de la 7 y la 8 son de los saltos y del digest, y llegan con ellos en el 10a. La 1 con
 *   una salvedad: bajo `Previously`, al volver a una etapa a medias, t pasa de lo servido mientras
 *   llegan los tramos desde 0, y lo que se exige es que el reloj no corra sin carrera servida;
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

const zonesOf = (view: ViewMode) => (view === 'watch' ? BROADCAST.pace : BROADCAST.summaryPace)
/**
 * La curva del modo sobre los km a meta de la cabeza (§8.2). El digest, aquí, con la de `Highlights`: su
 * curva de verdad (`digestPace`) es esa escalada por etapa, y la de una línea de solo cabeza no tiene
 * perfil con que escalarla; los casos del digest que miran su duración usan la línea grabada.
 */
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
    const resumen = playerInit('watch', 1, 2000, false)
    const quieto = run(resumen.next, [chunk(900), chunk(1800), chunk(2700), frame(1, 100)], ctx)
    expect(quieto.next.phase).toBe('recap')
    expect(quieto.next.t).toBe(resumen.next.t)
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

  it('Next action se apaga al entrar un rótulo de clase ≥ 2 o el del último km, y vuelve la velocidad de antes; desde el último km no se enciende', () => {
    const ctx = ctxOf(150)
    const on = run(playing(), [{ k: 'speed', x: 2 }, { k: 'nextAction' }], ctx).next
    expect(on.nextAction).toBe(true)
    const off = playerStep(on, { k: 'cueAdmitted', cls: 2, kind: 'attack', round: false }, ctx).next
    expect(off).toMatchObject({ nextAction: false, speed: 2 })
    const flamme = playerStep(on, { k: 'cueAdmitted', cls: 1, kind: 'last_km', round: false }, ctx)
    expect(flamme.next.nextAction).toBe(false)
    // en el último km el fotograma lo apaga, y el mando no lo enciende
    const last = playerStep(on, frame(DT, 0.9), ctx).next
    expect(last).toMatchObject({ nextAction: false, lastKm: true })
    expect(playerStep(last, { k: 'nextAction' }, ctx).next.nextAction).toBe(false)
    // y un salto de recorrido desde ahí no lleva a ninguna parte (8-j)
    expect(playerStep(last, { k: 'seek', km: 149, headKmAtEnd: 149.5 }, ctx).next).toBe(last)
  })

  it('los mandos se esconden en playing tras controlsHideS sin tocar; un toque los enseña; en pausa, el resumen, la previa y el cierre, no', () => {
    const ctx = ctxOf(150)
    const quiet = Array(Math.ceil(BROADCAST.controlsHideS * 60) + 1).fill(
      frame(DT, 100),
    ) as PlayerAction[]
    const playingQuiet = run(playing(), quiet, ctx).next
    expect(controlsHidden(playingQuiet)).toBe(true)
    expect(controlsHidden(playerStep(playingQuiet, { k: 'touch' }, ctx).next)).toBe(false)
    const paused = run(playing(), [{ k: 'pause' }, ...quiet], ctx).next
    expect(controlsHidden(paused)).toBe(false)
    const preview = run(playerInit('watch', 1, null, false).next, quiet, ctx).next
    expect(preview.phase).toBe('preview')
    expect(controlsHidden(preview)).toBe(false)
    const recap = run(playerInit('watch', 1, 2000, false).next, quiet, ctx).next
    expect(recap.phase).toBe('recap')
    expect(controlsHidden(recap)).toBe(false)
    expect(controlsHidden({ ...playingQuiet, phase: 'closing' })).toBe(false)
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

  it('si la cabeza no llega a su último bloque antes del borde (no frena en el último km, como en la e7, la e20 y Colombia e5), la línea es el borde: el reloj no se queda colgado', () => {
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
  // cada suceso, un ataque que cuaja (`attack_sticks`, un ATTACK de clase 2): la cola más cargada
  const events: TimelineEvent[] = withEvents
    ? track.revealDs.map((ds, i) => ({
        source: i,
        plantilla: 'attack_sticks',
        km: 0,
        tS: fromDs(ds),
        bEmit: 0,
        revealS: fromDs(ds),
        riders: [i % 8],
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
  /** la curva; `watch` si no se dice (10a: `Highlights`) */
  readonly view?: ViewMode
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
  /** la cola de rótulos (6a): lo admitido, los fotogramas con un rótulo en pantalla y con la cola llena */
  readonly admitted: number
  readonly framesWithCue: number
  readonly framesFullQueue: number
  /** fotogramas con un rótulo en pantalla en que la hora avanzó */
  readonly framesCueAndClock: number
}

/**
 * UNA ETAPA ENTERA, como la vería el dueño: la previa de 20 s (que tapa el primer tramo), el reloj a
 * 60 fotogramas por segundo con el instante a overlayHz sobre la línea servida (`cutTimeline` en lo
 * servido, sin la marca de meta, que ningún tramo lleva), las peticiones en orden a 150 ms cada una
 * (los informes también, como serán desde el 7a), la meta y la llegada. Con sucesos, la cola de rótulos
 * de verdad (6a): en cada fotograma, `cueDeckStep` con el instante que se pinta y la línea servida, y lo
 * que admite, al reductor (`cueAdmitted`), como hace el hook de `StageWatch.tsx`.
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

  const init = playerInit(opts.view ?? 'watch', 1, null, false)
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
  let deck: CueDeck = cueDeckInit(ictx.start)
  let admitted = 0
  let framesWithCue = 0
  let framesFullQueue = 0
  let framesCueAndClock = 0
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
    // 3. El instante, a overlayHz, sobre la línea servida.
    if (f % FRAMES_PER_INSTANT === 0) instant = instantAt(servedLine(s.servedS), s.t, ictx)
    // 4. Con sucesos, la cola de rótulos con ese instante; lo admitido, al reductor (6a).
    if (opts.events) {
      const served = servedLine(s.servedS)
      const deckCtx: CueDeckContext = {
        start: ictx.start,
        timeTrial: false,
        events: served.events,
        catalog: served.groups,
      }
      const step = cueDeckStep(deck, instant, DT, s.phase === 'playing', deckCtx)
      deck = step.deck
      for (const a of step.admitted) dispatch(a)
      admitted += step.admitted.length
      if (deck.queue.waiting.length >= BROADCAST.cueQueueMax) framesFullQueue += 1
    }
    // 5. El fotograma, con sus km a meta.
    const before = s.t
    dispatch({
      k: 'frame',
      dtS: DT,
      toGoKm: instant.toGoKm,
      atLine: headAtLine(instant, line),
    })
    if (deck.queue.shown !== null) {
      framesWithCue += 1
      if (s.t > before) framesCueAndClock += 1
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
    admitted,
    framesWithCue,
    framesFullQueue,
    framesCueAndClock,
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

describe('__fixtures__/headTracks.ts · la cabeza volcada de las congeladas', () => {
  it.each(NAMES)(
    '%s: una marca por km de foto, que no baja y acaba en la meta de su línea',
    (name) => {
      const track = HEAD_TRACKS[name]
      expect(track.blocks).toBe(Math.round(track.lengthKm / DX))
      expect(track.headDs).toHaveLength(photoBlocksOf(track.lengthKm, DX).length)
      for (let i = 1; i < track.headDs.length; i++)
        expect(track.headDs[i]!).toBeGreaterThanOrEqual(track.headDs[i - 1]!)
      expect(track.headDs.at(-1)).toBe(track.finishDs)
      expect(visibilityOf(headLine(track, true)).finishDs).toBe(track.finishDs)
      expect(track.revealDs.length).toBeGreaterThan(0)
    },
  )
})

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

// --------------------------------------------------------- la cola de rótulos (§6.5, D-21; 6a)

describe('la cola de rótulos no para el reloj (D-21; 6a)', () => {
  it.each(NAMES)(
    '%s: con un rótulo en pantalla y con la cola llena, la hora avanza igual que sin sucesos',
    (name) => {
      const con = played(name, { events: true, speed: 1 })
      const sin = played(name, { events: false, speed: 1 })
      expect(con.admitted).toBeGreaterThan(0)
      expect(con.framesWithCue).toBeGreaterThan(0)
      expect(con.framesCueAndClock).toBeGreaterThan(0)
      expect(con.ts).toEqual(sin.ts)
    },
    60_000,
  )

  it('y la cola se llena de verdad en alguna de las cinco: el reloj no la mira', () => {
    const full = NAMES.map((name) => played(name, { events: true, speed: 1 }).framesFullQueue)
    expect(Math.max(...full)).toBeGreaterThan(0)
  })
})

describe('cueDeckStep · la cola de rótulos del reproductor, paso a paso (§6.5, 6-h, 6-i)', () => {
  const track = HEAD_TRACKS['race-france-e7']
  /** La cabeza de la e7 con estos sucesos, cada uno con su índice como `source`. */
  const lineWith = (events: readonly Omit<TimelineEvent, 'source'>[]): TimelineCore => ({
    ...headLine(track, false),
    events: events.map((e, i) => ({ ...e, source: i })),
  })
  const ictx: InstantContext = {
    own: new Set(),
    start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 8 },
    photoBlocks: photoBlocksOf(track.lengthKm, DX),
  }
  const deckCtx = (line: TimelineCore): CueDeckContext => ({
    start: ictx.start,
    timeTrial: false,
    events: line.events,
    catalog: line.groups,
  })
  const event = (
    plantilla: string,
    revealS: number,
    riders: number[],
  ): Omit<TimelineEvent, 'source'> => ({
    plantilla,
    km: 1,
    tS: revealS,
    bEmit: 10,
    revealS,
    riders,
    datos: null,
  })

  it('el primer instante solo se apunta; después, los rótulos revelados entre el anterior y este', () => {
    const line = lineWith([event('attack_sticks', 100, [0]), event('attack_go', 120, [1])])
    const at = (t: number) => instantAt(line, t, ictx)
    // se entra a mitad (Previously): lo de antes no sale en rótulos
    const first = cueDeckStep(cueDeckInit(ictx.start), at(150), DT, true, deckCtx(line))
    expect(first.admitted).toEqual([])
    expect(first.deck.queue).toEqual({ waiting: [], shown: null })
    const line2 = lineWith([event('attack_sticks', 200, [0]), event('attack_go', 220, [1])])
    const at2 = (t: number) => instantAt(line2, t, ictx)
    let deck = cueDeckStep(cueDeckInit(ictx.start), at2(150), DT, true, deckCtx(line2)).deck
    const r = cueDeckStep(deck, at2(250), DT, true, deckCtx(line2))
    // attack_go es solo voz (§6.6); attack_sticks, un ATTACK de clase 2, en pantalla enseguida
    expect(r.admitted).toEqual([{ k: 'cueAdmitted', cls: 2, kind: 'attack', round: false }])
    expect(r.deck.queue.shown?.cue).toMatchObject({ kind: 'attack', t: 200, riders: [0] })
    // el mismo instante otra vez no vuelve a dar nada
    deck = r.deck
    expect(cueDeckStep(deck, at2(250), DT, true, deckCtx(line2)).admitted).toEqual([])
  })

  it('en pausa la hora de la cola no corre: el rótulo sigue en pantalla hasta que la carrera vuelve', () => {
    const line = lineWith([event('attack_sticks', 200, [0])])
    const at = (t: number) => instantAt(line, t, ictx)
    let deck = cueDeckStep(cueDeckInit(ictx.start), at(150), DT, true, deckCtx(line)).deck
    const now = at(250)
    deck = cueDeckStep(deck, now, DT, true, deckCtx(line)).deck
    const shown = deck.queue.shown
    expect(shown).not.toBeNull()
    for (let i = 0; i < 600; i++) deck = cueDeckStep(deck, now, DT, false, deckCtx(line)).deck
    expect(deck.queue.shown).toBe(shown)
    for (let i = 0; i < 60 * (BROADCAST.cueHoldS[2] + 1); i++)
      deck = cueDeckStep(deck, now, DT, true, deckCtx(line)).deck
    expect(deck.queue.shown).toBeNull()
  })

  it('la caída: primero CRASH sin nombres y, crashNamesDelayS de pared después, con ellos (D-13)', () => {
    const line = lineWith([event('crash', 200, [1, 2])])
    const at = (t: number) => instantAt(line, t, ictx)
    let deck = cueDeckStep(cueDeckInit(ictx.start), at(150), DT, true, deckCtx(line)).deck
    const now = at(250)
    const r = cueDeckStep(deck, now, DT, true, deckCtx(line))
    expect(r.admitted.map((a) => a.kind)).toEqual(['crash'])
    expect(r.deck.queue.shown?.cue).toMatchObject({ kind: 'crash', riders: null })
    deck = r.deck
    const names: number[] = []
    for (let f = 1; f <= 60 * 12; f++) {
      const x = cueDeckStep(deck, now, DT, true, deckCtx(line))
      deck = x.deck
      if (x.admitted.length > 0) names.push(f * DT)
      if (deck.queue.shown?.cue.kind === 'crash' && deck.queue.shown.cue.riders !== null) break
    }
    // admitido a los crashNamesDelayS de pared; sale cuando acaba el primero (cueHoldS de su clase)
    expect(names).toHaveLength(1)
    expect(names[0]!).toBeCloseTo(BROADCAST.crashNamesDelayS, 1)
    expect(deck.queue.shown?.cue).toMatchObject({ kind: 'crash', riders: [1, 2] })
  })

  it('si la hora va hacia atrás (un salto, 10a), no sale nada de lo que ya pasó', () => {
    const line = lineWith([event('attack_sticks', 200, [0])])
    const at = (t: number) => instantAt(line, t, ictx)
    let deck = cueDeckStep(cueDeckInit(ictx.start), at(300), DT, true, deckCtx(line)).deck
    const back = cueDeckStep(deck, at(100), DT, true, deckCtx(line))
    expect(back.admitted).toEqual([])
    deck = back.deck
    // desde ahí, lo que se revela otra vez sí sale
    expect(cueDeckStep(deck, at(250), DT, true, deckCtx(line)).admitted).toHaveLength(1)
  })
})

// ------------------------------------------------------------------- la red al reproducir (8-d)

describe('la red al reproducir (8-d): las cinco etapas enteras sin un solo 409, y el reloj esperando un tramo solo si el colchón no llega', () => {
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

  // 10a: Highlights a ×1 y ×4, y Next action encendido de la salida al último km (8-o), la hora muerta
  // más rápida que hay: la carrera a ×60·20 en Watch y a ×300·20 en Highlights
  it.each(
    NAMES.flatMap((n) => [
      [n, 'highlights', 1, 'sin'] as const,
      [n, 'highlights', 4, 'sin'] as const,
      [n, 'watch', 1, 'con'] as const,
      [n, 'highlights', 1, 'con'] as const,
    ]),
  )(
    '%s en %s a ×%i, %s Next action (10a)',
    (name, view, x, withNext) => {
      const nextAction = withNext === 'con'
      const r = played(name, { events: false, speed: x as Speed, view, nextAction })
      const finishS = HEAD_TRACKS[name].finishDs / 10
      const mode = REPORT_MODE[view]
      expect(r.finalPhase).toBe('closing')
      expect(r.conflicts).toBe(0)
      expect(r.offline || r.paused).toBe(false)
      expect(r.finishes).toEqual([{ mode, reportBefore: expect.any(Number) as number }])
      expect(r.finishes[0]!.reportBefore!).toBeLessThan(finishS)
      expect(r.reports.every((rep) => rep.reachedS < finishS && rep.mode === mode)).toBe(true)
      expect(r.requests).toBe(r.chunkEffects.length)
      // el reloj espera un tramo solo si el colchón (lo servido por delante al pedir, chunkRaceS / 2) se
      // gasta antes de la respuesta (dos peticiones de 150 ms: el informe y el tramo, 8-d)
      const fastest = (view === 'watch' ? BROADCAST.pace : BROADCAST.summaryPace)[0]!.x * x
      const rate = fastest * (nextAction ? BROADCAST.nextActionSpeedup : 1)
      if (rate * 2 * LATENCY_S < BROADCAST.chunkRaceS / 2) expect(r.waitingForChunk).toBe(0)
      console.info(
        `[broadcast] 8-d · ${name} en ${view} a ×${x}${nextAction ? ' con Next action' : ''}: ${r.waitingForChunk} fotogramas esperando un tramo, ${r.requests} tramos, ${(r.playWallS / 60).toFixed(1)} min`,
      )
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

// ----------------------------------------------- los saltos, los modos y el digest (§8.12; 10a)

/** La línea grabada de una congelada, como la lee la API (`decodeTimeline`). */
function recorded(name: string): StageTimeline {
  return decodeTimeline(
    JSON.parse(
      gunzipSync(
        readFileSync(
          new URL(
            `../../../../api/src/__fixtures__/broadcast/${name}.timeline.gz`,
            import.meta.url,
          ),
        ),
      ).toString('utf8'),
    ),
  )
}

/** Una etapa del simulador: la línea grabada, su borde de meta, el contexto de la web y su tipo (el digest). */
interface SimStage {
  readonly tl: StageTimeline
  readonly finishDs: number
  readonly ictx: InstantContext
  readonly kind: StageKind
  readonly cuts: Map<number, TimelineCore>
}

function simStage(name: string, kind: StageKind): SimStage {
  const tl = recorded(name)
  return {
    tl,
    finishDs: visibilityOf(tl).finishDs,
    ictx: {
      own: new Set(),
      start: startStateOf(tl.cast, tl.riderIds.length),
      photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
    },
    kind,
    cuts: new Map(),
  }
}

/**
 * EL HOOK Y EL SERVIDOR DE MENTIRA, SOBRE LAS LÍNEAS GRABADAS (10a): como `playStage`, a 60 fotogramas por
 * segundo con el instante a `overlayHz` y las peticiones en orden a 150 ms cada una, más lo que el 10a
 * le pide al hook: aterrizar un salto (la primera hora de lo servido en que la cabeza pintada llega al km
 * destino, por bisección, y los rótulos de clase ≥ 2 saltados de `recapOf`), contar los cuadros de la
 * previa (uno en el digest), de la llegada y del resumen, la revelación y lo que el digest suelta. Las
 * etapas van por día, y el digest encadena la siguiente con `digestNext`.
 */
class Sim {
  s: PlayerState
  wall = 0
  /** las peticiones según salen del reductor, con la etapa que las pidió y la hora de pared */
  readonly log: { readonly e: PlayerEffect; readonly day: number; readonly wall: number }[] = []
  /** las acciones del hook y de la red, con lo que pidieron */
  readonly actions: { readonly a: PlayerAction; readonly wall: number }[] = []
  private readonly queue: { e: PlayerEffect; day: number }[] = []
  private current: { e: PlayerEffect; day: number; doneAt: number } | null = null
  private netFreeAt = 0
  private readonly known = new Map<number, number>()
  private phaseSince = 0
  private lastPhase: PlayerPhase
  private lastDay: number
  instant: Instant

  constructor(
    private readonly stages: ReadonlyMap<number, SimStage>,
    view: ViewMode,
    first: number,
    private readonly digestLast: number | null = null,
    /**
     * el salto en el servidor (8-t; 10b): `written`, el de una sesión (informa la hora de destino);
     * `unwritten`, el del visitante o el modo diagnóstico (no la informa); `fails`, la ruta falla
     */
    private readonly seekRoute: 'written' | 'unwritten' | 'fails' = 'written',
  ) {
    const init = playerInit(view, first, null, false)
    this.s = init.next
    this.lastPhase = this.s.phase
    this.lastDay = first
    this.push(init.effects)
    this.instant = instantAt(this.served(), 0, this.stage().ictx)
  }

  stage(day = this.s.stageDay): SimStage {
    return this.stages.get(day)!
  }

  /** la línea servida de una etapa hasta `servedS` (sin la marca de meta, que ningún tramo lleva) */
  served(day = this.s.stageDay, servedS = this.s.servedS): TimelineCore {
    const st = this.stage(day)
    const ds = Math.min(toDs(servedS), st.finishDs - 1)
    let cut = st.cuts.get(ds)
    if (cut === undefined) st.cuts.set(ds, (cut = cutTimeline(st.tl, fromDs(ds))))
    return cut
  }

  ctx(): PlayerContext {
    const st = this.stage()
    return {
      baseX: (view, _t, toGoKm) =>
        paceAt(
          toGoKm,
          view === 'watch'
            ? BROADCAST.pace
            : view === 'highlights'
              ? BROADCAST.summaryPace
              : digestPace(st.tl.profile, st.kind),
        ),
      lengthKm: st.tl.lengthKm,
      digestNext:
        this.s.view === 'digest' && this.digestLast !== null && this.s.stageDay < this.digestLast
          ? this.s.stageDay + 1
          : null,
    }
  }

  private push(effects: readonly PlayerEffect[]): void {
    for (const e of effects) {
      this.log.push({ e, day: this.s.stageDay, wall: this.wall })
      // lo que se suelta no es red: el hook lo hace en el acto (18-e)
      if (e.k !== 'release') this.queue.push({ e, day: this.s.stageDay })
    }
  }

  dispatch(a: PlayerAction): void {
    const r = playerStep(this.s, a, this.ctx())
    this.s = r.next
    this.actions.push({ a, wall: this.wall })
    this.push(r.effects)
  }

  /** la respuesta del servidor (§10.11): lo informado por etapa, el recorte al borde y el 409 */
  private respond(x: { e: PlayerEffect; day: number }): void {
    const { e, day } = x
    switch (e.k) {
      case 'report':
        this.known.set(day, Math.max(this.known.get(day) ?? 0, e.reachedS))
        return
      case 'reveal':
        return
      case 'chunk': {
        const st = this.stage(day)
        const clamped = Math.min(toDs(e.toS), st.finishDs)
        if (clamped > ((this.known.get(day) ?? 0) + BROADCAST.prefetchRaceS) * 10) {
          this.dispatch({ k: 'beyond' })
          return
        }
        const toS = fromDs(clamped)
        this.dispatch({
          k: 'chunk',
          toS,
          atFinish: clamped >= st.finishDs - 1,
          headKmAtEnd: instantAt(this.served(day, toS), toS, st.ictx).headKm,
        })
        return
      }
      case 'finish':
        this.dispatch({ k: 'finished' })
        return
      case 'release':
        return
      case 'seek': {
        // la ruta del salto (routes/broadcast.ts): la hora de destino por bisección sobre la línea entera,
        // nunca más allá de lengthKm − 1, y lo servido hasta el primer borde de tramo que la pasa
        if (this.seekRoute === 'fails') {
          this.dispatch({ k: 'seekFallback' })
          return
        }
        const st = this.stage(day)
        const km = Math.min(e.km, st.tl.lengthKm - 1)
        let lo = 0
        let hi = st.finishDs - 1
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (instantAt(st.tl, fromDs(mid), st.ictx).headKm >= km) hi = mid
          else lo = mid + 1
        }
        const from = toDs(e.fromS)
        const steps = lo > from ? Math.ceil((lo - from) / CHUNK_DS) : 0
        const to = Math.max(from, Math.min(from + steps * CHUNK_DS, st.finishDs))
        const written = this.seekRoute === 'written'
        if (written) this.known.set(day, Math.max(this.known.get(day) ?? 0, fromDs(lo)))
        const toS = fromDs(to)
        this.dispatch({
          k: 'seekServed',
          toS,
          atFinish: to >= st.finishDs - 1,
          headKmAtEnd: instantAt(this.served(day, toS), toS, st.ictx).headKm,
          reachedS: fromDs(lo),
          written,
        })
        return
      }
    }
  }

  /** el aterrizaje del hook: la primera décima de lo servido en que la cabeza pintada llega al destino */
  land(): void {
    const s = this.s
    const st = this.stage()
    const line = this.served()
    const from = instantAt(line, s.t, st.ictx)
    let lo = toDs(s.t)
    let hi = toDs(clockCapS(s))
    if (s.seekKm !== null) {
      const km = s.seekKm
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (instantAt(line, fromDs(mid), st.ictx).headKm >= km) hi = mid
        else lo = mid + 1
      }
    } else lo = Math.min(hi, toDs(s.seekS ?? s.t))
    const to = instantAt(line, fromDs(lo), st.ictx)
    const deckCtx: CueDeckContext = {
      start: st.ictx.start,
      timeTrial: st.tl.timeTrial,
      events: line.events,
      catalog: line.groups,
    }
    this.dispatch({ k: 'landed', toS: fromDs(lo), skipped: recapOf(from, to, deckCtx).count })
  }

  /** un fotograma de pared: la red, los cuadros, el aterrizaje y el fotograma del reductor */
  frame(onFrame?: (sim: Sim) => void): void {
    this.wall += DT
    const wall = this.wall
    for (;;) {
      if (this.current === null) {
        const x = this.queue.shift()
        if (x === undefined) break
        this.current = { ...x, doneAt: Math.max(this.netFreeAt, wall - DT) + LATENCY_S }
      }
      if (this.current.doneAt > wall) break
      const x = this.current
      this.current = null
      this.netFreeAt = x.doneAt
      this.respond(x)
    }
    if (this.s.phase !== this.lastPhase || this.s.stageDay !== this.lastDay) {
      this.lastPhase = this.s.phase
      this.lastDay = this.s.stageDay
      this.phaseSince = wall
    }
    const held = wall - this.phaseSince
    const previewS = (this.s.view === 'digest' ? 1 : 4) * BROADCAST.previewCardS
    if (this.s.phase === 'preview' && held >= previewS) this.dispatch({ k: 'cardDone' })
    else if (this.s.phase === 'arrival' && held >= BROADCAST.finishFreezeS)
      this.dispatch({ k: 'cardDone' })
    else if (this.s.phase === 'recap' && held >= BROADCAST.cueHoldS[3])
      this.dispatch({ k: 'cardDone' })
    if (this.s.phase === 'seeking' && !this.s.inFlight && this.current === null) this.land()
    if (Math.round(wall / DT) % FRAMES_PER_INSTANT === 0)
      this.instant = instantAt(this.served(), this.s.t, this.stage().ictx)
    onFrame?.(this)
    this.dispatch({
      k: 'frame',
      dtS: DT,
      toGoKm: this.instant.toGoKm,
      atLine: headAtLine(this.instant, this.stage().tl),
    })
  }

  /** fotogramas hasta que se cumpla `until`, o hasta `maxWallS` de pared (el test falla si no llega) */
  run(until: (sim: Sim) => boolean, maxWallS: number, onFrame?: (sim: Sim) => void): void {
    const end = this.wall + maxWallS
    while (!until(this)) {
      if (this.wall > end) throw new Error(`no llega: ${JSON.stringify(this.s)}`)
      this.frame(onFrame)
    }
  }

  /** el km pintado de la cabeza, ahora, sobre la línea servida */
  headKm(): number {
    return instantAt(this.served(), this.s.t, this.stage().ictx).headKm
  }
}

describe('los saltos de recorrido (§8.5, §8.12; 8-j, 8-t)', () => {
  const e7 = simStage('race-france-e7', 'llana')

  /** La e7 en Watch a ×4 hasta que la cabeza pasa del km 30, y el salto pedido. */
  function jumpFrom30(
    jump: RoadJump,
    route: 'written' | 'unwritten' | 'fails' = 'written',
  ): { sim: Sim; fromLog: number; target: number } {
    const sim = new Sim(new Map([[7, e7]]), 'watch', 7, null, route)
    sim.dispatch({ k: 'speed', x: 4 })
    sim.run((x) => x.s.phase === 'playing' && x.headKm() >= 30, 600)
    const target = seekTargetKm(jump, sim.headKm(), e7.tl.lengthKm, e7.tl.profile)
    expect(target).not.toBeNull()
    const fromLog = sim.log.length
    const headKmAtEnd = instantAt(sim.served(), sim.s.servedS, e7.ictx).headKm
    sim.dispatch({ k: 'seek', km: target!, headKmAtEnd })
    sim.run((x) => x.s.phase !== 'seeking', 120)
    return { sim, fromLog, target: target! }
  }

  /**
   * RE-SELLADO en el 10b (los arreglos; 8-t): el salto de recorrido va primero por el servidor (el `it` de
   * abajo), y este, tramo a tramo, es ahora el camino de respaldo, el de cuando esa ruta falla. Lo que
   * comprueba no cambia: los informes con `mode: 'seek'` y los tramos de 900 s, cada tramo tras su informe.
   */
  it('si la ruta del salto falla, Final 20 km desde el km 30 de la e7 sigue tramo a tramo: sus informes con mode seek y sus tramos de 900 s, cada tramo tras su informe, y aterriza en el km 155', () => {
    const { sim, fromLog, target } = jumpFrom30('final20', 'fails')
    expect(sim.log.slice(fromLog).filter((x) => x.e.k === 'seek')).toHaveLength(1)
    expect(target).toBeCloseTo(e7.tl.lengthKm - BROADCAST.seekFinalKm, 6)
    const seek = sim.log.slice(fromLog).filter((x) => x.e.k === 'report' || x.e.k === 'chunk')
    // el salto pide tramos hasta que lo servido llega al destino: informe, tramo, informe, tramo…
    const kinds = seek.map((x) => x.e.k)
    expect(kinds.length).toBeGreaterThan(6)
    const seekPart = kinds.slice(0, kinds.lastIndexOf('chunk') + 1)
    for (let i = 0; i < seekPart.length; i += 2) {
      expect(seekPart[i], `${i}`).toBe('report')
      expect(seekPart[i + 1], `${i}`).toBe('chunk')
    }
    for (const x of seek.slice(0, seekPart.length)) {
      if (x.e.k === 'report') expect(x.e.mode).toBe('seek')
      if (x.e.k === 'chunk') expect(x.e.toS - x.e.fromS).toBe(BROADCAST.chunkRaceS)
    }
    // aterriza en el km 155 (la primera décima en que la cabeza pintada llega), sin pedir la meta
    expect(sim.headKm()).toBeGreaterThanOrEqual(target - 1e-9)
    expect(sim.headKm()).toBeLessThan(target + 0.1)
    expect(sim.log.slice(fromLog).some((x) => x.e.k === 'finish')).toBe(false)
    expect(sim.s.reachedS).toBeCloseTo(sim.s.t, 6)
  })

  it('Final 20 km por el servidor (8-t, 10b): una sola petición desde lo servido, ni un informe ni un tramo hasta aterrizar, en el km 155, con lo informado en el destino', () => {
    const { sim, fromLog, target } = jumpFrom30('final20')
    const during = sim.log.slice(fromLog)
    const seek = during.filter((x) => x.e.k === 'seek')
    expect(seek).toHaveLength(1)
    expect(seek[0]!.e).toMatchObject({ k: 'seek', km: target })
    // ninguna otra petición hasta aterrizar: la que sale después es la carrera que sigue
    const landedAt = sim.actions.findIndex((x) => x.a.k === 'landed')
    const landedWall = sim.actions[landedAt]!.wall
    expect(
      during.filter((x) => x.wall < landedWall && (x.e.k === 'report' || x.e.k === 'chunk')),
    ).toEqual([])
    expect(sim.headKm()).toBeGreaterThanOrEqual(target - 1e-9)
    expect(sim.headKm()).toBeLessThan(target + 0.1)
    // el servidor informó el destino: el aterrizaje no lo repite, y lo alcanzado es la hora pintada
    expect(during.filter((x) => x.e.k === 'report' && x.wall <= landedWall)).toEqual([])
    expect(sim.s.reportedS).toBeCloseTo(sim.s.t, 6)
    expect(sim.s.reachedS).toBeCloseTo(sim.s.t, 6)
    // y es una ida y vuelta: el salto dura la latencia de una petición, no la de doce tramos y sus informes
    expect(landedWall - seek[0]!.wall).toBeLessThan(0.5)
  })

  it('sin sesión o en el modo diagnóstico el servidor no informa el destino: lo informa la web, con mode seek, al llegar la respuesta', () => {
    const { sim, fromLog, target } = jumpFrom30('final20', 'unwritten')
    const during = sim.log.slice(fromLog)
    const reports = during.filter((x) => x.e.k === 'report')
    expect(reports.length).toBeGreaterThan(0)
    expect(reports[0]!.e).toMatchObject({ k: 'report', mode: 'seek' })
    expect(sim.headKm()).toBeGreaterThanOrEqual(target - 1e-9)
    expect(sim.s.reportedS).toBeCloseTo(sim.s.t, 6)
  })

  it('Last km aterriza en el 174 y no pide la meta; ningún informe del salto llega a la meta', () => {
    const { sim, fromLog, target } = jumpFrom30('lastKm')
    expect(target).toBeCloseTo(e7.tl.lengthKm - 1, 6)
    expect(sim.headKm()).toBeGreaterThanOrEqual(target - 1e-9)
    expect(sim.headKm()).toBeLessThan(target + 0.1)
    const after = sim.log.slice(fromLog)
    expect(after.some((x) => x.e.k === 'finish')).toBe(false)
    for (const x of after)
      if (x.e.k === 'report') expect(x.e.reachedS).toBeLessThan(e7.finishDs / 10)
    // y de ahí, el último km a su ritmo: Next action no se enciende (8-o)
    sim.run((x) => x.s.phase === 'playing', 30)
    sim.frame()
    sim.dispatch({ k: 'nextAction' })
    expect(sim.s.nextAction).toBe(false)
  })

  it('seekTargetKm: Next climb sin puertos por delante no lleva a ningún sitio, ni Final 20 km pasados', () => {
    const profile = e7.tl.profile
    const lastClimb = profile.climbs.at(-1)
    const past = lastClimb === undefined ? 0 : lastClimb.footKm + 0.5
    expect(seekTargetKm('nextClimb', past, e7.tl.lengthKm, profile)).toBeNull()
    expect(seekTargetKm('nextClimb', 10, 100, { climbs: [] })).toBeNull()
    expect(seekTargetKm('final20', 160, 175, profile)).toBeNull()
    expect(seekTargetKm('lastKm', 174.5, 175, profile)).toBeNull()
    expect(seekTargetKm('fwd5', 172, 175, profile)).toBe(174)
    expect(seekTargetKm('back5', 3, 175, profile)).toBe(0)
    expect(seekTargetKm('back5', 0, 175, profile)).toBeNull()
  })

  it('ttSeekTargetS: los saltos de reloj de la crono (9-g), las salidas públicas y nunca hacia ninguna parte', () => {
    const plan = { riders: 120, intervalS: 60 }
    expect(ttSeekTargetS('fwd10', 1000, plan)).toBe(1000 + BROADCAST.ttSeekStepS)
    expect(ttSeekTargetS('back10', 300, plan)).toBe(0)
    expect(ttSeekTargetS('back10', 0, plan)).toBeNull()
    expect(ttSeekTargetS('last20', 0, plan)).toBe((120 - BROADCAST.ttSeekLastStarters) * 60)
    expect(ttSeekTargetS('lastStarter', 0, plan)).toBe(119 * 60)
    expect(ttSeekTargetS('lastStarter', 119 * 60, plan)).toBeNull()
  })
})

describe('el resumen para el reloj (§8.11, 8-n) y Previously (8-l)', () => {
  const e18 = simStage('race-france-e18', 'reina')

  it('Next climb: sin rótulos saltados sigue la carrera; con ellos, While you skipped con el reloj quieto; el primer fotograma de playing está a climbCardLeadKm del pie, y la ficha del puerto entra en la cola', () => {
    const sim = new Sim(new Map([[18, e18]]), 'watch', 18)
    sim.run((x) => x.s.phase === 'playing', 30)
    /** Next climb desde donde esté la cabeza: el puerto al que lleva */
    const jump = (): (typeof e18.tl.profile.climbs)[number] => {
      const target = seekTargetKm('nextClimb', sim.headKm(), e18.tl.lengthKm, e18.tl.profile)!
      const climb = e18.tl.profile.climbs.find(
        (c) => c.footKm - BROADCAST.climbCardLeadKm === target,
      )!
      expect(climb).toBeDefined()
      sim.dispatch({
        k: 'seek',
        km: target,
        headKmAtEnd: instantAt(sim.served(), sim.s.servedS, e18.ictx).headKm,
      })
      sim.run((x) => x.s.phase !== 'seeking', 60)
      return climb
    }
    // el primero (el km 37): de la salida al km 34 no pasa nada de clase ≥ 2, y no hay resumen
    const first = jump()
    expect(first.footKm).toBe(37)
    expect(sim.s.phase).toBe('playing')
    // el segundo (el km 82,5): con lo saltado, el resumen con el reloj quieto; después, la carrera
    // desde el aterrizaje
    const climb = jump()
    expect(climb.footKm).toBe(82.5)
    expect(sim.s.phase).toBe('recap')
    const landedT = sim.s.t
    let recapFrames = 0
    sim.run(
      (x) => x.s.phase === 'playing',
      10,
      (x) => {
        if (x.s.phase !== 'recap') return
        recapFrames += 1
        expect(x.s.t).toBe(landedT)
      },
    )
    expect(recapFrames).toBeGreaterThan(60 * BROADCAST.cueHoldS[3] - 2)
    // el primer fotograma de playing: un fotograma de reloj desde el aterrizaje (×60 lejos de meta)
    expect(sim.s.t - landedT).toBeLessThanOrEqual(DT * 60 + 1e-9)
    expect(sim.headKm()).toBeGreaterThanOrEqual(climb.footKm - BROADCAST.climbCardLeadKm - 1e-9)
    expect(sim.headKm()).toBeLessThan(climb.footKm - BROADCAST.climbCardLeadKm + 0.1)
    // la cola, asentada en el aterrizaje, saca la ficha del puerto que viene
    const instant = instantAt(sim.served(), sim.s.t, e18.ictx)
    const seated = cueDeckSeat(
      cueDeckInit(e18.ictx.start),
      instant,
      {
        start: e18.ictx.start,
        timeTrial: false,
        events: sim.served().events,
        catalog: sim.served().groups,
        profile: e18.tl.profile,
      },
      null,
    )
    expect(seated.admitted.map((a) => a.kind)).toContain('climb_ahead')
    expect(seated.deck.queue.shown?.cue.kind).toBe('climb_ahead')
  })

  it('Previously: los recapMaxCues últimos rótulos de clase ≥ 2 antes de lo alcanzado, en orden de carrera, y la fuga que sigue delante', () => {
    const line = e18.tl
    const reached = 9000
    const recap = recapOf(instantAt(line, 0, e18.ictx), instantAt(line, reached, e18.ictx), {
      start: e18.ictx.start,
      timeTrial: false,
      events: line.events,
      catalog: line.groups,
    })
    expect(recap.count).toBeGreaterThan(BROADCAST.recapMaxCues)
    expect(recap.cues).toHaveLength(BROADCAST.recapMaxCues)
    for (let i = 1; i < recap.cues.length; i++)
      expect(recap.cues[i]!.t).toBeGreaterThanOrEqual(recap.cues[i - 1]!.t)
    for (const c of recap.cues) expect(c.t).toBeLessThanOrEqual(reached)
    // al reanudar, el reloj vuelve resumeBackS antes de lo alcanzado, quieto bajo el resumen
    const init = playerInit('watch', 18, reached, false)
    expect(init.next.phase).toBe('recap')
    expect(init.next.t).toBeCloseTo(reached - BROADCAST.resumeBackS, 6)
  })
})

describe('la letra de cada modo, Show result y el digest (§8.1, §8.5, §8.8; 8-c, 18-e)', () => {
  const e7 = simStage('race-france-e7', 'llana')
  const e18 = simStage('race-france-e18', 'reina')
  const e20 = simStage('race-france-e20', 'reina')

  it('la meta lleva play en Watch, summary en Highlights y digest en el digest, y el informe del borde, justo antes, no llega a la meta', () => {
    for (const view of ['watch', 'highlights', 'digest'] as const) {
      const sim = new Sim(new Map([[7, e7]]), view, 7)
      if (view === 'watch') sim.dispatch({ k: 'speed', x: 4 })
      sim.run((x) => x.s.phase === 'closing', 600)
      const fi = sim.log.findIndex((x) => x.e.k === 'finish')
      const fin = sim.log[fi]!.e
      const border = sim.log[fi - 1]!.e
      expect(fin).toEqual({ k: 'finish', mode: REPORT_MODE[view] })
      expect(border.k).toBe('report')
      if (border.k === 'report') expect(border.reachedS).toBeLessThan(e7.finishDs / 10)
      expect(sim.log.filter((x) => x.e.k === 'finish')).toHaveLength(1)
    }
  })

  it('un digest de tres etapas: tres metas con mode digest en orden, el cuadro 1 de la siguiente entre ellas, y al empezar la tercera se suelta la primera; nunca más de dos cargadas', () => {
    const sim = new Sim(
      new Map([
        [7, e7],
        [8, e18],
        [9, e20],
      ]),
      'digest',
      7,
      9,
    )
    const phases: string[] = []
    let maxLoaded = 0
    sim.run(
      (x) => x.s.phase === 'closing',
      1200,
      (x) => {
        maxLoaded = Math.max(maxLoaded, x.s.loaded.length)
        const tag = `${x.s.stageDay}:${x.s.phase}`
        if (phases.at(-1) !== tag) phases.push(tag)
      },
    )
    const finishes = sim.log.filter((x) => x.e.k === 'finish')
    expect(finishes.map((x) => [x.day, x.e.k === 'finish' && x.e.mode])).toEqual([
      [7, 'digest'],
      [8, 'digest'],
      [9, 'digest'],
    ])
    // entre una meta y la siguiente, la llegada y el cuadro 1 de la previa de la siguiente (8-c)
    expect(phases.filter((p) => p.endsWith(':arrival') || p.endsWith(':preview'))).toEqual([
      '7:preview',
      '7:arrival',
      '8:preview',
      '8:arrival',
      '9:preview',
      '9:arrival',
    ])
    // 18-e: al empezar la tercera se suelta la primera, y solo ella
    const releases = sim.log.filter((x) => x.e.k === 'release')
    expect(releases.map((x) => x.e.k === 'release' && x.e.stageDay)).toEqual([7])
    expect(releases[0]!.day).toBe(9)
    expect(maxLoaded).toBe(2)
    expect(sim.s.loaded).toEqual([8, 9])
    // ×1 y sin Next action en todo el digest (§8.1)
    expect(sim.s.speed).toBe(1)
  })

  it('Show result: la revelación y después la meta, con el reloj quieto; la llegada y el cierre; en el digest, sin encadenar', () => {
    for (const view of ['watch', 'digest'] as const) {
      const sim = new Sim(
        new Map([
          [7, e7],
          [8, e18],
        ]),
        view,
        7,
        view === 'digest' ? 8 : null,
      )
      sim.run((x) => x.s.phase === 'playing' && x.s.t > 1500, 300)
      const t = sim.s.t
      const from = sim.log.length
      sim.dispatch({ k: 'showResult' })
      expect(sim.log.slice(from).map((x) => x.e.k)).toEqual(['reveal', 'finish'])
      expect(sim.s).toMatchObject({ phase: 'waiting', revealed: true })
      sim.run((x) => x.s.phase === 'closing', 30)
      expect(sim.s.t).toBe(t)
      expect(sim.s.stageDay).toBe(7)
      expect(sim.log.slice(from).filter((x) => x.e.k === 'chunk')).toHaveLength(0)
    }
  })
})

// ----------------------------------------------- las comprobaciones de §8.11, al azar (§8.12)

const KINDS: readonly CueKind[] = ['attack', 'break_formed', 'rider', 'crash', 'last_km', 'caught']
const VIEWS: readonly ViewMode[] = ['watch', 'highlights', 'digest']

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
  /** 10a: saltos con su tramo, aterrizajes (y con resumen), vueltas atrás, `Show result` que llegan a la meta */
  seekChunks: number
  /** 10b: saltos por el servidor, con su respuesta y con su respaldo tramo a tramo */
  seekServed: number
  seekFallbacks: number
  landings: number
  recaps: number
  backs: number
  reveals: number
  /** 10a: el digest, sus etapas encadenadas y lo que se suelta (18-e) */
  chains: number
  releases: number
  lastKmOff: number
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
  seekChunks: 0,
  seekServed: 0,
  seekFallbacks: 0,
  landings: 0,
  recaps: 0,
  backs: 0,
  reveals: 0,
  chains: 0,
  releases: 0,
  lastKmOff: 0,
})

/** Una etapa sintética de una secuencia: la cabeza a velocidad constante hasta su borde. */
interface SynthStage {
  readonly finishDs: number
  readonly finishS: number
  readonly lengthKm: number
  readonly lineKm: number
  /** con un sprint que acelera, la cabeza extrapolada no llega a su último bloque antes del borde */
  readonly shortKm: number
}

/**
 * UNA SECUENCIA AL AZAR de 300 pasos por etapa sobre etapas sintéticas (la cabeza a velocidad constante): los
 * mandos (con los saltos, volver atrás y `Show result` desde el 10a), los fotogramas (a veces de varios
 * segundos, a veces con una cabeza en la línea que no lo está), las respuestas del servidor a lo que se
 * pidió (un tramo o su 409, un 429, un fallo, la meta, la revelación), el aterrizaje de un salto como lo
 * hace el hook (la hora en que la cabeza llega al km destino, en lo servido) y respuestas que nadie
 * pidió. En una de cada cinco, el digest de una a cuatro etapas. Tras cada paso, las diez comprobaciones
 * de §8.11. `restarts`: el servidor pierde a veces lo informado, y entonces el 409 salta y se resuelve.
 */
function randomSequence(seed: string, restarts: boolean, cov: Coverage): void {
  const rng = seededRng(seed)
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!
  const view: ViewMode = rng() < 0.2 ? 'digest' : rng() < 0.3 ? 'highlights' : 'watch'
  const count = view === 'digest' ? 1 + Math.floor(rng() * 4) : 1
  const stages: SynthStage[] = Array.from({ length: count }, () => {
    const finishDs = 10 * (1200 + Math.floor(rng() * 4800))
    const lengthKm = Math.round((20 + rng() * 180) * 10) / 10
    return {
      finishDs,
      finishS: finishDs / 10,
      lengthKm,
      lineKm: (Math.round(lengthKm / DX) - 0.5) * DX,
      shortKm: rng() < 0.3 ? 0.3 : 0,
    }
  })
  const stageOf = (day: number): SynthStage => stages[day - 1]!
  const headKm = (day: number, t: RaceS): number => {
    const st = stageOf(day)
    return Math.min(st.lineKm, (t / st.finishS) * (st.lengthKm - st.shortKm))
  }
  /** la primera hora en que la cabeza llega a un km: la bisección del hook, aquí exacta */
  const timeAtKm = (day: number, km: number): RaceS => {
    const st = stageOf(day)
    return (km / (st.lengthKm - st.shortKm)) * st.finishS
  }
  const ctxFor = (day: number): PlayerContext => ({
    ...ctxOf(stageOf(day).lengthKm),
    digestNext: view === 'digest' && day < count ? day + 1 : null,
  })
  const resumeAt =
    view !== 'digest' && rng() < 0.2 ? Math.floor(rng() * stageOf(1).finishS * 0.8) : null
  const init = playerInit(view, 1, resumeAt, false)
  if (init.next.phase === 'recap') cov.resumed += 1
  let s = init.next
  /** las peticiones en cola, con la etapa que las pidió */
  const queue: { e: PlayerEffect; day: number }[] = init.effects.map((e) => ({ e, day: 1 }))
  const server = new Map<number, number>([[1, resumeAt ?? 0]])
  let conflicts = 0
  let finished = false
  const pending = (): boolean =>
    queue.some(
      (x) => x.e.k === 'chunk' || x.e.k === 'finish' || x.e.k === 'reveal' || x.e.k === 'seek',
    )
  /** la ruta del salto (10b): la primera décima en que la cabeza llega al km, nunca más allá del borde */
  const destDsOf = (day: number, km: number): number => {
    const st = stageOf(day)
    let lo = 0
    let hi = st.finishDs - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (headKm(day, fromDs(mid)) >= Math.min(km, st.lengthKm - 1)) hi = mid
      else lo = mid + 1
    }
    return lo
  }
  const hist: string[] = []

  for (let i = 0; i < 300 * count; i++) {
    // los informes salen en cuanto les toca, y el servidor los guarda en su memoria; lo que se suelta, también
    while (queue[0]?.e.k === 'report' || queue[0]?.e.k === 'release') {
      const x = queue.shift()!
      if (x.e.k === 'report') server.set(x.day, Math.max(server.get(x.day) ?? 0, x.e.reachedS))
    }
    const head = queue[0]
    const ctx = ctxFor(s.stageDay)
    let a: PlayerAction
    let unsolicited = false
    const roll = rng()
    if (s.phase === 'seeking' && !s.inFlight && rng() < 0.7) {
      // el hook aterriza: la hora en que la cabeza llega al destino, en lo servido y antes del borde
      const target =
        s.seekKm !== null ? timeAtKm(s.stageDay, s.seekKm) : (s.seekS ?? Number.POSITIVE_INFINITY)
      a = {
        k: 'landed',
        toS: Math.min(target, clockCapS(s)),
        skipped: rng() < 0.5 ? 0 : 1 + Math.floor(rng() * 8),
      }
    } else if (roll < 0.25 && head !== undefined) {
      // la respuesta a lo que se pidió
      const r = rng()
      if (head.e.k === 'seek') {
        // el salto en el servidor (8-t, 10b): su respuesta o, si falla (sea lo que sea), el respaldo
        queue.shift()
        if (r < 0.4) a = { k: 'seekFallback' }
        else {
          const st = stageOf(head.day)
          const dest = destDsOf(head.day, head.e.km)
          const from = toDs(head.e.fromS)
          const steps = dest > from ? Math.ceil((dest - from) / CHUNK_DS) : 0
          const to = Math.max(from, Math.min(from + steps * CHUNK_DS, st.finishDs))
          const written = rng() < 0.7
          if (written) server.set(head.day, Math.max(server.get(head.day) ?? 0, fromDs(dest)))
          a = {
            k: 'seekServed',
            toS: fromDs(to),
            atFinish: to >= st.finishDs - 1,
            headKmAtEnd: headKm(head.day, fromDs(to)),
            reachedS: fromDs(dest),
            written,
          }
        }
      } else if (r < 0.1) {
        queue.shift()
        a = { k: 'failed' }
        // como effects.ts: tras un fallo no sale nada más de lo pedido (la meta detrás de una revelación,
        // o la revelación y la meta detrás de un tramo que ya no se espera); `Retry` lo pide otra vez
        queue.splice(0, queue.length, ...queue.filter((x) => x.e.k === 'report'))
      } else if (r < 0.2 && head.e.k !== 'reveal')
        a = { k: 'throttled', retryAfterS: 1 + Math.floor(rng() * 60) }
      else if (head.e.k === 'chunk') {
        queue.shift()
        const st = stageOf(head.day)
        let known = server.get(head.day) ?? 0
        if (restarts && rng() < 0.15)
          server.set(head.day, (known = Math.max(0, known - 60 - rng() * 900)))
        const clamped = Math.min(toDs(head.e.toS), st.finishDs)
        if (clamped > (known + BROADCAST.prefetchRaceS) * 10) {
          conflicts += 1
          a = { k: 'beyond' }
        } else
          a = {
            k: 'chunk',
            toS: fromDs(clamped),
            atFinish: clamped >= st.finishDs - 1,
            headKmAtEnd: headKm(head.day, fromDs(clamped)),
          }
      } else if (head.e.k === 'reveal') {
        queue.shift()
        continue // la revelación responde sin decirle nada al reductor; la meta va detrás
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
        { k: 'seekFallback' },
        {
          k: 'seekServed',
          toS: s.servedS + rng() * 5000,
          atFinish: false,
          headKmAtEnd: 0,
          reachedS: s.t + 50,
          written: rng() < 0.5,
        },
        ...(s.phase === 'seeking' ? [] : [{ k: 'landed', toS: s.t + 100, skipped: 2 } as const]),
      ])
    } else if (roll < 0.65) {
      const dtS = rng() < 0.6 ? DT : rng() * 3
      const st = stageOf(s.stageDay)
      a = {
        k: 'frame',
        dtS,
        toGoKm: st.lengthKm - headKm(s.stageDay, s.t),
        atLine: headKm(s.stageDay, s.t) >= st.lineKm - 1e-9 || rng() < 0.02,
      }
    } else {
      const st = stageOf(s.stageDay)
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
        {
          k: 'seek',
          km: headKm(s.stageDay, s.t) + rng() * st.lengthKm,
          headKmAtEnd: headKm(s.stageDay, s.servedS),
        },
        { k: 'seekTime', toS: s.t + rng() * 2000 },
        { k: 'back', toS: rng() * s.t },
        // revelar acaba la etapa: poco, para que las secuencias lleguen también a la línea y encadenen
        rng() < (view === 'digest' ? 0.01 : 0.1) ? { k: 'showResult' } : { k: 'touch' },
      ])
    }

    const s0 = s
    const r = playerStep(s0, a, ctx)
    const s1 = r.next
    s = s1
    hist.push(`${a.k}:${s0.phase}->${s1.phase}:${r.effects.map((e) => e.k).join('+')}`)
    for (const e of r.effects) queue.push({ e, day: s1.stageDay })
    if (a.k === 'finished' && s1.phase === 'arrival') finished = true
    if (r.effects.some((e) => e.k === 'finish')) {
      cov.finishes += 1
      if (a.k === 'frame' && !a.atLine) cov.byEdge += 1
    }
    if (s1.phase === 'arrival' && s0.phase !== 'arrival') {
      cov.arrivals += 1
      if (s1.revealed) cov.reveals += 1
    }
    if (s1.phase === 'closing' && s0.phase !== 'closing') cov.closings += 1
    if (a.k === 'beyond' && r.effects.map((e) => e.k).join() === 'report,chunk') cov.conflicts += 1
    if (a.k === 'throttled' && s0.phase === 'waiting') cov.throttledWaiting += 1
    if (s1.notice === 'offline' && s0.notice !== 'offline') cov.offline += 1
    if (a.k === 'retry' && s0.notice === 'offline') cov.retried += 1
    if (a.k === 'cueAdmitted' && a.round && s0.nextAction) cov.roundsKept += 1
    if (s1.phase === 'seeking' && r.effects.some((e) => e.k === 'chunk')) cov.seekChunks += 1
    if (a.k === 'seekServed' && !unsolicited) cov.seekServed += 1
    if (a.k === 'seekFallback' && !unsolicited) cov.seekFallbacks += 1
    if (a.k === 'landed' && s0.phase === 'seeking' && s1.phase !== 'seeking') {
      cov.landings += 1
      if (s1.phase === 'recap') cov.recaps += 1
    }
    if (a.k === 'back' && s1.t < s0.t) cov.backs += 1
    if (s1.stageDay !== s0.stageDay) cov.chains += 1
    cov.releases += r.effects.filter((e) => e.k === 'release').length
    if (a.k === 'frame' && s0.nextAction && !s1.nextAction && s1.lastKm) cov.lastKmOff += 1

    const fail = (msg: string): never => {
      throw new Error(
        `${seed}, paso ${i}: ${msg}\n${JSON.stringify({ a, s0, s1, effects: r.effects, queue, hist: hist.slice(-12) })}`,
      )
    }
    const st0 = stageOf(s0.stageDay)
    const chained = s1.stageDay !== s0.stageDay
    if (unsolicited && (r.effects.length > 0 || JSON.stringify(s1) !== JSON.stringify(s0)))
      fail('una respuesta que nadie pidió cambia el estado')
    // 1. lo alcanzado no baja (en una etapa), y t ≤ servedS. Con una salvedad: al volver a una etapa a
    //    medias, `Previously` se enseña en la hora a la que se vuelve mientras llegan los tramos desde 0;
    //    ahí t pasa de lo servido, pero el reloj no corre (ni en playing está) hasta tener carrera servida.
    if (!chained && s1.reachedS < s0.reachedS) fail('lo alcanzado baja')
    if (s1.t > s1.servedS && !(resumeAt !== null && s1.t === init.next.t))
      fail('t pasa de lo servido')
    if (s1.t > s1.servedS && s1.phase === 'playing') fail('playing sin carrera servida')
    // t solo baja al volver atrás, o al encadenar la etapa siguiente del digest
    if (s1.t < s0.t && a.k !== 'back' && !chained) fail('t baja')
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
    // 3. t solo avanza en playing, con un fotograma, o al aterrizar un salto
    if (
      s1.t > s0.t &&
      !(a.k === 'frame' && s0.phase === 'playing') &&
      !(a.k === 'landed' && s0.phase === 'seeking')
    )
      fail('t avanza fuera de playing')
    // 4. un salto aterriza como mucho en la hora en que la cabeza pasa por lengthKm − 1; ningún salto
    //    pide la meta, y ningún informe con mode 'seek' lleva la hora de la meta
    if (a.k === 'landed' && s0.phase === 'seeking') {
      if (s1.t > s0.t && s1.t > timeAtKm(s0.stageDay, st0.lengthKm - 1) + 0.1 && s0.seekKm !== null)
        fail('un salto aterriza pasado el último km')
      if (s1.t >= st0.finishS) fail('un salto aterriza en la meta')
    }
    if (
      (a.k === 'seek' || a.k === 'seekTime' || a.k === 'landed') &&
      r.effects.some((e) => e.k === 'finish')
    )
      fail('un salto pide la meta')
    for (const e of r.effects)
      if (e.k === 'report' && e.mode === 'seek' && e.reachedS >= st0.finishS)
        fail('un informe de salto en la meta')
    if (s1.seekKm !== null && s1.seekKm > st0.lengthKm - 1 + 1e-9)
      fail('destino pasado el último km')
    // 5 y 6. la meta solo con el último tramo y la cabeza en la línea (o el reloj en el borde), con el
    //    modo de la curva, y tras el informe del borde, que no es la meta; o tras revelar (§8.5)
    const fi = r.effects.findIndex((e) => e.k === 'finish')
    if (fi >= 0) {
      const fin = r.effects[fi]!
      const rep = r.effects[fi - 1]
      const revealed = r.effects[fi - 1]?.k === 'reveal'
      if (revealed) {
        if (!(a.k === 'showResult' || ((a.k === 'retry' || a.k === 'play') && s0.revealed)))
          fail('revelar sin Show result')
      } else {
        if (a.k !== 'frame' || !s0.atFinish || !(a.atLine || s0.t >= clockCapS(s0)))
          fail('meta sin la línea')
        if (rep?.k !== 'report' || rep.reachedS > clockCapS(s0) || rep.reachedS >= st0.finishS)
          fail('sin el informe del borde, o un informe en la meta')
      }
      if (fin.k === 'finish' && fin.mode !== REPORT_MODE[s0.view]) fail('meta con otro modo')
    }
    for (const e of r.effects)
      if (e.k === 'report' && e.reachedS >= st0.finishS) fail('informe en la meta')
    if ((s1.phase === 'arrival' || s1.phase === 'closing') && !finished) fail('llegada sin la meta')
    // 7. en el digest, ×1 y sin Next action; en Watch y Highlights, desde la llegada y el cierre no se
    //    pide nada (ni otra etapa); en el digest, solo al encadenar la siguiente
    if (s1.view === 'digest' && (s1.speed !== 1 || s1.nextAction)) fail('el digest acelera')
    if ((s0.phase === 'arrival' || s0.phase === 'closing') && r.effects.length > 0) {
      if (!(chained && view === 'digest')) fail('peticiones tras la meta')
    }
    if (view !== 'digest' && (s1.stageDay !== 1 || s1.loaded.length !== 1 || s1.loaded[0] !== 1))
      fail('otra etapa')
    // 8. en el digest, al empezar la etapa k + 1 sale release de la k − 1, y nunca hay más de dos
    if (s1.loaded.length > 2 || !s1.loaded.includes(s1.stageDay)) fail('más de dos etapas cargadas')
    for (const e of r.effects) {
      if (e.k !== 'release') continue
      if (!chained) fail('soltar sin encadenar')
      if (e.stageDay === s1.stageDay || e.stageDay === s0.stageDay) fail('suelta la que se ve')
      if (!s0.loaded.includes(e.stageDay) || s1.loaded.includes(e.stageDay))
        fail('suelta una que no tenía')
    }
    if (chained) {
      if (view !== 'digest' || s1.stageDay !== s0.stageDay + 1) fail('encadena fuera del digest')
      if (s1.phase !== 'preview' || s0.phase !== 'arrival') fail('encadena sin la llegada')
      if (s0.loaded.length === 2 && !r.effects.some((e) => e.k === 'release'))
        fail('encadena sin soltar la de antes')
      finished = false
      if (!server.has(s1.stageDay)) server.set(s1.stageDay, 0)
    }
    // 9. la ronda de la moto no apaga Next action; un 429 no pausa ni da Connection lost
    if (a.k === 'cueAdmitted' && a.round && s1.nextAction !== s0.nextAction)
      fail('la ronda apaga Next action')
    if (s1.lastKm && s1.nextAction) fail('Next action en el último km')
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
  it('las diez, con los saltos, Show result y el digest (10a); sin reinicios del servidor, ni un 409', () => {
    const cov = emptyCoverage()
    for (let n = 0; n < 1000; n++) randomSequence(`reproductor:${n}`, n % 4 === 3, cov)
    console.info(`[broadcast] las secuencias al azar: ${JSON.stringify(cov)}`)
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
    // 10a: los saltos con su red, sus aterrizajes y sus resúmenes, la vuelta atrás, revelar y el digest
    expect(cov.seekChunks).toBeGreaterThan(100)
    // 10b: el salto por el servidor, con su respuesta y con su respaldo
    expect(cov.seekServed).toBeGreaterThan(100)
    expect(cov.seekFallbacks).toBeGreaterThan(50)
    expect(cov.landings).toBeGreaterThan(100)
    expect(cov.recaps).toBeGreaterThan(30)
    expect(cov.backs).toBeGreaterThan(100)
    expect(cov.reveals).toBeGreaterThan(30)
    expect(cov.chains).toBeGreaterThan(5)
    expect(cov.releases).toBeGreaterThan(0)
  })
})

// ------------------------------------------------------------------ la crono, la e16 (§9.5; 6b)

describe('la cola de la crono sobre la e16 congelada (§9.5, §9.8; 9-d)', () => {
  const tl = recorded('race-france-e16')
  const tt = tl.tt!
  const n = tl.riderIds.length
  const cast = riderCardsOf(tl.cast, { rider: (id) => id, team: (id) => id }, new Set(), 'elite')
  const start = startStateOf(tl.cast, n)
  const ictx: InstantContext = {
    own: new Set(),
    start,
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
  const head = { order: tt.order, intervalS: tt.intervalS, checksKm: [...tt.checksKm] }
  const deckCtx: CueDeckContext = {
    start,
    timeTrial: true,
    events: tl.events,
    catalog: tl.groups,
    cast,
    profile: tl.profile,
    own: ictx.own,
    view: 'watch',
    speed: 1,
    tt: head,
  }
  const cand = ttCandidatesOf(cast, [], start, head)
  const finishS = fromDs(visibilityOf(tl).finishDs)
  const plan = { riders: n, intervalS: tt.intervalS }
  const lastKm = ttLastKmFromS(tl)

  // A 60 fotogramas por segundo de pared, el instante a overlayHz y la cola en cada fotograma.
  const dt = 1 / 60
  let deck: CueDeck = cueDeckInit(start)
  let t = 0
  let wall = 0
  let lastOverlay = Number.NEGATIVE_INFINITY
  let road = instantAt(tl, 0, ictx)
  let tti = timeTrialInstantAt(tl, 0, ictx)
  const emitted: Cue[] = []
  /** la clase con que salió a pantalla cada uno (la mayor de dos, si sustituyó a otro, 9-d) */
  const shown = new Map<Cue, number>()
  const seen = new Set<Cue>()
  let maxWaiting = 0
  while (t < finishS) {
    if (wall - lastOverlay >= 1 / BROADCAST.overlayHz - 1e-9) {
      road = instantAt(tl, t, ictx)
      tti = timeTrialInstantAt(tl, t, ictx)
      lastOverlay = wall
    }
    deck = cueDeckStep(deck, road, dt, true, deckCtx, tti).deck
    for (const x of [...deck.queue.waiting.map((w) => w.cue), deck.queue.shown?.cue]) {
      if (x === undefined || seen.has(x)) continue
      seen.add(x)
      emitted.push(x)
    }
    if (deck.queue.shown !== null) shown.set(deck.queue.shown.cue, deck.queue.shown.cls)
    maxWaiting = Math.max(
      maxWaiting,
      deck.queue.waiting.filter((w) => w.cls < 3 && !(w.cue.kind === 'rider')).length,
    )
    t = Math.min(finishS, t + ttPaceAt(t, plan, lastKm) * dt)
    wall += dt
  }
  const of = <K extends Cue['kind']>(k: K) =>
    emitted.filter((c): c is Extract<Cue, { kind: K }> => c.kind === k)

  it('la regla de salida al empezar, un tt_split por cada paso de un candidato o mejor parcial, y su clase', () => {
    expect(of('tt_start_order')).toHaveLength(1)
    // lo esperado, de la traza: por control, cada paso a su hora, de un candidato o que bate el mejor
    let expected = 0
    tt.checksKm.forEach((_, c) => {
      const passes = tt.checkClockDs
        .map((row, r) => ({ r, at: tt.startDs[r]! + row[c]!, timeS: row[c]! / 10 }))
        .filter((p) => p.at < visibilityOf(tl).finishDs)
        .sort((a, b) => a.at - b.at || a.r - b.r)
      let best = Number.POSITIVE_INFINITY
      for (const p of passes) {
        if (cand.has(p.r) || p.timeS < best) expected++
        best = Math.min(best, p.timeS)
      }
    })
    // los admitidos más los que sustituyó el siguiente del mismo control (9-d): todos salieron de la cola
    expect(of('tt_split').length).toBe(expected)
    for (const c of of('tt_split'))
      expect(c.rank === 1 || cand.has(c.rider), `${c.rider} rank ${c.rank}`).toBe(true)
  })

  it('un tt_finish por cada llegada de un candidato y por cada cambio del sillón', () => {
    const arrivals = tt.kmClockDs
      .map((row, r) => ({ r, at: tt.startDs[r]! + row.at(-1)!, timeS: row.at(-1)! / 10 }))
      .filter((a) => a.at < visibilityOf(tl).finishDs)
      .sort((a, b) => a.at - b.at || a.r - b.r)
    let best = Number.POSITIVE_INFINITY
    let expected = 0
    let seats = 0
    for (const a of arrivals) {
      const seat = a.timeS < best
      if (cand.has(a.r) || seat) expected++
      if (seat) seats++
      best = Math.min(best, a.timeS)
    }
    expect(of('tt_finish')).toHaveLength(expected)
    expect(of('tt_finish').filter((c) => c.hotSeat)).toHaveLength(seats)
  })

  it('la general virtual al paso del líder por cada control; ninguna se pierde, ni un rótulo de clase 3', () => {
    // el líder de salida sale el último y su llegada es el borde de la meta: sus dos controles
    expect(of('virtual_gc')).toHaveLength(tt.checksKm.length)
    for (const c of of('virtual_gc')) expect(shown.has(c), 'virtual_gc').toBe(true)
    // un rótulo de clase 3 sale, o lo sustituye el siguiente de su clase, que sale con su clase 3 (9-d)
    const three = emitted.filter((c) => cueClassOf(c, start, null, true) === 3)
    expect(three.length).toBeGreaterThan(0)
    for (const c of three) {
      if (shown.has(c)) continue
      const later = emitted.slice(emitted.indexOf(c) + 1)
      expect(
        later.some((x) => x.kind === c.kind && shown.get(x) === 3),
        `${c.kind} a las ${c.t}`,
      ).toBe(true)
    }
    expect(maxWaiting).toBeLessThanOrEqual(BROADCAST.cueQueueMax)
  })

  it('la ronda ON COURSE y los percances; la duración es la de ttPaceAt (§9.4)', () => {
    expect(of('rider').filter((c) => c.context === 'tt_round').length).toBeGreaterThan(50)
    // los percances, de clase 1: entran si caben (con la cola llena de la hora de los ×120, no)
    const mishaps = new Set(tt.mishaps.map((m) => m.rider))
    expect(of('mishap').every((c) => mishaps.has(c.rider))).toBe(true)
    expect(of('mishap').length).toBeGreaterThan(0)
    expect(wall).toBeGreaterThan(300)
    expect(wall).toBeLessThan(780)
    console.info(
      `[broadcast] la crono e16 a ×1: ${wall.toFixed(0)} s de pared; ${emitted.length} rótulos ` +
        `generados, ${shown.size} en pantalla; ${of('tt_split').length} SPLIT, ` +
        `${of('tt_finish').length} FINISH, ${of('virtual_gc').length} VIRTUAL GC, ` +
        `${of('mishap').length} de ${tt.mishaps.length} percances; cola máxima ${maxWaiting}`,
    )
  })
})
