import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  B1C_WHITELIST,
  type SpoilerWorld,
  normalize,
  routeOf,
  serverErrors,
  startSpoilerWorld,
  strip,
  sweep,
} from './__fixtures__/spoilerWorld.js'

/**
 * B1c · DOS DESENLACES, LOS MISMOS BYTES (docs/retransmision.md §16.3; I-30, D-54; E2, paso 7a). Suite
 * rápida.
 *
 * Dos bases con el mismo mundo y la misma historia hasta la 2, y la 3 corrida con dos semillas cuyos
 * ganadores difieren: quien no la ha visto recibe lo mismo en todas las rutas, salvo la lista blanca de
 * B1b y el tiempo de la cabecera (que la semilla de la etapa también decide). Caza IDENTIDADES y órdenes,
 * que el canario de B1a no puede buscar porque el ganador ya sale en la lista de salida.
 */

/** Dos semillas de la etapa velada con ganadores distintos: lo comprueba el primer test; si el motor los iguala, se eligen otras. */
const SEEDS = ['b1c-uno', 'b1c-dos'] as const

describe('B1c · dos desenlaces, los mismos bytes', () => {
  const worlds: SpoilerWorld[] = []
  beforeAll(async () => {
    for (const seed of SEEDS) {
      // una base cada uno, en serie (PGlite: una sesión por base, testDb.ts)
      const w = await startSpoilerWorld('b1c-base') // la misma historia: mundo, ids y etapas 1 y 2 con la misma semilla
      await w.runVeiled(seed)
      worlds.push(w)
    }
  }, 600_000)
  afterAll(async () => {
    for (const w of worlds) await w.close()
  })

  it('los dos mundos acaban la etapa con ganadores distintos (si no, el banco no prueba nada)', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    expect(await a.winner()).not.toBe(await b.winner())
  })

  it('quien no ha visto la etapa recibe lo mismo, byte a byte, en todas las rutas', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    const [ra, rb] = [await sweep(a, 'player'), await sweep(b, 'player')]
    expect([...serverErrors(ra), ...serverErrors(rb)]).toEqual([]) // dos 500 iguales no prueban nada
    expect([...ra.keys()]).toEqual([...rb.keys()])
    const differ = [...ra.keys()].filter((k) => {
      const paths = B1C_WHITELIST.get(routeOf(k)) ?? []
      return normalize(strip(ra.get(k)!, paths)) !== normalize(strip(rb.get(k)!, paths))
    })
    expect(differ).toEqual([])
  })

  it('no es vacío: el visitante sin cuenta, que no tiene nada velado, ve dos carreras distintas en cinco rutas o más', async () => {
    const [a, b] = worlds as [SpoilerWorld, SpoilerWorld]
    const [ra, rb] = [await sweep(a, 'anon'), await sweep(b, 'anon')]
    const differ = [...ra.keys()].filter(
      (k) => normalize(strip(ra.get(k)!, [])) !== normalize(strip(rb.get(k)!, [])),
    )
    expect(new Set(differ.map(routeOf)).size).toBeGreaterThanOrEqual(5)
  })
})
