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
 * Nace en el 3c. Desde el 7a los informes (`report`) salen (`POST /api/me/watch`, o el `localStorage`
 * del visitante: lo deciden los `ports` de `StageWatch.tsx`). Van en la cola como los demás, y un fallo
 * suyo no para la imagen: no llega al reductor, que ya contó lo informado al pedirlo, y lo alcanzado
 * vuelve a subir con el informe siguiente; si la red ha caído, lo dice el tramo que le sigue, y desde el
 * 7b, si el servidor sabe menos de lo informado, el 409 de ese tramo (`beyond`), que informa otra vez.
 * Un 429 espera y repite el mismo informe. El de salir (`beacon`, en `pagehide` o al desmontar) no hace
 * cola: sale en el acto, porque la página se va y la cola se para justo después. El servidor no da 409
 * hasta el 7b (B18).
 *
 * Desde el 10b (los arreglos), un salto de recorrido es una sola petición, `seek` (`POST …/broadcast/seek`,
 * 8-t), cuya respuesta junta la pantalla (`sink.seek`); si falla, sea lo que sea, el reductor recibe
 * `seekFallback` y sigue por el camino de antes, tramo a tramo, sin esperar ni repetir nada.
 *
 * Desde el 10a, `reveal` (`POST /api/me/reveal`, `Show result`) va en la cola como un tramo, delante de
 * su meta; `release` (soltar los tramos de una etapa del digest, 18-e) tampoco espera: no es red. Y tras
 * un fallo (`failed`) no sale nada más de lo pedido: la meta que iba detrás de una revelación que falló
 * no puede salir (escribiría la letra de verla), y lo que iba detrás de un tramo que ya no se esperaba
 * (`Show result` con un tramo en vuelo) lo vuelve a pedir `Retry`.
 */
import {
  type BroadcastChunk,
  type BroadcastFinish,
  type BroadcastSeek,
  type Ds,
  type RaceS,
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
  /** el informe de lo alcanzado: `POST /api/me/watch` con `keepalive` (7a); sin sesión, el `localStorage` (11-p) */
  readonly report: (reachedS: RaceS, mode: WatchMode) => Promise<unknown>
  /** el informe de salir, sin esperar respuesta: `sendBeacon` (14-g); sin sesión, el `localStorage` */
  readonly beacon: (reachedS: RaceS, mode: WatchMode) => void
  /** `POST /api/me/reveal/:raceKey/:day` (10a, `Show result`); lanza si falla */
  readonly reveal?: () => Promise<unknown>
  /** soltar los tramos y la línea de una etapa del digest (18-e, 10a) */
  readonly release?: (stageDay: number) => void
  /** POST …/broadcast/seek (8-t; 10b): el salto de recorrido en el servidor, al km destino desde lo servido */
  readonly seek?: (km: number, fromDs: Ds) => Promise<BroadcastSeek>
}

/**
 * A quién le llega cada respuesta: la pantalla (la línea y la meta) y el reductor (las acciones). Desde
 * el 10b (los arreglos), la pantalla puede juntar un tramo en sus tareas (`withChunkSpread`) y dar la
 * acción con una promesa: el reductor la recibe cuando acaba, y lo de detrás en la cola espera a ella.
 */
export interface WatchSink {
  /** un tramo: la pantalla lo junta a su línea y da la acción `chunk` con el km de la cabeza en su borde */
  readonly chunk: (chunk: BroadcastChunk) => PlayerAction | Promise<PlayerAction>
  /** el paquete de meta; después, el reductor recibe `finished` */
  readonly finish: (finish: BroadcastFinish) => void
  /** una acción para el reductor */
  readonly dispatch: (a: PlayerAction) => void
  /** la respuesta del salto en el servidor: la pantalla junta su tramo y da la acción `seekServed` (10b) */
  readonly seek?: (res: BroadcastSeek) => PlayerAction | Promise<PlayerAction>
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

  /**
   * Una petición hasta que responde o se suelta: un 429 espera y repite la misma. Tras un fallo, lo que
   * quedaba pedido detrás (salvo los informes) no sale. Lo que se hace con la respuesta (`done`) puede
   * ser una promesa (10b): la cola sigue cuando acaba.
   */
  async function attempt<T>(
    send: () => Promise<T>,
    done: (value: T) => void | Promise<void>,
  ): Promise<void> {
    for (;;) {
      try {
        const value = await send()
        if (!stopped) await done(value)
        return
      } catch (error) {
        if (stopped) return
        const a = failureAction(error)
        if (a.k === 'failed') {
          const reports = queue.filter((e) => e.k === 'report')
          queue.length = 0
          queue.push(...reports)
        }
        sink.dispatch(a)
        if (a.k !== 'throttled') return
        await ports.sleep(a.retryAfterS)
        if (stopped) return
      }
    }
  }

  /**
   * Un informe hasta que responde o se suelta: un 429 espera y repite el mismo; cualquier otro fallo se
   * suelta sin decírselo al reductor (la cabecera de este fichero dice por qué).
   */
  async function report(reachedS: RaceS, mode: WatchMode): Promise<void> {
    for (;;) {
      try {
        await ports.report(reachedS, mode)
        return
      } catch (error) {
        if (stopped) return
        const a = failureAction(error)
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
              async (chunk) => {
                const a = await sink.chunk(chunk)
                if (!stopped) sink.dispatch(a)
              },
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
          case 'report':
            await report(e.reachedS, e.mode)
            break
          case 'reveal': {
            const reveal = ports.reveal
            if (reveal !== undefined)
              await attempt(
                () => reveal(),
                () => undefined,
              )
            break
          }
          case 'release':
            ports.release?.(e.stageDay)
            break
          case 'seek': {
            // EL SALTO EN EL SERVIDOR (8-t; 10b): una petición; si falla, sea lo que sea (la red, un 429,
            // una API sin la ruta), ni se espera ni se repite: el reductor sigue tramo a tramo
            const seek = ports.seek
            const served = sink.seek
            let action: PlayerAction = { k: 'seekFallback' }
            if (seek !== undefined && served !== undefined)
              try {
                const res = await seek(e.km, toDs(e.fromS))
                if (stopped) break
                action = await served(res)
              } catch {
                action = { k: 'seekFallback' }
              }
            if (!stopped) sink.dispatch(action)
            break
          }
        }
      }
    } finally {
      running = false
    }
  }

  return {
    push(effects) {
      if (stopped || effects.length === 0) return
      for (const e of effects) {
        if (e.k !== 'report' || !e.beacon) queue.push(e)
        else
          try {
            ports.beacon(e.reachedS, e.mode) // al salir no se espera a nadie (14-g)
          } catch {
            // un beacon que falla no rompe la cola: lo alcanzado vuelve a subir en la visita siguiente
          }
      }
      if (!running && queue.length > 0) void run()
    },
    stop() {
      stopped = true
      queue.length = 0
    },
  }
}
