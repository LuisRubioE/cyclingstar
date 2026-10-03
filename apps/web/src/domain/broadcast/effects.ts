/**
 * LAS PETICIONES DEL REPRODUCTOR, EN ORDEN (E2, docs/retransmision.md §8.11, §10.11, §14.11 y 14-q;
 * notas 2 y 3 del 3b). Sin React y sin temporizadores propios: la red y la espera entran por `ports`.
 *
 * `playerStep` devuelve las peticiones que hay que hacer y el hook de `StageWatch.tsx` las ejecuta
 * aquí, una tras otra, cada una tras la respuesta de la anterior: un tramo que sigue a un informe no
 * sale hasta que el informe ha respondido, porque el servidor autoriza el tramo con lo último informado
 * (§10.11). La respuesta de cada una vuelve al reductor como una acción, y lo que el reductor pida al
 * recibirla se encola detrás.
 *
 * Un error se traduce con `failureAction` (`player.ts`): con `throttled` (un 429) se espera su
 * `retry-after` de pared y se repite la MISMA petición, que sigue en vuelo para el reductor; con
 * `beyond` (un 409 `beyond_reached`) y con `failed`, la petición se suelta, porque el reductor pide lo
 * que haga falta (informar y pedir otra vez, o `Connection lost · Retry`).
 *
 * Nace en el 3c. Hasta el 7a no existe `POST /api/me/watch`: los efectos `report` se saltan sin romper
 * el orden de los demás, y el servidor no da 409 hasta el 7b (B18). `reveal` y `release` son del 10a.
 */
import {
  type BroadcastChunk,
  type BroadcastFinish,
  type Ds,
  type WatchMode,
  toDs,
} from '@cyclingstar/shared'
import { type PlayerAction, type PlayerEffect, failureAction } from './player'

/** Lo que la cola sabe hacer fuera: la red (`api/broadcast.ts`) y esperar segundos de pared. */
export interface WatchPorts {
  /** GET …/broadcast/chunk, (fromDs, toDs]; el que empieza en 0, [0, toDs] (3c) */
  readonly chunk: (fromDs: Ds, toDs: Ds) => Promise<BroadcastChunk>
  /** POST …/broadcast/finish con { mode } */
  readonly finish: (mode: WatchMode) => Promise<BroadcastFinish>
  /** espera `s` segundos de pared: el `retry-after` de un 429 */
  readonly sleep: (s: number) => Promise<void>
}

/** A quién le llega cada respuesta: la pantalla (la línea y la meta) y el reductor (las acciones). */
export interface WatchSink {
  /** un tramo: la pantalla lo junta a su línea y da la acción `chunk` con el km de la cabeza en su borde */
  readonly chunk: (chunk: BroadcastChunk) => PlayerAction
  /** el paquete de meta; después, el reductor recibe `finished` */
  readonly finish: (finish: BroadcastFinish) => void
  /** una acción para el reductor */
  readonly dispatch: (a: PlayerAction) => void
}

export interface EffectRunner {
  /** encola las peticiones de un paso del reductor, en su orden */
  readonly push: (effects: readonly PlayerEffect[]) => void
  /** al salir: nada más sale, y lo que responda después no llega a nadie */
  readonly stop: () => void
}

/** LA COLA: una petición a la vez, en el orden en que el reductor las pidió. */
export function effectRunner(ports: WatchPorts, sink: WatchSink): EffectRunner {
  const queue: PlayerEffect[] = []
  let running = false
  let stopped = false

  /** Una petición hasta que responde o se suelta: un 429 espera y repite la misma. */
  async function attempt<T>(send: () => Promise<T>, done: (value: T) => void): Promise<void> {
    for (;;) {
      try {
        const value = await send()
        if (!stopped) done(value)
        return
      } catch (error) {
        if (stopped) return
        const a = failureAction(error)
        sink.dispatch(a)
        if (a.k !== 'throttled') return
        await ports.sleep(a.retryAfterS)
        if (stopped) return
      }
    }
  }

  async function run(): Promise<void> {
    running = true
    try {
      while (!stopped && queue.length > 0) {
        const e = queue.shift()!
        switch (e.k) {
          case 'chunk':
            await attempt(
              () => ports.chunk(toDs(e.fromS), toDs(e.toS)),
              (chunk) => sink.dispatch(sink.chunk(chunk)),
            )
            break
          case 'finish':
            await attempt(
              () => ports.finish(e.mode),
              (finish) => {
                sink.finish(finish)
                sink.dispatch({ k: 'finished' })
              },
            )
            break
          case 'report': // POST /api/me/watch llega en el 7a
          case 'reveal': // POST /api/me/reveal llega en el 10a, con Show result
          case 'release': // el digest, en el 10a
            break
        }
      }
    } finally {
      running = false
    }
  }

  return {
    push(effects) {
      if (stopped || effects.length === 0) return
      queue.push(...effects)
      if (!running) void run()
    },
    stop() {
      stopped = true
      queue.length = 0
    },
  }
}
