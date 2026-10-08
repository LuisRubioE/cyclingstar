import type { BroadcastChunk, BroadcastFinish, Ds, WatchMode } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/request'
import { type WatchPorts, type WatchSink, effectRunner } from './effects'
import type { PlayerAction, PlayerEffect } from './player'

/**
 * LAS PETICIONES DEL REPRODUCTOR, EN ORDEN (docs/retransmision.md §8.11, §14.11 y 14-q; notas 2 y 3
 * del 3b): el hook de `StageWatch.tsx` ejecuta los efectos de `playerStep` uno tras otro, cada uno
 * tras la respuesta del anterior, porque el servidor autoriza un tramo con lo último informado
 * (§10.11). Un error se traduce con `failureAction`: un 429 espera su `retry-after` de pared y repite
 * la misma petición; un 409 `beyond_reached` y un fallo se sueltan, y el reductor pide lo que haga
 * falta. Desde el 7a los informes (`report`) salen: en la cola, en su orden, y un fallo suyo no para
 * la imagen; el de salir (`beacon`), en el acto, sin esperar a nadie (§14.11, 14-g). Desde el 10a, la
 * revelación de `Show result` va en la cola delante de su meta, y tras un fallo no sale nada más de lo
 * pedido salvo los informes; soltar una etapa del digest (18-e) no es red.
 */

/** Una promesa que el test resuelve o rechaza cuando quiere. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const chunkTo = (toDs: Ds, atFinish = false): BroadcastChunk => ({
  fromDs: 0,
  toDs,
  groupsBorn: [],
  groupsDied: [],
  moves: [],
  main: [],
  clocks: [],
  mishaps: [],
  details: [],
  events: [],
  lines: [],
  banners: [],
  tt: null,
  atFinish,
})
const FINISH = { arrivals: [] } as unknown as BroadcastFinish

/** Un servidor de mentira que apunta cada petición y responde cuando el test lo dice. */
function rig() {
  const calls: string[] = []
  const pending: { readonly what: string; readonly d: ReturnType<typeof deferred<unknown>> }[] = []
  const sleeps: number[] = []
  const beacons: string[] = []
  const released: number[] = []
  const actions: PlayerAction[] = []
  const chunks: BroadcastChunk[] = []
  const finishes: BroadcastFinish[] = []
  const ports: WatchPorts = {
    chunk: (fromDs, toDs) => {
      const what = `chunk ${fromDs}-${toDs}`
      calls.push(what)
      const d = deferred<unknown>()
      pending.push({ what, d })
      return d.promise as Promise<BroadcastChunk>
    },
    finish: (mode: WatchMode) => {
      const what = `finish ${mode}`
      calls.push(what)
      const d = deferred<unknown>()
      pending.push({ what, d })
      return d.promise as Promise<BroadcastFinish>
    },
    sleep: async (s) => {
      sleeps.push(s)
    },
    report: (reachedS, mode) => {
      const what = `report ${reachedS} ${mode}`
      calls.push(what)
      const d = deferred<unknown>()
      pending.push({ what, d })
      return d.promise
    },
    beacon: (reachedS, mode) => {
      beacons.push(`beacon ${reachedS} ${mode}`)
    },
    reveal: () => {
      calls.push('reveal')
      const d = deferred<unknown>()
      pending.push({ what: 'reveal', d })
      return d.promise
    },
    release: (stageDay) => {
      released.push(stageDay)
    },
  }
  let push: (effects: readonly PlayerEffect[]) => void = () => {}
  const sink: WatchSink = {
    chunk: (c) => {
      chunks.push(c)
      return { k: 'chunk', toS: c.toDs / 10, atFinish: c.atFinish, headKmAtEnd: 0 }
    },
    finish: (f) => {
      finishes.push(f)
    },
    dispatch: (a) => {
      actions.push(a)
      // el reductor de mentira: tras el primer tramo pide otro (como hace fetchMore)
      if (a.k === 'chunk' && a.toS === 90) push([{ k: 'chunk', fromS: 90, toS: 180 }])
    },
  }
  const runner = effectRunner(ports, sink)
  push = runner.push
  /** Deja correr las promesas pendientes. */
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  }
  /** Responde la petición en vuelo (la única que puede haber). */
  const answer = async (value: unknown) => {
    expect(pending).toHaveLength(1)
    pending.shift()!.d.resolve(value)
    await flush()
  }
  const fail = async (error: unknown) => {
    expect(pending).toHaveLength(1)
    pending.shift()!.d.reject(error)
    await flush()
  }
  return {
    runner,
    calls,
    pending,
    sleeps,
    beacons,
    released,
    actions,
    chunks,
    finishes,
    flush,
    answer,
    fail,
  }
}

describe('effectRunner · las peticiones del reproductor, en orden (§8.11)', () => {
  it('cada petición sale tras la respuesta de la anterior, y su respuesta es una acción', async () => {
    const r = rig()
    r.runner.push([
      { k: 'chunk', fromS: 0, toS: 30 },
      { k: 'chunk', fromS: 30, toS: 60 },
    ])
    await r.flush()
    expect(r.calls).toEqual(['chunk 0-300'])
    await r.answer(chunkTo(300))
    expect(r.calls).toEqual(['chunk 0-300', 'chunk 300-600'])
    await r.answer(chunkTo(600))
    expect(r.actions.map((a) => (a.k === 'chunk' ? a.toS : a.k))).toEqual([30, 60])
    expect(r.chunks.map((c) => c.toDs)).toEqual([300, 600])
  })

  it('lo que el reductor pide al recibir una respuesta va detrás, en la misma cola', async () => {
    const r = rig()
    r.runner.push([{ k: 'chunk', fromS: 0, toS: 90 }])
    await r.flush()
    await r.answer(chunkTo(900))
    expect(r.calls).toEqual(['chunk 0-900', 'chunk 900-1800'])
  })

  /**
   * RE-SELLADO en E2, paso 7a: hasta aquí los informes se saltaban («no se mandan hasta el 7a»). Ya
   * existe `POST /api/me/watch`, y salen en la cola, en su orden: el tramo que sigue a un informe no
   * sale hasta que el informe responde, porque el servidor autoriza el tramo con lo último informado
   * (§10.11). El de salir no hace cola (el siguiente `it`).
   */
  it('los informes salen en la cola, en su orden: lo que les sigue espera su respuesta (7a)', async () => {
    const r = rig()
    r.runner.push([
      { k: 'report', reachedS: 12.3, mode: 'play', beacon: false },
      { k: 'chunk', fromS: 0, toS: 30 },
      { k: 'report', reachedS: 25, mode: 'summary', beacon: false },
      { k: 'finish', mode: 'play' },
    ])
    await r.flush()
    expect(r.calls).toEqual(['report 12.3 play'])
    await r.answer({ status: 'watching', rev: '1.0' })
    expect(r.calls).toEqual(['report 12.3 play', 'chunk 0-300'])
    await r.answer(chunkTo(300, true))
    await r.answer({ status: 'watching', rev: '1.0' })
    expect(r.calls).toEqual(['report 12.3 play', 'chunk 0-300', 'report 25 summary', 'finish play'])
    // la respuesta de un informe no es una acción: el reductor ya contó lo informado al pedirlo
    expect(r.actions.map((a) => a.k)).toEqual(['chunk'])
    expect(r.beacons).toEqual([])
  })

  it('el informe de salir (beacon) sale en el acto: no espera al tramo en vuelo, y la cola parada después no lo pierde', async () => {
    const r = rig()
    r.runner.push([{ k: 'chunk', fromS: 0, toS: 30 }])
    await r.flush()
    r.runner.push([{ k: 'report', reachedS: 25, mode: 'play', beacon: true }])
    r.runner.stop() // como el desmontaje de StageWatch: `leave` y en seguida `stop`
    expect(r.beacons).toEqual(['beacon 25 play'])
    expect(r.calls).toEqual(['chunk 0-300'])
  })

  it('la meta: POST con su modo; la pantalla recibe el paquete y el reductor, finished', async () => {
    const r = rig()
    r.runner.push([{ k: 'finish', mode: 'summary' }])
    await r.flush()
    expect(r.calls).toEqual(['finish summary'])
    await r.answer(FINISH)
    expect(r.finishes).toEqual([FINISH])
    expect(r.actions).toEqual([{ k: 'finished' }])
  })
})

describe('effectRunner · los errores, con failureAction (§14.11, 14-q)', () => {
  it('un 429: throttled con su retry-after, espera eso de pared y repite la misma petición', async () => {
    const r = rig()
    r.runner.push([{ k: 'chunk', fromS: 0, toS: 30 }])
    await r.flush()
    await r.fail(new ApiError('demasiadas_peticiones', 429, 'demasiadas_peticiones', 20))
    expect(r.actions).toEqual([{ k: 'throttled', retryAfterS: 20 }])
    expect(r.sleeps).toEqual([20])
    expect(r.calls).toEqual(['chunk 0-300', 'chunk 0-300'])
    await r.answer(chunkTo(300))
    expect(r.actions.map((a) => a.k)).toEqual(['throttled', 'chunk'])
  })

  it('un 429 en la meta también espera y repite', async () => {
    const r = rig()
    r.runner.push([{ k: 'finish', mode: 'play' }])
    await r.flush()
    await r.fail(new ApiError('demasiadas_peticiones', 429, 'demasiadas_peticiones', null))
    expect(r.sleeps).toHaveLength(1)
    expect(r.calls).toEqual(['finish play', 'finish play'])
    await r.answer(FINISH)
    expect(r.actions.map((a) => a.k)).toEqual(['throttled', 'finished'])
  })

  it('un 409 beyond_reached es beyond y un fallo es failed: se sueltan, sin repetir', async () => {
    const r = rig()
    r.runner.push([
      { k: 'chunk', fromS: 0, toS: 30 },
      { k: 'chunk', fromS: 30, toS: 60 },
    ])
    await r.flush()
    await r.fail(new ApiError('beyond_reached', 409, 'beyond_reached'))
    await r.fail(new ApiError('Network error', 0, 'network'))
    expect(r.actions).toEqual([{ k: 'beyond' }, { k: 'failed' }])
    expect(r.calls).toEqual(['chunk 0-300', 'chunk 300-600'])
    expect(r.sleeps).toEqual([])
  })
})

describe('effectRunner · los errores de un informe (7a)', () => {
  it('un informe que falla no para la imagen: no llega al reductor y lo que le sigue sale', async () => {
    const r = rig()
    r.runner.push([
      { k: 'report', reachedS: 12.3, mode: 'play', beacon: false },
      { k: 'chunk', fromS: 0, toS: 30 },
    ])
    await r.flush()
    await r.fail(new ApiError('Network error', 0, 'network'))
    expect(r.actions).toEqual([])
    expect(r.calls).toEqual(['report 12.3 play', 'chunk 0-300'])
    await r.fail(new ApiError('Network error', 0, 'network'))
    expect(r.actions).toEqual([{ k: 'failed' }]) // la red caída la dice el tramo, que es lo que la imagen espera
  })

  it('un 429 en un informe espera su retry-after de pared y repite el mismo informe, sin decírselo al reductor', async () => {
    const r = rig()
    r.runner.push([
      { k: 'report', reachedS: 12.3, mode: 'play', beacon: false },
      { k: 'chunk', fromS: 0, toS: 30 },
    ])
    await r.flush()
    await r.fail(new ApiError('demasiadas_peticiones', 429, 'demasiadas_peticiones', 7))
    expect(r.sleeps).toEqual([7])
    expect(r.calls).toEqual(['report 12.3 play', 'report 12.3 play'])
    await r.answer({ status: 'watching', rev: '1.0' })
    expect(r.calls).toEqual(['report 12.3 play', 'report 12.3 play', 'chunk 0-300'])
    expect(r.actions).toEqual([])
  })

  it('un beacon que lanza no rompe la cola', async () => {
    const r = rig()
    const runner = effectRunner(
      {
        chunk: async () => chunkTo(300),
        finish: async () => FINISH,
        sleep: async () => {},
        report: async () => ({}),
        beacon: () => {
          throw new TypeError('sendBeacon')
        },
      },
      { chunk: () => ({ k: 'touch' }), finish: () => {}, dispatch: (a) => r.actions.push(a) },
    )
    expect(() =>
      runner.push([
        { k: 'report', reachedS: 1, mode: 'play', beacon: true },
        { k: 'chunk', fromS: 0, toS: 30 },
      ]),
    ).not.toThrow()
    await r.flush()
    expect(r.actions).toEqual([{ k: 'touch' }])
  })
})

describe('effectRunner · Show result y el digest (10a)', () => {
  it('la revelación va delante de su meta: la meta sale cuando la revelación responde, y su respuesta no es una acción', async () => {
    const r = rig()
    r.runner.push([{ k: 'reveal' }, { k: 'finish', mode: 'summary' }])
    await r.flush()
    expect(r.calls).toEqual(['reveal'])
    await r.answer({ ok: true })
    expect(r.calls).toEqual(['reveal', 'finish summary'])
    expect(r.actions).toEqual([])
    await r.answer(FINISH)
    expect(r.actions).toEqual([{ k: 'finished' }])
  })

  it('una revelación que falla es failed, y la meta de detrás no sale (escribiría la letra de verla); un informe de detrás, sí', async () => {
    const r = rig()
    r.runner.push([
      { k: 'reveal' },
      { k: 'finish', mode: 'play' },
      { k: 'report', reachedS: 30, mode: 'play', beacon: false },
    ])
    await r.flush()
    await r.fail(new ApiError('Network error', 0, 'network'))
    expect(r.actions).toEqual([{ k: 'failed' }])
    expect(r.calls).toEqual(['reveal', 'report 30 play'])
    await r.answer({ status: 'watching', rev: '1.0' })
    expect(r.pending).toHaveLength(0)
  })

  it('un 429 en la revelación espera su retry-after y repite la misma', async () => {
    const r = rig()
    r.runner.push([{ k: 'reveal' }, { k: 'finish', mode: 'play' }])
    await r.flush()
    await r.fail(new ApiError('demasiadas_peticiones', 429, 'demasiadas_peticiones', 3))
    expect(r.sleeps).toEqual([3])
    expect(r.calls).toEqual(['reveal', 'reveal'])
    await r.answer({ ok: true })
    expect(r.calls).toEqual(['reveal', 'reveal', 'finish play'])
  })

  it('tras un tramo que falla, lo que iba detrás no sale: Retry lo vuelve a pedir', async () => {
    const r = rig()
    r.runner.push([
      { k: 'chunk', fromS: 0, toS: 30 },
      { k: 'reveal' },
      { k: 'finish', mode: 'play' },
    ])
    await r.flush()
    await r.fail(new ApiError('Network error', 0, 'network'))
    expect(r.actions).toEqual([{ k: 'failed' }])
    expect(r.calls).toEqual(['chunk 0-300'])
  })

  it('soltar una etapa del digest (18-e) no es red: sale en su turno, sin esperar respuesta', async () => {
    const r = rig()
    r.runner.push([
      { k: 'release', stageDay: 7 },
      { k: 'chunk', fromS: 0, toS: 30 },
    ])
    await r.flush()
    expect(r.released).toEqual([7])
    expect(r.calls).toEqual(['chunk 0-300'])
  })
})

describe('effectRunner · al salir', () => {
  it('parado, lo que responde después no llega ni a la pantalla ni al reductor, y no sale nada más', async () => {
    const r = rig()
    r.runner.push([
      { k: 'chunk', fromS: 0, toS: 30 },
      { k: 'chunk', fromS: 30, toS: 60 },
    ])
    await r.flush()
    r.runner.stop()
    await r.answer(chunkTo(300))
    expect(r.actions).toEqual([])
    expect(r.chunks).toEqual([])
    expect(r.calls).toEqual(['chunk 0-300'])
    r.runner.push([{ k: 'finish', mode: 'play' }])
    await r.flush()
    expect(r.calls).toEqual(['chunk 0-300'])
  })
})
